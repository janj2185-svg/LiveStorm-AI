from __future__ import annotations

import pyotp
import pytest
from sqlalchemy import select

from app.models import (
    AccessSession,
    Role,
    SecurityAuditEvent,
    User,
    UserRole,
    UserStatus,
)
from tests.conftest import bearer, login, register_and_verify


async def test_totp_and_single_use_recovery_codes_are_required_at_login(api) -> None:
    await register_and_verify(api)
    initial = await login(api)
    headers = bearer(initial["access_token"])

    setup = await api.client.post("/v1/auth/totp/setup", headers=headers)
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    confirm = await api.client.post(
        "/v1/auth/totp/confirm",
        headers=headers,
        json={"code": pyotp.TOTP(secret).now()},
    )
    assert confirm.status_code == 200
    recovery_codes = confirm.json()["recovery_codes"]
    assert len(recovery_codes) == 10

    password_login = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "CorrectHorse!2026",
            "device_label": "MFA browser",
        },
    )
    assert password_login.status_code == 200
    assert password_login.json()["mfa_required"] is True
    challenge = password_login.json()["challenge_token"]
    totp_login = await api.client.post(
        "/v1/auth/totp/verify",
        json={
            "challenge_token": challenge,
            "code": pyotp.TOTP(secret).now(),
            "device_label": "Authenticator",
        },
    )
    assert totp_login.status_code == 200
    challenge_replay = await api.client.post(
        "/v1/auth/totp/verify",
        json={
            "challenge_token": challenge,
            "code": pyotp.TOTP(secret).now(),
            "device_label": "Replay attempt",
        },
    )
    assert challenge_replay.status_code == 401
    assert challenge_replay.json()["code"] == "mfa_challenge_reused"

    second_challenge = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "CorrectHorse!2026",
        },
    )
    recovery_login = await api.client.post(
        "/v1/auth/totp/verify",
        json={
            "challenge_token": second_challenge.json()["challenge_token"],
            "code": recovery_codes[0],
        },
    )
    assert recovery_login.status_code == 200

    third_challenge = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "CorrectHorse!2026",
        },
    )
    replay = await api.client.post(
        "/v1/auth/totp/verify",
        json={
            "challenge_token": third_challenge.json()["challenge_token"],
            "code": recovery_codes[0],
        },
    )
    assert replay.status_code == 401
    assert replay.json()["code"] == "invalid_mfa_code"


async def test_totp_disable_requires_password_and_code_and_revokes_sessions(api) -> None:
    await register_and_verify(api)
    initial = await login(api)
    headers = bearer(initial["access_token"])

    setup = await api.client.post("/v1/auth/totp/setup", headers=headers)
    secret = setup.json()["secret"]
    confirm = await api.client.post(
        "/v1/auth/totp/confirm",
        headers=headers,
        json={"code": pyotp.TOTP(secret).now()},
    )
    assert confirm.status_code == 200

    wrong_password = await api.client.post(
        "/v1/auth/totp/disable",
        headers=headers,
        json={"password": "WrongPassword!2026", "code": pyotp.TOTP(secret).now()},
    )
    assert wrong_password.status_code == 401

    disabled = await api.client.post(
        "/v1/auth/totp/disable",
        headers=headers,
        json={"password": "CorrectHorse!2026", "code": pyotp.TOTP(secret).now()},
    )
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "totp_disabled_sessions_revoked"

    old_access = await api.client.get("/v1/auth/me", headers=headers)
    assert old_access.status_code == 401
    password_login = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "CorrectHorse!2026",
            "device_label": "After MFA disable",
        },
    )
    assert password_login.status_code == 200
    assert password_login.json()["mfa_required"] is False
    assert password_login.json()["tokens"]["access_token"]


async def test_session_listing_and_revocation(api) -> None:
    await register_and_verify(api)
    first = await login(api, device_label="First device")
    second = await login(api, device_label="Second device")

    sessions = await api.client.get("/v1/auth/sessions", headers=bearer(first["access_token"]))
    assert sessions.status_code == 200
    by_label = {item["device_label"]: item for item in sessions.json()}
    assert by_label["First device"]["current"] is True
    second_session_id = by_label["Second device"]["id"]

    revoked = await api.client.delete(
        f"/v1/auth/sessions/{second_session_id}",
        headers=bearer(first["access_token"]),
    )
    assert revoked.status_code == 200
    denied = await api.client.get("/v1/auth/me", headers=bearer(second["access_token"]))
    assert denied.status_code == 401


async def test_rbac_denial_and_admin_allow(api) -> None:
    await register_and_verify(api)
    tokens = await login(api)
    headers = bearer(tokens["access_token"])

    denied = await api.client.get("/v1/admin/roles", headers=headers)
    assert denied.status_code == 403
    assert denied.json()["code"] == "permission_denied"

    async with api.app.state.session_factory() as session:
        user = await session.scalar(select(User).where(User.email == "member@example.com"))
        admin_role = await session.scalar(select(Role).where(Role.name == "admin"))
        session.add(
            UserRole(
                user_id=user.id,
                role_id=admin_role.id,
                granted_by=user.id,
            )
        )
        await session.commit()

    allowed = await api.client.get("/v1/admin/roles", headers=headers)
    assert allowed.status_code == 200
    assert {role["name"] for role in allowed.json()} >= {"user", "admin", "moderator"}

    permission = await api.client.post(
        "/v1/admin/permissions",
        headers=headers,
        json={"name": "reports:read", "description": "Read operational reports"},
    )
    assert permission.status_code == 201
    role = await api.client.post(
        "/v1/admin/roles",
        headers=headers,
        json={"name": "analyst", "description": "Reporting analyst"},
    )
    assert role.status_code == 201
    assignment = await api.client.put(
        f"/v1/admin/roles/{role.json()['id']}/permissions/{permission.json()['id']}",
        headers=headers,
    )
    assert assignment.status_code == 200
    roles = await api.client.get("/v1/admin/roles", headers=headers)
    analyst = next(item for item in roles.json() if item["name"] == "analyst")
    assert analyst["permissions"] == ["reports:read"]


async def test_profile_settings_ownership_and_admin_override(api) -> None:
    await register_and_verify(api)
    first = await login(api)
    first_headers = bearer(first["access_token"])
    update_profile = await api.client.patch(
        "/v1/profile",
        headers=first_headers,
        json={"display_name": "Updated Member", "bio": "Security-conscious user"},
    )
    assert update_profile.status_code == 200
    assert update_profile.json()["display_name"] == "Updated Member"
    update_settings = await api.client.patch(
        "/v1/settings",
        headers=first_headers,
        json={"marketing_emails": True, "profile_visibility": "public"},
    )
    assert update_settings.status_code == 200
    assert update_settings.json()["marketing_emails"] is True

    await register_and_verify(
        api,
        email="other@example.com",
        password="DistinctHorse!2026",
        display_name="Other",
    )
    other = await api.user("other@example.com")
    denied = await api.client.get(f"/v1/users/{other.id}/profile", headers=first_headers)
    assert denied.status_code == 403

    async with api.app.state.session_factory() as session:
        first_user = await session.scalar(select(User).where(User.email == "member@example.com"))
        admin_role = await session.scalar(select(Role).where(Role.name == "admin"))
        session.add(
            UserRole(
                user_id=first_user.id,
                role_id=admin_role.id,
                granted_by=first_user.id,
            )
        )
        await session.commit()
    allowed = await api.client.get(f"/v1/users/{other.id}/profile", headers=first_headers)
    assert allowed.status_code == 200
    assert allowed.json()["display_name"] == "Other"


async def test_soft_deletion_pseudonymizes_and_preserves_append_only_audit(api) -> None:
    await register_and_verify(api)
    tokens = await login(api)
    user = await api.user("member@example.com")
    response = await api.client.request(
        "DELETE",
        "/v1/users/me",
        headers=bearer(tokens["access_token"]),
        json={"password": "CorrectHorse!2026"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "deleted"}

    invalidated = await api.client.get("/v1/auth/me", headers=bearer(tokens["access_token"]))
    assert invalidated.status_code == 401
    async with api.app.state.session_factory() as session:
        deleted_user = await session.get(User, user.id)
        assert deleted_user.status == UserStatus.deleted
        assert deleted_user.email == f"deleted+{user.id}@deleted.invalid"
        assert deleted_user.password_hash is None
        access_sessions = (
            await session.scalars(select(AccessSession).where(AccessSession.user_id == user.id))
        ).all()
        assert access_sessions
        assert all(item.revoked_at is not None for item in access_sessions)
        event = await session.scalar(
            select(SecurityAuditEvent).where(
                SecurityAuditEvent.target_user_id == user.id,
                SecurityAuditEvent.action == "identity.account_deleted",
            )
        )
        assert event is not None
        event.action = "tampered"
        with pytest.raises(ValueError, match="append-only"):
            await session.commit()
