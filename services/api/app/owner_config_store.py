"""In-memory overlay of owner-configured env values (never logged)."""

from __future__ import annotations

import threading
from typing import Any


class OwnerConfigStore:
    """Process-local decrypted env overlay applied from encrypted DB credentials."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._env: dict[str, str] = {}
        self._enabled: dict[str, bool] = {}
        self._status: dict[str, str] = {}

    def clear(self) -> None:
        with self._lock:
            self._env.clear()
            self._enabled.clear()
            self._status.clear()

    def put_env(self, values: dict[str, str]) -> None:
        with self._lock:
            for key, value in values.items():
                if value is None:
                    continue
                text = str(value).strip()
                if text:
                    self._env[key] = text

    def set_provider_state(self, provider_key: str, *, enabled: bool, status: str) -> None:
        with self._lock:
            self._enabled[provider_key] = enabled
            self._status[provider_key] = status

    def get(self, key: str) -> str | None:
        with self._lock:
            value = self._env.get(key)
            return value if value else None

    def snapshot_env(self) -> dict[str, str]:
        with self._lock:
            return dict(self._env)

    def is_enabled(self, provider_key: str) -> bool:
        with self._lock:
            return bool(self._enabled.get(provider_key))

    def status(self, provider_key: str) -> str | None:
        with self._lock:
            return self._status.get(provider_key)

    def apply_settings_overlay(self, base: Any) -> Any:
        """Return a Settings copy with owner overlay applied for known fields."""
        env = self.snapshot_env()
        if not env:
            return base
        updates: dict[str, Any] = {}

        def secret(name: str) -> Any:
            from pydantic import SecretStr

            raw = env.get(name)
            return SecretStr(raw) if raw else None

        mapping = {
            "SMTP_HOST": ("smtp_host", False),
            "SMTP_PORT": ("smtp_port", "int"),
            "SMTP_FROM_EMAIL": ("smtp_from_email", False),
            "SMTP_FROM_NAME": ("smtp_from_name", False),
            "SMTP_START_TLS": ("smtp_start_tls", "bool"),
            "SMTP_USE_TLS": ("smtp_use_tls", "bool"),
            "SMTP_USERNAME": ("smtp_username", False),
            "SMTP_PASSWORD": ("smtp_password", "secret"),
            "STRIPE_SECRET_KEY": ("stripe_secret_key", "secret"),
            "STRIPE_PUBLISHABLE_KEY": ("stripe_publishable_key", False),
            "STRIPE_WEBHOOK_SECRET": ("stripe_webhook_secret", "secret"),
            "PAYMENT_PROVIDER": ("payment_provider", False),
            "S3_ENDPOINT_URL": ("s3_endpoint_url", False),
            "S3_BUCKET": ("s3_bucket", False),
            "S3_REGION": ("s3_region", False),
            "S3_ACCESS_KEY_ID": ("s3_access_key_id", False),
            "S3_SECRET_ACCESS_KEY": ("s3_secret_access_key", "secret"),
            "S3_PRESIGN_SECONDS": ("s3_presign_seconds", "int"),
            "FCM_PROJECT_ID": ("fcm_project_id", False),
            "FCM_SERVICE_ACCOUNT_JSON": ("fcm_service_account_json", "secret"),
            "PUSH_ENABLED": ("push_enabled", "bool"),
        }
        for env_key, (attr, kind) in mapping.items():
            if env_key not in env:
                continue
            raw = env[env_key]
            if kind == "secret":
                updates[attr] = secret(env_key)
            elif kind == "int":
                try:
                    updates[attr] = int(raw)
                except ValueError:
                    continue
            elif kind == "bool":
                updates[attr] = raw.lower() in {"1", "true", "yes", "on"}
            else:
                updates[attr] = raw
        if not updates:
            return base
        return base.model_copy(update=updates)


owner_config_store = OwnerConfigStore()
