"""Owner Configuration ops: health, backup, deploy gate, profiles."""

from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy import select

from app.business_models import FeatureFlag
from app.models import Role, UserRole
from app.owner_config_models import (
    OwnerConfigBackup,
    OwnerServiceCredential,
    OwnerServiceStatus,
)
from app.owner_config_store import owner_config_store
from tests.conftest import APIHarness, bearer, login, register_and_verify


async def _member(
    api: APIHarness, email: str, *, role: str | None = None
) -> tuple[Any, dict[str, str]]:
    await register_and_verify(api, email=email, display_name=email.split("@")[0])
    user = await api.user(email)
    if role:
        async with api.app.state.session_factory() as db:
            selected = await db.scalar(select(Role).where(Role.name == role))
            assert selected is not None
            db.add(UserRole(user_id=user.id, role_id=selected.id))
            await db.commit()
    tokens = await login(api, email=email)
    return user, bearer(tokens["access_token"])


@pytest.mark.asyncio
async def test_owner_config_catalog_lists_providers(api: APIHarness) -> None:
    _, admin_headers = await _member(api, "owner-config-admin@example.com", role="admin")
    response = await api.client.get("/v1/admin/owner-config", headers=admin_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["environment"] in {"development", "staging", "production"}
    assert "deploy_ready" in payload
    assert payload["missing_count"] >= 10
    keys = {item["key"] for item in payload["providers"]}
    assert "openai" in keys and "smtp" in keys and "custom" in keys


@pytest.mark.asyncio
async def test_owner_config_custom_save_backup_and_audit(api: APIHarness) -> None:
    owner_config_store.clear()
    _, admin_headers = await _member(api, "owner-config-save@example.com", role="owner")
    response = await api.client.put(
        "/v1/admin/owner-config/providers/custom",
        headers=admin_headers,
        json={
            "values": {
                "integration_name": "acme-vendor",
                "api_key": "test-custom-secret-key-123",
                "base_url": "https://api.example.com",
            },
            "test_connection": True,
            "enable_on_success": True,
            "rotate": True,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "connected"
    assert body["enabled"] is True
    assert body["environment"] == "production"

    backup = await api.client.post(
        "/v1/admin/owner-config/backups",
        headers=admin_headers,
        json={"label": "unit-test-backup"},
    )
    assert backup.status_code == 200, backup.text
    backup_id = backup.json()["id"]
    assert backup.json()["provider_count"] >= 1

    listed = await api.client.get("/v1/admin/owner-config/backups", headers=admin_headers)
    assert listed.status_code == 200
    assert any(item["id"] == backup_id for item in listed.json())

    download = await api.client.get(
        f"/v1/admin/owner-config/backups/{backup_id}/download",
        headers=admin_headers,
    )
    assert download.status_code == 200
    assert "encrypted_payload" in download.json()
    assert "test-custom-secret-key-123" not in download.json()["encrypted_payload"]

    restore = await api.client.post(
        f"/v1/admin/owner-config/backups/{backup_id}/restore",
        headers=admin_headers,
        json={"rotate": True},
    )
    assert restore.status_code == 200, restore.text
    assert restore.json()["restored"] >= 1

    audit = await api.client.get("/v1/admin/owner-config/audit", headers=admin_headers)
    assert audit.status_code == 200
    actions = {item["action"] for item in audit.json()}
    assert "owner.config_upserted" in actions
    assert "owner.config_backup_created" in actions
    assert "owner.config_backup_restored" in actions

    async with api.app.state.session_factory() as session:
        flag = await session.scalar(
            select(FeatureFlag).where(FeatureFlag.key == "integrations.custom")
        )
        assert flag is not None and flag.enabled is True
        assert await session.scalar(select(OwnerConfigBackup)) is not None


@pytest.mark.asyncio
async def test_owner_config_deploy_readiness_and_reconnect(api: APIHarness) -> None:
    _, admin_headers = await _member(api, "owner-config-ready@example.com", role="admin")
    readiness = await api.client.get(
        "/v1/admin/owner-config/deploy-readiness",
        headers=admin_headers,
        params={"environment": "development"},
    )
    assert readiness.status_code == 200, readiness.text
    assert readiness.json()["ready"] is True
    assert readiness.json()["environment"] == "development"

    prod = await api.client.get(
        "/v1/admin/owner-config/deploy-readiness",
        headers=admin_headers,
        params={"environment": "production"},
    )
    assert prod.status_code == 200
    assert prod.json()["ready"] is False
    assert any("smtp" in item for item in prod.json()["blocking"])

    await api.client.put(
        "/v1/admin/owner-config/providers/custom",
        headers=admin_headers,
        json={
            "values": {"integration_name": "reconnect-me", "api_key": "secret-reconnect-key"},
            "environment": "development",
        },
    )
    reconnect = await api.client.post(
        "/v1/admin/owner-config/providers/custom/reconnect",
        headers=admin_headers,
        params={"environment": "development"},
    )
    assert reconnect.status_code == 200, reconnect.text
    assert reconnect.json()["ok"] is True

    usage = await api.client.get(
        "/v1/admin/owner-config/usage",
        headers=admin_headers,
        params={"environment": "development", "hours": 24},
    )
    assert usage.status_code == 200, usage.text
    assert "openai" in usage.json()
    assert "smtp" in usage.json()

    health = await api.client.post(
        "/v1/admin/owner-config/health-checks/run",
        headers=admin_headers,
        params={"environment": "development"},
    )
    assert health.status_code == 200, health.text
    assert health.json()["checked"] >= 1


@pytest.mark.asyncio
async def test_owner_config_rejects_unknown_provider(api: APIHarness) -> None:
    _, admin_headers = await _member(api, "owner-config-bad@example.com", role="admin")
    response = await api.client.put(
        "/v1/admin/owner-config/providers/not-a-real-vendor",
        headers=admin_headers,
        json={"values": {"api_key": "x"}},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_owner_config_forbidden_for_regular_user(api: APIHarness) -> None:
    _, user_headers = await _member(api, "owner-config-user@example.com")
    response = await api.client.get("/v1/admin/owner-config", headers=user_headers)
    assert response.status_code in {401, 403}


@pytest.mark.asyncio
async def test_owner_config_rotation_keeps_previous_on_failure(api: APIHarness) -> None:
    owner_config_store.clear()
    _, headers = await _member(api, "owner-config-rotate@example.com", role="owner")
    first = await api.client.put(
        "/v1/admin/owner-config/providers/custom",
        headers=headers,
        json={
            "values": {
                "integration_name": "rotate-vendor",
                "api_key": "original-secret-key-aaa",
            },
            "environment": "development",
        },
    )
    assert first.status_code == 200, first.text
    version = first.json()["version"]

    # Custom provider always "connects" on format validation — rotation success path.
    second = await api.client.put(
        "/v1/admin/owner-config/providers/custom",
        headers=headers,
        json={
            "values": {
                "integration_name": "rotate-vendor",
                "api_key": "rotated-secret-key-bbb",
            },
            "expected_version": version,
            "environment": "development",
            "rotate": True,
        },
    )
    assert second.status_code == 200, second.text
    assert second.json()["status"] == "connected"

    async with api.app.state.session_factory() as session:
        record = await session.scalar(
            select(OwnerServiceCredential).where(
                OwnerServiceCredential.provider_key == "custom",
                OwnerServiceCredential.environment == "development",
            )
        )
        assert record is not None
        assert record.status == OwnerServiceStatus.connected
        assert record.encrypted_secrets
