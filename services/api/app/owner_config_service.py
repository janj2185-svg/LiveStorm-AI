"""Owner Configuration service — encrypt, validate, apply, export."""

from __future__ import annotations

import json
import uuid
from typing import Any
from urllib.parse import urlparse

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import AICapability, AIProviderConfiguration
from app.audit import add_audit_event
from app.business_models import FeatureFlag
from app.config import Settings
from app.owner_config_catalog import (
    OWNER_PROVIDERS,
    OwnerProviderSpec,
    get_provider_spec,
)
from app.owner_config_models import OwnerServiceCredential, OwnerServiceStatus
from app.owner_config_schemas import (
    OwnerCatalogResponse,
    OwnerConnectionTestResult,
    OwnerEnvExportResponse,
    OwnerEnvFile,
    OwnerFieldDescriptor,
    OwnerProviderSummary,
)
from app.owner_config_store import owner_config_store
from app.owner_config_validators import (
    OwnerValidationError,
    test_provider_connection,
    validate_field_shapes,
)
from app.security import decrypt_secret, encrypt_secret, utcnow


def _domain_from_settings(settings: Settings) -> str:
    parsed = urlparse(settings.web_base_url)
    return parsed.netloc or settings.web_base_url.replace("https://", "").replace("http://", "")


def _format_urls(urls: tuple[str, ...], domain: str) -> list[str]:
    return [url.format(domain=domain) for url in urls]


def _merge_values(
    spec: OwnerProviderSpec,
    incoming: dict[str, Any],
    existing_secrets: dict[str, str],
    existing_public: dict[str, str],
) -> dict[str, str]:
    merged: dict[str, str] = {}
    for field in spec.fields:
        raw = incoming.get(field.key, None)
        if raw is None or (isinstance(raw, str) and raw.strip() == ""):
            if field.secret and field.key in existing_secrets:
                merged[field.key] = existing_secrets[field.key]
            elif not field.secret and field.key in existing_public:
                merged[field.key] = existing_public[field.key]
            elif field.default is not None:
                merged[field.key] = str(field.default)
            continue
        if isinstance(raw, (dict, list)):
            merged[field.key] = json.dumps(raw, separators=(",", ":"), sort_keys=True)
        elif isinstance(raw, bool):
            merged[field.key] = "true" if raw else "false"
        else:
            merged[field.key] = str(raw).strip()
    return merged


def _split_public_secret(
    spec: OwnerProviderSpec, values: dict[str, str]
) -> tuple[dict[str, str], dict[str, str]]:
    public: dict[str, str] = {}
    secrets: dict[str, str] = {}
    for field in spec.fields:
        if field.key not in values:
            continue
        if field.secret:
            secrets[field.key] = values[field.key]
        else:
            public[field.key] = values[field.key]
    return public, secrets


def _values_to_env(spec: OwnerProviderSpec, values: dict[str, str]) -> dict[str, str]:
    env: dict[str, str] = {}
    for field in spec.fields:
        if field.key in values and values[field.key] != "":
            env[field.env_var] = values[field.key]
    return env


def decrypt_record_secrets(
    record: OwnerServiceCredential | None, settings: Settings
) -> dict[str, str]:
    if record is None or not record.encrypted_secrets:
        return {}
    raw = decrypt_secret(record.encrypted_secrets, settings)
    data = json.loads(raw)
    if not isinstance(data, dict):
        return {}
    return {str(k): str(v) for k, v in data.items()}


def build_provider_summary(
    spec: OwnerProviderSpec,
    record: OwnerServiceCredential | None,
    *,
    domain: str,
    secret_keys: set[str] | None = None,
) -> OwnerProviderSummary:
    public = dict(record.public_config or {}) if record else {}
    configured_secrets = secret_keys or set()
    if record and record.encrypted_secrets:
        # We don't decrypt for list views — mark secrets configured via encrypted blob.
        configured_secrets = {f.key for f in spec.fields if f.secret} if record.encrypted_secrets else set()
    status = (
        OwnerServiceStatus(record.status)
        if record
        else OwnerServiceStatus.missing
    )
    fields: list[OwnerFieldDescriptor] = []
    for field in spec.fields:
        configured = (
            field.key in configured_secrets
            if field.secret
            else bool(str(public.get(field.key, "")).strip() or field.default)
        )
        if record and field.secret and record.encrypted_secrets:
            configured = True
        fields.append(
            OwnerFieldDescriptor(
                key=field.key,
                label=field.label,
                env_var=field.env_var,
                secret=field.secret,
                required=field.required,
                kind=field.kind,
                placeholder=field.placeholder,
                help_text=field.help_text,
                default=field.default,
                configured=configured,
                public_value=None if field.secret else public.get(field.key, field.default),
            )
        )
    return OwnerProviderSummary(
        key=spec.key,
        name=spec.name,
        category=spec.category,
        description=spec.description,
        status=status.value,  # type: ignore[arg-type]
        enabled=bool(record.enabled) if record else False,
        feature_flag_key=spec.feature_flag_key,
        related_features=list(spec.related_features),
        supports_live_test=spec.supports_live_test,
        version=record.version if record else None,
        last_tested_at=record.last_tested_at if record else None,
        last_error=record.last_error if record else None,
        setup_instructions=list(spec.setup_instructions),
        callback_urls=_format_urls(spec.callback_urls, domain),
        webhook_urls=_format_urls(spec.webhook_urls, domain),
        dns_requirements=list(spec.dns_requirements),
        fields=fields,
        record_id=record.id if record else None,
    )


async def list_catalog(
    db: AsyncSession, settings: Settings
) -> OwnerCatalogResponse:
    domain = _domain_from_settings(settings)
    records = (
        await db.scalars(select(OwnerServiceCredential).order_by(OwnerServiceCredential.provider_key))
    ).all()
    by_key = {item.provider_key: item for item in records}
    providers = [
        build_provider_summary(spec, by_key.get(spec.key), domain=domain)
        for spec in OWNER_PROVIDERS
    ]
    return OwnerCatalogResponse(
        domain=domain,
        providers=providers,
        connected_count=sum(1 for item in providers if item.status == "connected"),
        missing_count=sum(1 for item in providers if item.status == "missing"),
        invalid_count=sum(1 for item in providers if item.status == "invalid"),
    )


async def _ensure_feature_flag(
    db: AsyncSession,
    *,
    key: str,
    enabled: bool,
    actor_id: uuid.UUID | None,
) -> None:
    flag = await db.scalar(select(FeatureFlag).where(FeatureFlag.key == key))
    if flag is None:
        db.add(
            FeatureFlag(
                key=key,
                environments=["production", "staging", "development"],
                enabled=enabled,
                rollout_bps=10_000 if enabled else 0,
                allow_subjects=[],
                deny_subjects=[],
                version=1,
                created_by_id=actor_id,
                updated_by_id=actor_id,
            )
        )
        return
    flag.enabled = enabled
    flag.rollout_bps = 10_000 if enabled else 0
    flag.version += 1
    flag.updated_by_id = actor_id


async def _sync_openai_provider(
    db: AsyncSession,
    settings: Settings,
    values: dict[str, str],
    *,
    enabled: bool,
    actor_id: uuid.UUID | None,
) -> None:
    api_key = values.get("api_key")
    if not api_key:
        return
    base_url = (values.get("base_url") or "https://api.openai.com/v1").rstrip("/")
    chat_model = values.get("chat_model") or "gpt-4o-mini"
    embedding_model = values.get("embedding_model") or "text-embedding-3-small"
    record = await db.scalar(
        select(AIProviderConfiguration).where(AIProviderConfiguration.name == "openai")
    )
    capabilities = [
        AICapability.chat.value,
        AICapability.embeddings.value,
        AICapability.moderation.value,
        AICapability.voice.value,
        AICapability.image.value,
    ]
    model_mapping = {
        AICapability.chat.value: chat_model,
        AICapability.embeddings.value: embedding_model,
        AICapability.moderation.value: "omni-moderation-latest",
        AICapability.voice.value: "gpt-4o-mini-tts",
        AICapability.image.value: "gpt-image-1",
    }
    if record is None:
        db.add(
            AIProviderConfiguration(
                name="openai",
                base_url=base_url,
                encrypted_api_credential=encrypt_secret(api_key, settings),
                enabled=enabled,
                capabilities=capabilities,
                model_mapping=model_mapping,
                pricing_config={},
                created_by_id=actor_id,
                updated_by_id=actor_id,
            )
        )
        return
    record.base_url = base_url
    record.encrypted_api_credential = encrypt_secret(api_key, settings)
    record.enabled = enabled
    record.capabilities = capabilities
    record.model_mapping = model_mapping
    record.updated_by_id = actor_id


def apply_values_to_runtime(spec: OwnerProviderSpec, values: dict[str, str], *, enabled: bool, status: str) -> None:
    owner_config_store.put_env(_values_to_env(spec, values))
    owner_config_store.set_provider_state(spec.key, enabled=enabled, status=status)


async def load_all_into_runtime(db: AsyncSession, settings: Settings) -> None:
    owner_config_store.clear()
    records = (await db.scalars(select(OwnerServiceCredential))).all()
    for record in records:
        spec = get_provider_spec(record.provider_key)
        if spec is None:
            continue
        secrets = decrypt_record_secrets(record, settings)
        public = {str(k): str(v) for k, v in (record.public_config or {}).items()}
        values = {**public, **secrets}
        # fill defaults
        for field in spec.fields:
            if field.key not in values and field.default is not None:
                values[field.key] = field.default
        apply_values_to_runtime(
            spec,
            values,
            enabled=bool(record.enabled),
            status=record.status.value if hasattr(record.status, "value") else str(record.status),
        )


def effective_settings(base: Settings) -> Settings:
    return owner_config_store.apply_settings_overlay(base)


async def upsert_provider(
    db: AsyncSession,
    settings: Settings,
    request: Request,
    *,
    provider_key: str,
    incoming: dict[str, Any],
    expected_version: int | None,
    actor_id: uuid.UUID,
    test_connection: bool = True,
    enable_on_success: bool = True,
) -> tuple[OwnerProviderSummary, OwnerConnectionTestResult | None]:
    spec = get_provider_spec(provider_key)
    if spec is None:
        raise OwnerValidationError(f"Unknown provider: {provider_key}")

    record = await db.scalar(
        select(OwnerServiceCredential)
        .where(OwnerServiceCredential.provider_key == spec.key)
        .with_for_update()
    )
    existing_secrets = decrypt_record_secrets(record, settings)
    existing_public = {str(k): str(v) for k, v in (record.public_config or {}).items()} if record else {}
    if record is not None and expected_version is not None and expected_version != record.version:
        raise OwnerValidationError(
            "Version conflict — reload the provider before saving",
            details={"current_version": record.version},
        )

    values = _merge_values(spec, incoming, existing_secrets, existing_public)
    # Ensure required non-secret / secret present after merge
    for field in spec.fields:
        if not field.required:
            continue
        if field.default is not None and field.key not in values:
            values[field.key] = field.default
        if field.key not in values or not str(values[field.key]).strip():
            raise OwnerValidationError(f"{field.label} is required")

    validate_field_shapes(spec, values)

    test_result: OwnerConnectionTestResult | None = None
    status = OwnerServiceStatus.invalid
    enabled = False
    last_error: str | None = None
    details: dict[str, Any] = {}
    message = "Saved without live test"

    if test_connection and spec.supports_live_test:
        try:
            details = await test_provider_connection(spec.key, values)
            status = OwnerServiceStatus.connected
            message = str(details.get("message") or "Connected")
            enabled = enable_on_success
        except OwnerValidationError as exc:
            status = OwnerServiceStatus.invalid
            last_error = str(exc)
            message = str(exc)
            details = exc.details
            enabled = False
        except Exception as exc:  # noqa: BLE001
            status = OwnerServiceStatus.invalid
            last_error = str(exc)[:1000]
            message = f"Connection test failed: {exc}"
            enabled = False
    elif not spec.supports_live_test:
        status = OwnerServiceStatus.connected
        message = "Stored (format validation only)"
        enabled = enable_on_success
        details = {"ok": True}
    else:
        status = OwnerServiceStatus.connected if values else OwnerServiceStatus.missing
        enabled = False

    public, secrets = _split_public_secret(spec, values)
    encrypted = (
        encrypt_secret(json.dumps(secrets, separators=(",", ":"), sort_keys=True), settings)
        if secrets
        else None
    )
    now = utcnow()
    if record is None:
        record = OwnerServiceCredential(
            provider_key=spec.key,
            category=spec.category,
            public_config=public,
            encrypted_secrets=encrypted,
            status=status,
            enabled=enabled,
            last_tested_at=now if test_connection else None,
            last_error=last_error,
            feature_flag_key=spec.feature_flag_key,
            version=1,
            created_by_id=actor_id,
            updated_by_id=actor_id,
        )
        db.add(record)
    else:
        record.public_config = public
        record.encrypted_secrets = encrypted
        record.status = status
        record.enabled = enabled
        record.last_tested_at = now if test_connection else record.last_tested_at
        record.last_error = last_error
        record.feature_flag_key = spec.feature_flag_key
        record.version += 1
        record.updated_by_id = actor_id
        record.category = spec.category

    await _ensure_feature_flag(
        db, key=spec.feature_flag_key, enabled=enabled and status == OwnerServiceStatus.connected, actor_id=actor_id
    )
    if spec.key == "openai":
        await _sync_openai_provider(
            db,
            settings,
            values,
            enabled=enabled and status == OwnerServiceStatus.connected,
            actor_id=actor_id,
        )

    add_audit_event(
        db,
        request,
        settings,
        "owner.config_upserted",
        actor_user_id=actor_id,
        metadata={
            "provider_key": spec.key,
            "status": status.value,
            "enabled": enabled,
            "version": record.version,
            "tested": test_connection,
        },
    )
    await db.commit()
    await db.refresh(record)

    apply_values_to_runtime(spec, values, enabled=enabled, status=status.value)
    # Refresh AI registry when OpenAI synced
    if spec.key == "openai" and hasattr(request.app.state, "ai_provider_registry"):
        await request.app.state.ai_provider_registry.refresh_from_database(db, settings)
    # Hot-apply settings overlay on app state + rebuild dependent adapters
    if hasattr(request.app.state, "settings"):
        overlaid = effective_settings(
            getattr(request.app.state, "base_settings", None) or settings
        )
        request.app.state.settings = overlaid
        if spec.key == "stripe":
            from app.payments import configured_payment_provider

            request.app.state.payment_provider = configured_payment_provider(overlaid)
        if spec.key == "s3":
            from app.storage import S3ObjectStorage

            request.app.state.object_storage = S3ObjectStorage(overlaid)
        if spec.key == "fcm":
            from app.push_service import configured_push_dispatcher

            request.app.state.push_dispatcher = configured_push_dispatcher(overlaid)

    summary = build_provider_summary(spec, record, domain=_domain_from_settings(settings))
    test_result = OwnerConnectionTestResult(
        provider_key=spec.key,
        status=status.value,  # type: ignore[arg-type]
        ok=status == OwnerServiceStatus.connected,
        message=message,
        details={k: v for k, v in details.items() if k != "ok"} if isinstance(details, dict) else {},
        enabled=enabled,
        tested_at=now,
    )
    return summary, test_result


async def run_connection_test(
    db: AsyncSession,
    settings: Settings,
    request: Request,
    *,
    provider_key: str,
    actor_id: uuid.UUID,
    enable_on_success: bool = True,
) -> OwnerConnectionTestResult:
    spec = get_provider_spec(provider_key)
    if spec is None:
        raise OwnerValidationError(f"Unknown provider: {provider_key}")
    record = await db.scalar(
        select(OwnerServiceCredential).where(OwnerServiceCredential.provider_key == spec.key)
    )
    if record is None or (not record.encrypted_secrets and not record.public_config):
        raise OwnerValidationError("Save credentials before testing this provider")
    secrets = decrypt_record_secrets(record, settings)
    public = {str(k): str(v) for k, v in (record.public_config or {}).items()}
    values = {**public, **secrets}
    for field in spec.fields:
        if field.key not in values and field.default is not None:
            values[field.key] = field.default

    now = utcnow()
    try:
        if not spec.supports_live_test:
            details = {"ok": True, "message": "Format-only provider"}
        else:
            details = await test_provider_connection(spec.key, values)
        status = OwnerServiceStatus.connected
        message = str(details.get("message") or "Connected")
        enabled = enable_on_success
        last_error = None
    except OwnerValidationError as exc:
        status = OwnerServiceStatus.invalid
        message = str(exc)
        details = exc.details
        enabled = False
        last_error = str(exc)[:1000]
    except Exception as exc:  # noqa: BLE001
        status = OwnerServiceStatus.invalid
        message = f"Connection test failed: {exc}"
        details = {}
        enabled = False
        last_error = str(exc)[:1000]

    record.status = status
    record.enabled = enabled
    record.last_tested_at = now
    record.last_error = last_error
    record.version += 1
    record.updated_by_id = actor_id
    await _ensure_feature_flag(
        db,
        key=spec.feature_flag_key,
        enabled=enabled and status == OwnerServiceStatus.connected,
        actor_id=actor_id,
    )
    if spec.key == "openai" and status == OwnerServiceStatus.connected:
        await _sync_openai_provider(db, settings, values, enabled=enabled, actor_id=actor_id)

    add_audit_event(
        db,
        request,
        settings,
        "owner.config_tested",
        actor_user_id=actor_id,
        metadata={"provider_key": spec.key, "status": status.value, "enabled": enabled},
    )
    await db.commit()
    apply_values_to_runtime(spec, values, enabled=enabled, status=status.value)
    if spec.key == "openai" and hasattr(request.app.state, "ai_provider_registry"):
        await request.app.state.ai_provider_registry.refresh_from_database(db, settings)
    if hasattr(request.app.state, "settings"):
        overlaid = effective_settings(
            getattr(request.app.state, "base_settings", None) or settings
        )
        request.app.state.settings = overlaid
        if spec.key == "stripe":
            from app.payments import configured_payment_provider

            request.app.state.payment_provider = configured_payment_provider(overlaid)
        if spec.key == "s3":
            from app.storage import S3ObjectStorage

            request.app.state.object_storage = S3ObjectStorage(overlaid)
        if spec.key == "fcm":
            from app.push_service import configured_push_dispatcher

            request.app.state.push_dispatcher = configured_push_dispatcher(overlaid)

    return OwnerConnectionTestResult(
        provider_key=spec.key,
        status=status.value,  # type: ignore[arg-type]
        ok=status == OwnerServiceStatus.connected,
        message=message,
        details={k: v for k, v in details.items() if k != "ok"} if isinstance(details, dict) else {},
        enabled=enabled,
        tested_at=now,
    )


async def export_env_files(db: AsyncSession, settings: Settings) -> OwnerEnvExportResponse:
    records = (await db.scalars(select(OwnerServiceCredential))).all()
    by_key = {item.provider_key: item for item in records}
    lines_prod: list[str] = [
        "# SYLORA owner-generated production env fragment",
        "# Generated by Owner Configuration — DO NOT COMMIT",
        f"# domain={_domain_from_settings(settings)}",
        "",
    ]
    lines_api: list[str] = [
        "# SYLORA API owner-generated env fragment",
        "# Generated by Owner Configuration — DO NOT COMMIT",
        "",
    ]
    for spec in OWNER_PROVIDERS:
        record = by_key.get(spec.key)
        lines_prod.append(f"# --- {spec.name} ({spec.key}) ---")
        lines_api.append(f"# --- {spec.name} ({spec.key}) ---")
        if record is None:
            for field in spec.fields:
                default = field.default or ""
                lines_prod.append(f"{field.env_var}={default}")
                lines_api.append(f"{field.env_var}={default}")
            lines_prod.append("")
            lines_api.append("")
            continue
        secrets = decrypt_record_secrets(record, settings)
        public = {str(k): str(v) for k, v in (record.public_config or {}).items()}
        values = {**public, **secrets}
        for field in spec.fields:
            value = values.get(field.key, field.default or "")
            lines_prod.append(f"{field.env_var}={value}")
            lines_api.append(f"{field.env_var}={value}")
        # convenience flags
        if spec.key == "stripe" and values:
            lines_prod.append("PAYMENT_PROVIDER=stripe")
            lines_api.append("PAYMENT_PROVIDER=stripe")
        if spec.key == "fcm" and values:
            lines_prod.append("PUSH_ENABLED=true")
            lines_api.append("PUSH_ENABLED=true")
        lines_prod.append("")
        lines_api.append("")

    return OwnerEnvExportResponse(
        generated_at=utcnow(),
        files=[
            OwnerEnvFile(
                filename="infrastructure/production/.env.owner-services",
                description="Production Compose fragment for third-party services",
                content="\n".join(lines_prod).rstrip() + "\n",
            ),
            OwnerEnvFile(
                filename="services/api/.env.owner-services",
                description="API process fragment for local/staging overlays",
                content="\n".join(lines_api).rstrip() + "\n",
            ),
        ],
    )
