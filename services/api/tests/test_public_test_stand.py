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

        # Signup already granted sandbox credit + gifts_enabled.
        bal = await api.client.get(
            "/v1/wallet/balance",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert bal.status_code == 200, bal.text
        assert bal.json()["spendable_minor"] >= 5000

        credit = await api.client.post(
            "/v1/test-stand/sandbox-credit",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert credit.status_code == 200, credit.text
        assert credit.json()["spendable_minor"] >= 10_000

        role = await api.client.post(
            "/v1/test-stand/assume-role/streamer",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert role.status_code == 200
        assert role.json()["role"] == "streamer"

        msg_ticket = await api.client.post(
            "/v1/messages/events/ticket",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert msg_ticket.status_code == 200, msg_ticket.text
        assert msg_ticket.json()["ticket"]
        assert msg_ticket.json()["expires_in_seconds"] == 60

        gift_ticket = await api.client.post(
            "/v1/gifts/events/ticket",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert gift_ticket.status_code == 200, gift_ticket.text
        assert gift_ticket.json()["ticket"]


@pytest.mark.asyncio
async def test_stand_closed_after_ends_at(api_factory: Any) -> None:
    async with api_factory(
        smtp_host=None,
        smtp_from_email=None,
        test_stand_mode=True,
        test_stand_auto_verify_email=True,
        test_stand_sandbox_wallet=True,
        test_stand_ends_at="2020-01-01",
    ) as api:
        reg = await api.client.post(
            "/v1/auth/register",
            json={
                "email": "late.user@example.com",
                "password": "CorrectHorse!2026",
                "display_name": "Late User",
            },
        )
        assert reg.status_code == 403, reg.text
        assert reg.json()["code"] == "stand_closed"
