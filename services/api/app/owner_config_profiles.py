"""Environment profiles and deploy-readiness rules for owner config."""

from __future__ import annotations

from app.owner_config_models import OwnerEnvironmentProfile

# Providers that must be Connected before a profile may deploy.
REQUIRED_PROVIDERS: dict[str, tuple[str, ...]] = {
    OwnerEnvironmentProfile.development.value: (),
    OwnerEnvironmentProfile.staging.value: ("smtp",),
    OwnerEnvironmentProfile.production.value: ("smtp", "s3"),
}

# Strongly recommended; deploy readiness reports warnings when missing.
RECOMMENDED_PROVIDERS: dict[str, tuple[str, ...]] = {
    OwnerEnvironmentProfile.development.value: ("openai",),
    OwnerEnvironmentProfile.staging.value: ("openai", "s3", "sentry"),
    OwnerEnvironmentProfile.production.value: (
        "openai",
        "stripe",
        "fcm",
        "sentry",
        "google_oauth",
    ),
}


def normalize_profile(value: str | None, fallback: str) -> str:
    raw = (value or fallback or OwnerEnvironmentProfile.production.value).strip().lower()
    if raw in {"dev", "local"}:
        raw = OwnerEnvironmentProfile.development.value
    if raw not in {item.value for item in OwnerEnvironmentProfile}:
        return fallback if fallback in {item.value for item in OwnerEnvironmentProfile} else (
            OwnerEnvironmentProfile.production.value
        )
    return raw
