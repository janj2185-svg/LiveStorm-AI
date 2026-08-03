from __future__ import annotations

import pytest
from pydantic import SecretStr

from app.config import Settings
from app.phone import normalize_phone_e164
from app.sms import LoggingDevSmsProvider, sms_configured


def test_normalize_phone_e164_ukraine() -> None:
    assert normalize_phone_e164("+380501112233") == "+380501112233"
    assert normalize_phone_e164("0501112233", default_region="UA") == "+380501112233"


def test_auth_methods_exclude_github_and_unconfigured_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OAUTH_GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("OAUTH_GOOGLE_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("OAUTH_TIKTOK_CLIENT_ID", raising=False)
    monkeypatch.delenv("OAUTH_GITHUB_CLIENT_ID", raising=False)
    monkeypatch.delenv("SMS_PROVIDER", raising=False)
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///consumer-auth.db",
        redis_url="memory://",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        web_base_url="https://getsylora.com",
    )
    methods = settings.auth_methods()
    assert methods["email"] is True
    assert methods["phone"] is False
    assert methods["tiktok"] is False
    assert methods["facebook"] is False
    assert methods["google"] is False
    assert methods["apple"] is False
    assert "github" not in methods


def test_github_oauth_ignored_in_production_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OAUTH_GITHUB_CLIENT_ID", "dev-only-client")
    monkeypatch.setenv("OAUTH_GITHUB_CLIENT_SECRET", "dev-only-secret")
    production = Settings(
        _env_file=None,
        environment="production",
        database_url="postgresql+asyncpg://sylora:x@127.0.0.1:5432/sylora",
        redis_url="redis://127.0.0.1:6379/0",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        web_base_url="https://getsylora.com",
        cors_origins=["https://getsylora.com"],
        allowed_hosts=["getsylora.com"],
        jwt_issuer="https://getsylora.com",
        ip_hash_key=SecretStr("unit-test-ip-hash-key-with-enough-entropy"),
        smtp_host="smtp.example.com",
        smtp_from_email="noreply@example.com",
    )
    assert production.oauth_provider("github") is None

    development = Settings(
        _env_file=None,
        environment="development",
        database_url="postgresql+asyncpg://sylora:x@127.0.0.1:5432/sylora",
        redis_url="redis://127.0.0.1:6379/0",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        web_base_url="http://localhost:5173",
    )
    assert development.oauth_provider("github") is not None


async def test_auth_methods_endpoint(api) -> None:
    response = await api.client.get("/v1/auth/methods")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] is True
    assert body["phone"] is False
    assert set(body) == {"phone", "email", "tiktok", "facebook", "google", "apple"}


async def test_phone_start_unavailable_without_sms(api) -> None:
    response = await api.client.post(
        "/v1/auth/phone/start", json={"phone": "+380501112233"}
    )
    assert response.status_code == 503
    assert response.json()["code"] == "phone_auth_unavailable"


async def test_phone_otp_flow_with_injected_sms(api_factory, monkeypatch) -> None:
    sms = LoggingDevSmsProvider()
    monkeypatch.setattr("app.routers.auth.build_sms_provider", lambda settings: sms)
    monkeypatch.setattr("app.auth_otp.require_sms_capability", lambda settings: None)

    async with api_factory() as harness:
        start = await harness.client.post(
            "/v1/auth/phone/start", json={"phone": "+380501112233"}
        )
        assert start.status_code == 202
        assert start.json()["status"] == "code_sent"
        assert "code" not in start.json()
        assert sms.sent
        message = sms.sent[-1]["message"]
        code = message.split("SYLORA code: ", 1)[1].split(".", 1)[0]

        verify = await harness.client.post(
            "/v1/auth/phone/verify",
            json={"phone": "+380501112233", "code": code, "device_label": "test"},
        )
        assert verify.status_code == 200
        assert "access_token" in verify.json()
        assert "refresh_token" in verify.json()


async def test_github_oauth_blocked_outside_development(api) -> None:
    api.app.state.settings = api.app.state.settings.model_copy(update={"environment": "staging"})
    response = await api.client.get("/v1/auth/oauth/github/start", follow_redirects=False)
    assert response.status_code == 503
    assert response.json()["code"] == "oauth_provider_unavailable"


def test_sms_configured_requires_credentials() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///sms.db",
        redis_url="memory://",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        sms_provider="twilio",
        sms_api_key=None,
        sms_from_number="+15551234567",
    )
    assert sms_configured(settings) is False
