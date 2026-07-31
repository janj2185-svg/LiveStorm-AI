from __future__ import annotations

from sqlalchemy import func, select

from app.models import EmailOutbox, User, UserStatus
from tests.conftest import bearer, login, register_and_verify


async def test_register_verify_login_and_current_user(api) -> None:
    response = await api.client.post(
        "/v1/auth/register",
        json={
            "email": "  Member@Example.COM ",
            "password": "CorrectHorse!2026",
            "display_name": "First Member",
        },
    )
    assert response.status_code == 202
    assert response.json() == {"status": "verification_queued"}
    assert "token" not in response.text.lower()

    user = await api.user("member@example.com")
    assert user.status == UserStatus.pending
    assert user.password_hash.startswith("$argon2id$")
    token = await api.outbox_token("email_verification")

    verify = await api.client.post("/v1/auth/email-verification/consume", json={"token": token})
    assert verify.status_code == 200
    replay = await api.client.post("/v1/auth/email-verification/consume", json={"token": token})
    assert replay.status_code == 400
    assert replay.json()["code"] == "invalid_or_expired_token"

    tokens = await login(api)
    current = await api.client.get("/v1/auth/me", headers=bearer(tokens["access_token"]))
    assert current.status_code == 200
    assert current.json()["email"] == "member@example.com"
    assert current.json()["roles"] == ["user"]
    assert current.headers["x-content-type-options"] == "nosniff"
    assert current.headers["x-request-id"]


async def test_registration_rejects_common_password_and_unconfigured_email(
    api, api_factory
) -> None:
    weak = await api.client.post(
        "/v1/auth/register",
        json={
            "email": "weak@example.com",
            "password": "password1234",
            "display_name": "Weak",
        },
    )
    assert weak.status_code == 422
    assert weak.json()["code"] == "compromised_password"

    async with api_factory(smtp_host=None, smtp_from_email=None) as unavailable:
        response = await unavailable.client.post(
            "/v1/auth/register",
            json={
                "email": "rollback@example.com",
                "password": "CorrectHorse!2026",
                "display_name": "Rollback",
            },
        )
        assert response.status_code == 503
        assert response.json()["code"] == "email_delivery_unavailable"
        async with unavailable.app.state.session_factory() as session:
            assert await session.scalar(select(func.count()).select_from(User)) == 0
            assert await session.scalar(select(func.count()).select_from(EmailOutbox)) == 0


async def test_login_errors_do_not_disclose_account_existence(api) -> None:
    await register_and_verify(api)
    known = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "WrongPassword!2026",
        },
    )
    unknown = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "unknown@example.com",
            "password": "WrongPassword!2026",
        },
    )
    assert known.status_code == unknown.status_code == 401
    assert known.json()["code"] == unknown.json()["code"] == "invalid_credentials"
    assert known.json()["detail"] == unknown.json()["detail"]


async def test_refresh_rotation_detects_reuse_and_revokes_family(api) -> None:
    await register_and_verify(api)
    original = await login(api)
    rotated_response = await api.client.post(
        "/v1/auth/refresh", json={"refresh_token": original["refresh_token"]}
    )
    assert rotated_response.status_code == 200
    rotated = rotated_response.json()
    assert rotated["refresh_token"] != original["refresh_token"]

    reuse = await api.client.post(
        "/v1/auth/refresh", json={"refresh_token": original["refresh_token"]}
    )
    assert reuse.status_code == 401
    assert reuse.json()["code"] == "refresh_token_reuse"

    family_revoked = await api.client.post(
        "/v1/auth/refresh", json={"refresh_token": rotated["refresh_token"]}
    )
    assert family_revoked.status_code == 401
    assert family_revoked.json()["code"] == "invalid_refresh_token"


async def test_password_reset_changes_password_and_revokes_sessions(api) -> None:
    await register_and_verify(api)
    old_tokens = await login(api)
    request = await api.client.post(
        "/v1/auth/password-reset/request", json={"email": "member@example.com"}
    )
    assert request.status_code == 202
    assert request.json() == {"status": "accepted"}
    reset_token = await api.outbox_token("password_reset")

    consume = await api.client.post(
        "/v1/auth/password-reset/consume",
        json={
            "token": reset_token,
            "new_password": "EvenBetterHorse!2027",
        },
    )
    assert consume.status_code == 200
    invalidated = await api.client.get("/v1/auth/me", headers=bearer(old_tokens["access_token"]))
    assert invalidated.status_code == 401

    old_login = await api.client.post(
        "/v1/auth/login",
        json={
            "email": "member@example.com",
            "password": "CorrectHorse!2026",
        },
    )
    assert old_login.status_code == 401
    new_tokens = await login(api, password="EvenBetterHorse!2027")
    assert new_tokens["access_token"]
