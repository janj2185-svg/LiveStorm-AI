from __future__ import annotations

import base64
import os
from functools import lru_cache
from typing import Literal

from dotenv import dotenv_values, find_dotenv
from pydantic import BaseModel, EmailStr, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class OAuthProviderSettings(BaseModel):
    name: str
    client_id: str
    client_secret: SecretStr
    discovery_url: str
    redirect_uri: str
    scopes: str = "openid email profile"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "test", "production"] = "development"
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
    data_encryption_key: SecretStr

    cors_origins: list[str] = Field(default_factory=list)
    allowed_hosts: list[str] = Field(default_factory=lambda: ["localhost", "127.0.0.1"])
    max_body_bytes: int = Field(default=1_048_576, ge=16_384, le=10_485_760)
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
    ai_rate_window_seconds: int = Field(default=60, ge=10, le=3600)
    ai_chat_rate_limit: int = Field(default=30, ge=1, le=1000)
    ai_generation_rate_limit: int = Field(default=10, ge=1, le=1000)
    ai_tool_rate_limit: int = Field(default=30, ge=1, le=1000)
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
    live_obs_allowed_hosts: list[str] = Field(
        default_factory=lambda: ["127.0.0.1", "::1", "localhost"]
    )
    live_plugin_allowed_hosts: list[str] = Field(default_factory=list)
    live_plugin_signing_keys: dict[str, str] = Field(default_factory=dict)

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
        if (
            self.mediamtx_control_url
            and self.environment == "production"
            and not self.mediamtx_control_url.startswith("https://")
        ):
            raise ValueError("production MEDIAMTX_CONTROL_URL must use HTTPS")
        for redirect_uri in (self.youtube_redirect_uri, self.twitch_redirect_uri):
            if (
                redirect_uri
                and self.environment == "production"
                and not redirect_uri.startswith("https://")
            ):
                raise ValueError("production live OAuth redirect URIs must use HTTPS")

        if self.environment == "production":
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
        elif not self.database_url.startswith(("postgresql+asyncpg://", "sqlite+aiosqlite://")):
            raise ValueError("DATABASE_URL must use PostgreSQL with asyncpg (or SQLite in tests)")

        if self.environment != "test" and self.database_url.startswith("sqlite"):
            raise ValueError("SQLite is permitted only when ENVIRONMENT=test")
        return self

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

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
        safe_name = name.upper().replace("-", "_")
        if not safe_name.replace("_", "").isalnum():
            return None
        prefix = f"OAUTH_{safe_name}_"
        dotenv_path = find_dotenv(usecwd=True)
        file_values = dotenv_values(dotenv_path) if dotenv_path else {}

        def configured_value(suffix: str) -> str | None:
            value = os.getenv(prefix + suffix)
            if value is None:
                value = file_values.get(prefix + suffix)
            return str(value) if value else None

        values = {
            "client_id": configured_value("CLIENT_ID"),
            "client_secret": configured_value("CLIENT_SECRET"),
            "discovery_url": configured_value("DISCOVERY_URL"),
            "redirect_uri": configured_value("REDIRECT_URI"),
        }
        if not all(values.values()):
            return None
        return OAuthProviderSettings(
            name=name.lower(),
            client_id=str(values["client_id"]),
            client_secret=SecretStr(str(values["client_secret"])),
            discovery_url=str(values["discovery_url"]),
            redirect_uri=str(values["redirect_uri"]),
            scopes=configured_value("SCOPES") or "openid email profile",
        )


@lru_cache
def get_settings() -> Settings:
    # BaseSettings obtains required values from the environment at runtime.
    return Settings()
