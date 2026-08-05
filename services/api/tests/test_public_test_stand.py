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
async def test_stand_email_otp_and_password_reset_expose_debug_delivery(
    api_factory: Any,
) -> None:
    async with api_factory(
        smtp_host=None,
        smtp_from_email=None,
        test_stand_mode=True,
        test_stand_auto_verify_email=True,
        test_stand_sandbox_wallet=True,
    ) as api:
        email = "stand.otp@example.com"
        password = "CorrectHorse!2026"
        reg = await api.client.post(
            "/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "OTP User",
            },
        )
        assert reg.status_code == 202, reg.text

        otp = await api.client.post(
            "/v1/auth/email/otp/start",
            json={"email": email},
        )
        assert otp.status_code == 202, otp.text
        otp_body = otp.json()
        assert otp_body["status"] == "code_sent"
        assert otp_body.get("debug_code")
        verify = await api.client.post(
            "/v1/auth/email/otp/verify",
            json={
                "email": email,
                "code": otp_body["debug_code"],
                "device_label": "stand",
            },
        )
        assert verify.status_code == 200, verify.text

        reset = await api.client.post(
            "/v1/auth/password-reset/request",
            json={"email": email},
        )
        assert reset.status_code == 202, reset.text
        reset_body = reset.json()
        assert reset_body.get("debug_token")
        assert reset_body.get("debug_link")
        consume = await api.client.post(
            "/v1/auth/password-reset/consume",
            json={
                "token": reset_body["debug_token"],
                "new_password": "CorrectHorse!2027",
            },
        )
        assert consume.status_code == 200, consume.text
        login = await api.client.post(
            "/v1/auth/login",
            json={
                "email": email,
                "password": "CorrectHorse!2027",
                "device_label": "stand",
            },
        )
        assert login.status_code == 200, login.text


@pytest.mark.asyncio
async def test_stand_facebook_and_tiktok_login_without_idp_secrets(api_factory: Any) -> None:
    async with api_factory(
        smtp_host=None,
        smtp_from_email=None,
        test_stand_mode=True,
        test_stand_auto_verify_email=True,
        test_stand_sandbox_wallet=True,
    ) as api:
        methods = await api.client.get("/v1/auth/methods")
        assert methods.status_code == 200
        body = methods.json()
        assert body["facebook"] is True
        assert body["tiktok"] is True

        for provider in ("facebook", "tiktok"):
            start = await api.client.get(
                f"/v1/auth/oauth/{provider}/start",
                headers={"Accept": "application/json"},
                follow_redirects=False,
            )
            assert start.status_code == 200, start.text
            tokens = start.json()
            assert "access_token" in tokens
            me = await api.client.get(
                "/v1/auth/me",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            assert me.status_code == 200, me.text
            assert me.json()["status"] == "active"

        # Browser-style redirect lands on Flutter hash complete route.
        redirect = await api.client.get(
            "/v1/auth/oauth/facebook/start",
            follow_redirects=False,
        )
        assert redirect.status_code == 303
        assert "/#/auth/oauth/complete" in redirect.headers["location"]

        stand = await api.client.get("/v1/public/stand-status")
        assert stand.status_code == 200
        features = stand.json()["features"]
        # Login IdPs on the stand are Google / Apple / Email only —
        # Facebook and TikTok are Live destinations, not consumer login.
        assert "facebook_login" not in features
        assert "tiktok_login" not in features
        assert features["email_login"]["status"] == "READY"
        assert features["google_login"]["status"] in {"READY", "BLOCKED"}
        assert features["apple_login"]["status"] in {"READY", "BLOCKED"}


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
