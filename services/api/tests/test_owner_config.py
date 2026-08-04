"""Owner Configuration API tests (no live network secrets)."""

from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy import select

from app.business_models import FeatureFlag
from app.models import Role, UserRole
from app.owner_config_models import OwnerServiceCredential, OwnerServiceStatus
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
    assert payload["missing_count"] >= 10
    keys = {item["key"] for item in payload["providers"]}
    assert {
        "openai",
        "smtp",
        "stripe",
        "s3",
        "fcm",
        "google_oauth",
        "apple_oauth",
        "facebook_oauth",
        "tiktok_oauth",
        "sentry",
        "translation",
        "speech_to_text",
        "text_to_speech",
        "maps",
        "analytics",
        "custom",
    }.issubset(keys)
    openai = next(item for item in payload["providers"] if item["key"] == "openai")
    assert openai["status"] == "missing"
    secret_fields = [field for field in openai["fields"] if field["secret"]]
    assert secret_fields
    assert all(field["public_value"] is None for field in secret_fields)


@pytest.mark.asyncio
async def test_owner_config_custom_save_enables_feature(api: APIHarness) -> None:
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
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["key"] == "custom"
    assert body["status"] == "connected"
    assert body["enabled"] is True
    assert all(
        field.get("public_value") != "test-custom-secret-key-123" for field in body["fields"]
    )

    catalog = await api.client.get("/v1/admin/owner-config", headers=admin_headers)
    assert catalog.status_code == 200
    custom = next(item for item in catalog.json()["providers"] if item["key"] == "custom")
    assert custom["status"] == "connected"
    assert custom["enabled"] is True

    async with api.app.state.session_factory() as session:
        record = await session.scalar(
            select(OwnerServiceCredential).where(
                OwnerServiceCredential.provider_key == "custom"
            )
        )
        assert record is not None
        assert record.encrypted_secrets
        assert "test-custom-secret-key-123" not in (record.encrypted_secrets or "")
        assert record.status == OwnerServiceStatus.connected
        flag = await session.scalar(
            select(FeatureFlag).where(FeatureFlag.key == "integrations.custom")
        )
        assert flag is not None
        assert flag.enabled is True

    export = await api.client.get(
        "/v1/admin/owner-config/env-export", headers=admin_headers
    )
    assert export.status_code == 200, export.text
    files = export.json()["files"]
    assert len(files) == 2
    content = files[0]["content"]
    assert "CUSTOM_INTEGRATION_NAME=acme-vendor" in content
    assert "CUSTOM_INTEGRATION_API_KEY=test-custom-secret-key-123" in content


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
