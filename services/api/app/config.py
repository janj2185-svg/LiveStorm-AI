from __future__ import annotations

import base64
import os
from functools import lru_cache
from typing import Literal

from dotenv import dotenv_values, find_dotenv
from pydantic import BaseModel, EmailStr, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class OAuthProviderSettings(BaseModel):
    name: str
    client_id: str
    client_secret: SecretStr
    discovery_url: str
    redirect_uri: str
    scopes: str = "openid email profile"


# Consumer-facing OAuth providers for the public product / Flutter UI.
# GitHub is intentionally excluded from production authentication.
# TikTok / Facebook are streaming integrations — never consumer IdPs.
PUBLIC_OAUTH_PROVIDERS = ("google", "apple")

# Historical stand synthetic IdPs — disabled by owner mandate (2026-08-05).
# Keep empty so Facebook/TikTok never appear on login.
TEST_STAND_OAUTH_PROVIDERS: frozenset[str] = frozenset()

# GitHub OAuth may be used only in local development/test tooling.
DEVELOPMENT_ONLY_OAUTH_PROVIDERS = frozenset({"github"})

OAUTH_DEFAULT_DISCOVERY: dict[str, str] = {
    "google": "https://accounts.google.com/.well-known/openid-configuration",
    "apple": "https://appleid.apple.com/.well-known/openid-configuration",
    "tiktok": "builtin:tiktok",
    "facebook": "builtin:facebook",
    # Development/test only — never enabled for staging/production product auth.
    "github": "builtin:github",
}

OAUTH_DEFAULT_SCOPES: dict[str, str] = {
    "google": "openid email profile",
    "apple": "openid email name",
    "tiktok": "user.info.basic",
    "facebook": "email,public_profile",
    "github": "read:user user:email",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "test", "staging", "production"] = "development"
    service_name: str = "sylora-api"
    api_prefix: str = "/v1"

    database_url: str
    redis_url: str
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None
    jwt_secret: SecretStr
    jwt_issuer: str = "sylora-api"
    jwt_audience: str = "sylora-api"
    access_token_minutes: int = Field(default=15, ge=2, le=60)
    refresh_token_days: int = Field(default=30, ge=1, le=90)
    verification_token_hours: int = Field(default=24, ge=1, le=72)
    password_reset_minutes: int = Field(default=30, ge=5, le=120)
    auth_otp_minutes: int = Field(default=10, ge=2, le=30)
    auth_otp_resend_seconds: int = Field(default=60, ge=15, le=600)
    auth_otp_max_attempts: int = Field(default=5, ge=3, le=10)
    phone_default_region: str = "UA"
    # SMS provider: twilio | vonage | none. Phone auth stays unavailable until set.
    sms_provider: str | None = None
    sms_api_key: SecretStr | None = None
    sms_api_secret: SecretStr | None = None
    sms_account_sid: str | None = None
    sms_from_number: str | None = None
    data_encryption_key: SecretStr

    cors_origins: list[str] = Field(default_factory=list)
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])
    max_body_bytes: int = Field(default=1_048_576, ge=16_384, le=10_485_760)
    security_headers_enabled: bool = True
    auth_rate_limit: int = Field(default=10, ge=1, le=1000)
    auth_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    social_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    post_rate_limit: int = Field(default=10, ge=1, le=1000)
    comment_rate_limit: int = Field(default=30, ge=1, le=2000)
    message_rate_limit: int = Field(default=60, ge=1, le=5000)
    reaction_rate_limit: int = Field(default=120, ge=1, le=10_000)
    wallet_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    purchase_rate_limit: int = Field(default=20, ge=1, le=1000)
    gift_send_rate_limit: int = Field(default=30, ge=1, le=2000)
    topup_rate_limit: int = Field(default=5, ge=1, le=100)
    push_enabled: bool = False
    fcm_project_id: str | None = None
    fcm_service_account_json: SecretStr | None = None
    payment_provider: Literal["stripe", "none"] = "none"
    stripe_secret_key: SecretStr | None = None
    stripe_webhook_secret: SecretStr | None = None
    stripe_publishable_key: str | None = None
    payment_sandbox_mode: bool = False
    ai_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    ai_chat_rate_limit: int = Field(default=30, ge=1, le=1000)
    ai_generation_rate_limit: int = Field(default=10, ge=1, le=1000)
    ai_tool_rate_limit: int = Field(default=30, ge=1, le=1000)
    ai_vector_backend: Literal["postgres", "none"] = "postgres"
    live_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    live_manage_rate_limit: int = Field(default=60, ge=1, le=5000)
    live_webhook_rate_limit: int = Field(default=600, ge=1, le=100_000)
    creator_subscription_rate_limit: int = Field(default=10, ge=1, le=1000)
    marketplace_checkout_rate_limit: int = Field(default=10, ge=1, le=1000)
    marketplace_review_rate_limit: int = Field(default=30, ge=1, le=2000)
    learning_progress_rate_limit: int = Field(default=120, ge=1, le=10_000)
    learning_quiz_rate_limit: int = Field(default=60, ge=1, le=5000)
    platform_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    business_mutation_rate_limit: int = Field(default=120, ge=1, le=10_000)
    admin_mutation_rate_limit: int = Field(default=60, ge=1, le=5000)
    service_health_hmac_secret: SecretStr | None = None
    service_health_max_clock_skew_seconds: int = Field(default=300, ge=30, le=3600)
    ip_hash_key: SecretStr | None = None

    s3_endpoint_url: str | None = None
    s3_bucket: str | None = None
    s3_region: str = "us-east-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: SecretStr | None = None
    s3_presign_seconds: int = Field(default=900, ge=60, le=3600)

    youtube_client_id: str | None = None
    youtube_client_secret: SecretStr | None = None
    youtube_redirect_uri: str | None = None
    twitch_client_id: str | None = None
    twitch_client_secret: SecretStr | None = None
    twitch_redirect_uri: str | None = None
    discord_application_id: str | None = None
    mediamtx_control_url: str | None = None
    mediamtx_control_username: str | None = None
    mediamtx_control_password: SecretStr | None = None
    mediamtx_whip_base_url: str | None = None
    mediamtx_playback_base_url: str | None = None
    turn_urls: list[str] = Field(default_factory=list)
    turn_username: str | None = None
    turn_credential: SecretStr | None = None
    live_obs_allowed_hosts: list[str] = Field(
        default_factory=lambda: ["127.0.0.1", "::1", "localhost"]
    )
    live_plugin_allowed_hosts: list[str] = Field(default_factory=list)
    live_plugin_signing_keys: dict[str, str] = Field(default_factory=dict)
    # TikTok LIVE — blocked until an approved provider is configured.
    # Do not put unofficial webcast scraping credentials here.
    tiktok_live_provider_approved: bool = False
    tiktok_live_provider_name: str | None = None
    tiktok_live_provider_api_key: SecretStr | None = None
    tiktok_live_provider_endpoint: str | None = None

    # Public multi-tester stand (staging only). Never enable in production.
    test_stand_mode: bool = False
    test_stand_auto_verify_email: bool = False
    test_stand_sandbox_wallet: bool = False
    test_stand_sandbox_credit_minor: int = Field(default=5_000, ge=0, le=100_000)
    test_stand_ends_at: str | None = None  # ISO-8601 date for tester docs
    test_stand_bug_report_url: str | None = None

    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_from_email: EmailStr | None = None
    smtp_from_name: str = "SYLORA"
    smtp_start_tls: bool = True
    smtp_use_tls: bool = False
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_timeout_seconds: float = Field(default=15, ge=1, le=60)
    web_base_url: str = "http://localhost:5173"

    @field_validator("turn_urls", mode="before")
    @classmethod
    def parse_turn_urls(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def validate_security_configuration(self) -> Settings:
        jwt_value = self.jwt_secret.get_secret_value()
        weak_markers = ("change_me", "changeme", "secret", "password", "development")
        if len(jwt_value) < 32 or any(marker in jwt_value.lower() for marker in weak_markers):
            raise ValueError("JWT_SECRET must be a strong value of at least 32 characters")

        try:
            decoded_key = base64.urlsafe_b64decode(
                self.data_encryption_key.get_secret_value().encode("ascii")
            )
        except (ValueError, UnicodeError) as exc:
            raise ValueError("DATA_ENCRYPTION_KEY must be a valid Fernet key") from exc
        if len(decoded_key) != 32:
            raise ValueError("DATA_ENCRYPTION_KEY must be a valid Fernet key")

        if self.smtp_use_tls and self.smtp_start_tls:
            raise ValueError("SMTP_USE_TLS and SMTP_START_TLS cannot both be enabled")
        if bool(self.smtp_username) != bool(self.smtp_password):
            raise ValueError("SMTP_USERNAME and SMTP_PASSWORD must be configured together")
        if bool(self.youtube_client_id) != bool(self.youtube_client_secret):
            raise ValueError(
                "YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be configured together"
            )
        if bool(self.twitch_client_id) != bool(self.twitch_client_secret):
            raise ValueError(
                "TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be configured together"
            )
        if bool(self.mediamtx_control_username) != bool(self.mediamtx_control_password):
            raise ValueError(
                "MEDIAMTX_CONTROL_USERNAME and MEDIAMTX_CONTROL_PASSWORD "
                "must be configured together"
            )
        if bool(self.turn_username) != bool(self.turn_credential):
            raise ValueError("TURN_USERNAME and TURN_CREDENTIAL must be configured together")
        if (
            self.mediamtx_control_url
            and self.environment == "production"
            and not self.mediamtx_control_url.startswith("https://")
        ):
            raise ValueError("production MEDIAMTX_CONTROL_URL must use HTTPS")
        for field_name, url in (
            ("MEDIAMTX_WHIP_BASE_URL", self.mediamtx_whip_base_url),
            ("MEDIAMTX_PLAYBACK_BASE_URL", self.mediamtx_playback_base_url),
        ):
            if url and self.environment == "production" and not url.startswith("https://"):
                raise ValueError(f"production {field_name} must use HTTPS")
        for url in self.turn_urls:
            if not url.startswith(("stun:", "stuns:", "turn:", "turns:")):
                raise ValueError("TURN_URLS entries must be STUN or TURN URLs")
        for redirect_uri in (self.youtube_redirect_uri, self.twitch_redirect_uri):
            if (
                redirect_uri
                and self.environment == "production"
                and not redirect_uri.startswith("https://")
            ):
                raise ValueError("production live OAuth redirect URIs must use HTTPS")

        if self.environment == "production":
            if (
                self.test_stand_mode
                or self.test_stand_auto_verify_email
                or self.test_stand_sandbox_wallet
            ):
                raise ValueError("test stand flags are forbidden in production")
            if self.payment_sandbox_mode:
                raise ValueError("PAYMENT_SANDBOX_MODE is forbidden in production")
            if not self.database_url.startswith("postgresql+asyncpg://"):
                raise ValueError("production DATABASE_URL must use PostgreSQL with asyncpg")
            if not self.redis_url.startswith(("redis://", "rediss://")):
                raise ValueError("production REDIS_URL must use Redis")
            if not self.smtp_host or not self.smtp_from_email:
                raise ValueError("production SMTP settings are required")
            if not self.cors_origins or "*" in self.cors_origins:
                raise ValueError("production CORS_ORIGINS must be explicit and non-empty")
            if not self.allowed_hosts or "*" in self.allowed_hosts:
                raise ValueError("production ALLOWED_HOSTS must be explicit and non-empty")
            if self.jwt_issuer in {"sylora-api", "localhost"}:
                raise ValueError("production JWT_ISSUER must be deployment-specific")
            if self.ip_hash_key is None:
                raise ValueError("production IP_HASH_KEY is required")
            if "localhost" in self.web_base_url or not self.web_base_url.startswith("https://"):
                raise ValueError("production WEB_BASE_URL must be an HTTPS deployment URL")
        elif self.environment == "staging":
            if not self.database_url.startswith("postgresql+asyncpg://"):
                raise ValueError("staging DATABASE_URL must use PostgreSQL with asyncpg")
            if not self.redis_url.startswith(("redis://", "rediss://")):
                raise ValueError("staging REDIS_URL must use Redis")
            if not self.cors_origins or "*" in self.cors_origins:
                raise ValueError("staging CORS_ORIGINS must be explicit and non-empty")
            if not self.allowed_hosts or "*" in self.allowed_hosts:
                raise ValueError("staging ALLOWED_HOSTS must be explicit and non-empty")
            if "localhost" in self.web_base_url or not self.web_base_url.startswith("https://"):
                raise ValueError("staging WEB_BASE_URL must be an HTTPS deployment URL")
            if not self.smtp_configured and not self.test_stand_auto_verify_email:
                raise ValueError(
                    "staging requires SMTP or TEST_STAND_AUTO_VERIFY_EMAIL=true for registration"
                )
        elif not self.database_url.startswith(("postgresql+asyncpg://", "sqlite+aiosqlite://")):
            raise ValueError("DATABASE_URL must use PostgreSQL with asyncpg (or SQLite in tests)")

        if self.environment != "test" and self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is permitted only when ENVIRONMENT=test")
        return self

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

    @property
    def is_public_test_stand(self) -> bool:
        return self.test_stand_mode and self.environment in {"staging", "development", "test"}

    @property
    def s3_configured(self) -> bool:
        return bool(
            self.s3_endpoint_url
            and self.s3_bucket
            and self.s3_access_key_id
            and self.s3_secret_access_key
        )

    @property
    def effective_celery_broker_url(self) -> str:
        """Use a dedicated broker when configured, otherwise the runtime Redis."""
        return self.celery_broker_url or self.redis_url

    @property
    def effective_celery_result_backend(self) -> str:
        """Use a dedicated result backend when configured, otherwise the runtime Redis."""
        return self.celery_result_backend or self.redis_url

    def oauth_provider(self, name: str) -> OAuthProviderSettings | None:
        provider = name.lower().strip()
        safe_name = provider.upper().replace("-", "_")
        if not safe_name.replace("_", "").isalnum():
            return None
        # GitHub is not a consumer sign-in option outside local development/test.
        if provider in DEVELOPMENT_ONLY_OAUTH_PROVIDERS and self.environment not in {
            "development",
            "test",
        }:
            return None
        prefix = f"OAUTH_{safe_name}_"
        dotenv_path = find_dotenv(usecwd=True)
        file_values = dotenv_values(dotenv_path) if dotenv_path else {}

        def first_configured(*keys: str) -> str | None:
            from app.owner_config_store import owner_config_store

            for key in keys:
                value = os.getenv(key)
                if value is None:
                    value = file_values.get(key)
                if value is None:
                    value = owner_config_store.get(key)
                if value is not None and str(value).strip():
                    return str(value).strip()
            return None

        def configured_value(suffix: str) -> str | None:
            return first_configured(prefix + suffix)

        client_id = first_configured(
            prefix + "CLIENT_ID",
            f"{safe_name}_CLIENT_ID",
            f"AUTH_{safe_name}_ID",
            f"AUTH_{safe_name}_CLIENT_ID",
        )
        client_secret = first_configured(
            prefix + "CLIENT_SECRET",
            f"{safe_name}_CLIENT_SECRET",
            f"AUTH_{safe_name}_SECRET",
            f"AUTH_{safe_name}_CLIENT_SECRET",
        )
        discovery_url = configured_value("DISCOVERY_URL") or OAUTH_DEFAULT_DISCOVERY.get(
            provider
        )
        redirect_uri = configured_value("REDIRECT_URI") or (
            f"{self.web_base_url.rstrip('/')}/v1/auth/oauth/{provider}/callback"
        )
        scopes = (
            configured_value("SCOPES")
            or OAUTH_DEFAULT_SCOPES.get(provider)
            or "openid email profile"
        )
        if not client_id or not client_secret or not discovery_url or not redirect_uri:
            return None
        if self._is_placeholder_oauth_value(client_id) or self._is_placeholder_oauth_value(
            client_secret
        ):
            return None
        if self.environment in {"production", "staging"} and not redirect_uri.startswith(
            "https://"
        ):
            return None
        return OAuthProviderSettings(
            name=provider,
            client_id=client_id,
            client_secret=SecretStr(client_secret),
            discovery_url=discovery_url,
            redirect_uri=redirect_uri,
            scopes=scopes,
        )

    @staticmethod
    def _is_placeholder_oauth_value(value: str) -> bool:
        lowered = value.strip().lower()
        markers = (
            "changeme",
            "change_me",
            "change-me",
            "your_",
            "todo",
            "placeholder",
            "example",
            "xxxx",
            "replace_me",
            "replace-me",
        )
        return any(marker in lowered for marker in markers)

    def test_stand_oauth_enabled(self, name: str) -> bool:
        """True when the public stand may synthesize this consumer OAuth IdP."""
        return self.is_public_test_stand and name.lower().strip() in TEST_STAND_OAUTH_PROVIDERS

    def auth_methods(self) -> dict[str, bool]:
        from app.sms import sms_configured

        email_otp = self.smtp_configured or self.test_stand_auto_verify_email
        return {
            "phone": sms_configured(self),
            "email": True,
            "email_password": True,
            "email_otp": email_otp,
            "tiktok": False,
            "facebook": False,
            "google": self.oauth_provider("google") is not None,
            "apple": self.oauth_provider("apple") is not None,
        }


@lru_cache
def get_settings() -> Settings:
    # BaseSettings obtains required values from the environment at runtime.
    return Settings()
