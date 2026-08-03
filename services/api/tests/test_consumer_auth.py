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
    assert methods["email_password"] is True
    assert methods["email_otp"] is False
    assert methods["phone"] is False
    assert methods["tiktok"] is False
    assert methods["facebook"] is False
    assert methods["google"] is False
    assert methods["apple"] is False
    assert "github" not in methods


def test_oauth_placeholder_credentials_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_ID", "changeme-google-client")
    monkeypatch.setenv("OAUTH_GOOGLE_CLIENT_SECRET", "placeholder-secret-value")
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///oauth-placeholder.db",
        redis_url="memory://",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        web_base_url="https://getsylora.com",
    )
    assert settings.oauth_provider("google") is None


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
    assert body["email_password"] is True
    assert body["phone"] is False
    assert "github" not in body
    assert {
        "phone",
        "email",
        "email_password",
        "email_otp",
        "tiktok",
        "facebook",
        "google",
        "apple",
    } <= set(body)


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

        me = await harness.client.get(
            "/v1/auth/me",
            headers={"Authorization": f"Bearer {verify.json()['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["phone_e164"] == "+380501112233"


async def test_email_otp_and_account_linking(api_factory, monkeypatch) -> None:
    monkeypatch.setattr("app.auth_otp.require_email_capability", lambda settings: None)

    async with api_factory() as harness:
        register = await harness.client.post(
            "/v1/auth/register",
            json={
                "email": "link-me@example.com",
                "password": "SecurePassword123!",
                "display_name": "Linker",
                "device_label": "test",
            },
        )
        assert register.status_code == 202

        start = await harness.client.post(
            "/v1/auth/email/otp/start", json={"email": "link-me@example.com"}
        )
        assert start.status_code == 202

        from app.models import EmailOutbox
        from sqlalchemy import select

        async with harness.app.state.session_factory() as session:
            outbox = await session.scalar(
                select(EmailOutbox)
                .where(EmailOutbox.message_type == "email_otp")
                .order_by(EmailOutbox.created_at.desc())
            )
            assert outbox is not None
            text = outbox.text_body
            code = text.split("code is ", 1)[1].split(".", 1)[0].strip()

        verify = await harness.client.post(
            "/v1/auth/email/otp/verify",
            json={
                "email": "link-me@example.com",
                "code": code,
                "device_label": "otp",
            },
        )
        assert verify.status_code == 200
        token = verify.json()["access_token"]
        me = await harness.client.get(
            "/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert me.status_code == 200
        assert me.json()["email"] == "link-me@example.com"
        assert me.json()["email_verified_at"] is not None


async def test_phone_password_reset_and_logout_all(api_factory, monkeypatch) -> None:
    sms = LoggingDevSmsProvider()
    monkeypatch.setattr("app.routers.auth.build_sms_provider", lambda settings: sms)
    monkeypatch.setattr("app.auth_otp.require_sms_capability", lambda settings: None)

    async with api_factory() as harness:
        start = await harness.client.post(
            "/v1/auth/phone/start", json={"phone": "+380671112233"}
        )
        assert start.status_code == 202
        code = sms.sent[-1]["message"].split("SYLORA code: ", 1)[1].split(".", 1)[0]
        login = await harness.client.post(
            "/v1/auth/phone/verify",
            json={"phone": "+380671112233", "code": code, "device_label": "device-a"},
        )
        assert login.status_code == 200
        access = login.json()["access_token"]

        reset_start = await harness.client.post(
            "/v1/auth/password-reset/phone/start",
            json={"phone": "+380671112233"},
        )
        assert reset_start.status_code == 202
        reset_code = sms.sent[-1]["message"].split("SYLORA code: ", 1)[1].split(".", 1)[0]
        reset = await harness.client.post(
            "/v1/auth/password-reset/phone/consume",
            json={
                "phone": "+380671112233",
                "code": reset_code,
                "new_password": "PhoneResetPass123!",
            },
        )
        assert reset.status_code == 200
        assert reset.json()["status"] == "password_reset"

        # Previous access token should be invalidated via token_version bump
        # after password reset (sessions revoked).
        stale = await harness.client.get(
            "/v1/auth/me", headers={"Authorization": f"Bearer {access}"}
        )
        assert stale.status_code in {401, 403}

        # Sign in again via phone OTP, then logout-all.
        start2 = await harness.client.post(
            "/v1/auth/phone/start", json={"phone": "+380671112233"}
        )
        assert start2.status_code == 202
        code2 = sms.sent[-1]["message"].split("SYLORA code: ", 1)[1].split(".", 1)[0]
        login2 = await harness.client.post(
            "/v1/auth/phone/verify",
            json={"phone": "+380671112233", "code": code2, "device_label": "device-b"},
        )
        access2 = login2.json()["access_token"]
        logout_all = await harness.client.post(
            "/v1/auth/logout-all",
            headers={"Authorization": f"Bearer {access2}"},
        )
        assert logout_all.status_code == 200
        assert logout_all.json()["status"] == "logged_out_all"
        after = await harness.client.get(
            "/v1/auth/me", headers={"Authorization": f"Bearer {access2}"}
        )
        assert after.status_code in {401, 403}


async def test_github_oauth_blocked_outside_development(api) -> None:
    api.app.state.settings = api.app.state.settings.model_copy(update={"environment": "staging"})
    response = await api.client.get("/v1/auth/oauth/github/start", follow_redirects=False)
    assert response.status_code == 503
    assert response.json()["code"] == "oauth_provider_unavailable"


async def test_oauth_email_linking_merges_accounts(api_factory) -> None:
    from app.models import OAuthIdentity, User
    from app.routers.oauth import resolve_oauth_user
    from app.config import OAuthProviderSettings
    from sqlalchemy import select

    async with api_factory() as harness:
        register = await harness.client.post(
            "/v1/auth/register",
            json={
                "email": "oauth-merge@example.com",
                "password": "SecurePassword123!",
                "display_name": "Merge Me",
                "device_label": "test",
            },
        )
        assert register.status_code == 202

        # Mark email verified so OAuth may link.
        async with harness.app.state.session_factory() as session:
            user = await session.scalar(
                select(User).where(User.email == "oauth-merge@example.com")
            )
            assert user is not None
            from app.security import utcnow

            user.email_verified_at = utcnow()
            await session.commit()

        configuration = OAuthProviderSettings(
            name="google",
            client_id="test-google",
            client_secret=SecretStr("test-google-secret"),
            discovery_url="https://accounts.google.com/.well-known/openid-configuration",
            redirect_uri="https://getsylora.com/v1/auth/oauth/google/callback",
        )
        async with harness.app.state.session_factory() as session:
            linked_user, identity = await resolve_oauth_user(
                session,
                configuration,
                {
                    "sub": "google-subject-1",
                    "email": "oauth-merge@example.com",
                    "email_verified": True,
                    "name": "Merge Me",
                },
            )
            await session.commit()
            assert linked_user.email == "oauth-merge@example.com"
            assert identity.provider == "google"
            same_email = (
                await session.scalars(
                    select(User).where(User.email == "oauth-merge@example.com")
                )
            ).all()
            assert len(same_email) == 1
            identities = (
                await session.scalars(
                    select(OAuthIdentity).where(OAuthIdentity.user_id == linked_user.id)
                )
            ).all()
            assert len(identities) == 1


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


def test_apple_authorize_uses_form_post() -> None:
    from app.config import OAuthProviderSettings
    from app.oauth_providers import authorize_query

    configuration = OAuthProviderSettings(
        name="apple",
        client_id="com.sylora.app",
        client_secret=SecretStr("apple-secret"),
        discovery_url="https://appleid.apple.com/.well-known/openid-configuration",
        redirect_uri="https://getsylora.com/v1/auth/oauth/apple/callback",
        scopes="openid email name",
    )
    query = authorize_query(
        configuration,
        {
            "authorization_endpoint": "https://appleid.apple.com/auth/authorize",
        },
        state="state-value-with-enough-entropy-012345",
        nonce="nonce-value",
        challenge="challenge",
    )
    assert "response_mode=form_post" in query
    assert "nonce=nonce-value" in query
