"""Public test-stand status + sandbox contracts."""

from __future__ import annotations

from typing import Any

import pytest


@pytest.mark.asyncio
async def test_public_stand_status_is_honest_about_tiktok(api_factory: Any) -> None:
    async with api_factory(
        test_stand_mode=True,
        test_stand_auto_verify_email=True,
        test_stand_sandbox_wallet=True,
        test_stand_ends_at="2026-08-15",
    ) as api:
        response = await api.client.get("/v1/public/stand-status")
        assert response.status_code == 200
        body = response.json()
        assert body["product"] == "SYLORA"
        assert body["stand"]["fake_live_events_as_proof"] is False
        assert body["stand"]["real_payments"] is False
        assert body["platforms"]["tiktok"]["status"] == "BLOCKED"
        assert "BLOCKED_BY_PROVIDER_ACCESS" in body["platforms"]["tiktok"]["detail"]
        assert "owner" in body["roles"]
        assert "streamer" in body["roles"]
        assert "viewer" in body["roles"]
        dumped = response.text.lower()
        assert "jwt_secret" not in dumped
        assert "api_key" not in dumped


@pytest.mark.asyncio
async def test_stand_auto_verify_register_and_login(api_factory: Any) -> None:
    async with api_factory(
        smtp_host=None,
        smtp_from_email=None,
        test_stand_mode=True,
        test_stand_auto_verify_email=True,
        test_stand_sandbox_wallet=True,
    ) as api:
        reg = await api.client.post(
            "/v1/auth/register",
            json={
                "email": "stand.user@example.com",
                "password": "CorrectHorse!2026",
                "display_name": "Stand User",
            },
        )
        assert reg.status_code == 202, reg.text
        assert reg.json()["status"] == "registered_verified"
        login = await api.client.post(
            "/v1/auth/login",
            json={
                "email": "stand.user@example.com",
                "password": "CorrectHorse!2026",
                "device_label": "phone",
            },
        )
        assert login.status_code == 200, login.text
        body = login.json()
        assert body["mfa_required"] is False
        token = body["tokens"]["access_token"]
        me = await api.client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "stand.user@example.com"

        credit = await api.client.post(
            "/v1/test-stand/sandbox-credit",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert credit.status_code == 200, credit.text
        assert credit.json()["spendable_minor"] >= 5000

        role = await api.client.post(
            "/v1/test-stand/assume-role/streamer",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert role.status_code == 200
        assert role.json()["role"] == "streamer"
