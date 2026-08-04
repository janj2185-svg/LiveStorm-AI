"""Secure encrypted backup and restore of owner configuration."""

from __future__ import annotations

import json
import uuid
from typing import Any

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.owner_config_catalog import get_provider_spec
from app.owner_config_models import OwnerConfigBackup, OwnerServiceCredential, OwnerServiceStatus
from app.owner_config_profiles import normalize_profile
from app.owner_config_service import (
    apply_values_to_runtime,
    decrypt_record_secrets,
)
from app.security import decrypt_secret, encrypt_secret, utcnow


def _backup_envelope(
    *,
    environment: str,
    label: str,
    providers: list[dict[str, Any]],
) -> str:
    payload = {
        "format": "sylora.owner_config.backup.v1",
        "environment": environment,
        "label": label,
        "created_at": utcnow().isoformat(),
        "providers": providers,
    }
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


async def create_backup(
    db: AsyncSession,
    settings: Settings,
    request: Request,
    *,
    actor_id: uuid.UUID,
    environment: str | None = None,
    label: str | None = None,
) -> OwnerConfigBackup:
    profile = normalize_profile(environment, settings.environment)
    records = (
        await db.scalars(
            select(OwnerServiceCredential).where(
                OwnerServiceCredential.environment == profile
            )
        )
    ).all()
    providers: list[dict[str, Any]] = []
    for record in records:
        secrets = decrypt_record_secrets(record, settings)
        providers.append(
            {
                "provider_key": record.provider_key,
                "category": record.category,
                "public_config": record.public_config or {},
                "secrets": secrets,
                "status": record.status.value,
                "enabled": record.enabled,
                "feature_flag_key": record.feature_flag_key,
                "key_expires_at": (
                    record.key_expires_at.isoformat() if record.key_expires_at else None
                ),
            }
        )
    envelope = _backup_envelope(
        environment=profile,
        label=label or f"backup-{profile}-{utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        providers=providers,
    )
    backup = OwnerConfigBackup(
        environment=profile,
        label=label or f"backup-{profile}-{utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        encrypted_payload=encrypt_secret(envelope, settings),
        provider_count=len(providers),
        created_by_id=actor_id,
    )
    db.add(backup)
    add_audit_event(
        db,
        request,
        settings,
        "owner.config_backup_created",
        actor_user_id=actor_id,
        metadata={
            "backup_id": "pending",
            "environment": profile,
            "provider_count": len(providers),
        },
    )
    await db.commit()
    await db.refresh(backup)
    return backup


async def list_backups(
    db: AsyncSession, *, environment: str | None = None, settings: Settings
) -> list[OwnerConfigBackup]:
    profile = normalize_profile(environment, settings.environment)
    return list(
        (
            await db.scalars(
                select(OwnerConfigBackup)
                .where(OwnerConfigBackup.environment == profile)
                .order_by(OwnerConfigBackup.created_at.desc())
                .limit(50)
            )
        ).all()
    )


async def restore_backup(
    db: AsyncSession,
    settings: Settings,
    request: Request,
    *,
    backup_id: uuid.UUID,
    actor_id: uuid.UUID,
    rotate: bool = True,
) -> dict[str, Any]:
    backup = await db.get(OwnerConfigBackup, backup_id)
    if backup is None:
        raise ValueError("Backup not found")
    raw = decrypt_secret(backup.encrypted_payload, settings)
    payload = json.loads(raw)
    if payload.get("format") != "sylora.owner_config.backup.v1":
        raise ValueError("Unsupported backup format")
    providers = payload.get("providers") or []
    restored = 0
    for item in providers:
        if not isinstance(item, dict):
            continue
        key = str(item.get("provider_key") or "").strip()
        if not key:
            continue
        spec = get_provider_spec(key)
        record = await db.scalar(
            select(OwnerServiceCredential)
            .where(
                OwnerServiceCredential.provider_key == key,
                OwnerServiceCredential.environment == backup.environment,
            )
            .with_for_update()
        )
        secrets = item.get("secrets") or {}
        public = item.get("public_config") or {}
        encrypted = (
            encrypt_secret(json.dumps(secrets, separators=(",", ":"), sort_keys=True), settings)
            if secrets
            else None
        )
        if record is None:
            record = OwnerServiceCredential(
                provider_key=key,
                environment=backup.environment,
                category=(spec.category if spec else str(item.get("category") or "custom")),
                public_config=public,
                encrypted_secrets=encrypted,
                status=OwnerServiceStatus(str(item.get("status") or "missing")),
                enabled=bool(item.get("enabled")),
                feature_flag_key=item.get("feature_flag_key")
                or (spec.feature_flag_key if spec else None),
                version=1,
                created_by_id=actor_id,
                updated_by_id=actor_id,
            )
            db.add(record)
        else:
            if rotate and record.encrypted_secrets:
                record.previous_encrypted_secrets = record.encrypted_secrets
                record.rotation_in_progress = True
            record.public_config = public
            record.encrypted_secrets = encrypted
            record.status = OwnerServiceStatus(str(item.get("status") or record.status.value))
            record.enabled = bool(item.get("enabled"))
            record.version += 1
            record.updated_by_id = actor_id
        values = {**{str(k): str(v) for k, v in public.items()}, **{str(k): str(v) for k, v in secrets.items()}}
        if spec is not None:
            apply_values_to_runtime(
                spec,
                values,
                enabled=bool(item.get("enabled")),
                status=str(item.get("status") or "connected"),
            )
        restored += 1

    add_audit_event(
        db,
        request,
        settings,
        "owner.config_backup_restored",
        actor_user_id=actor_id,
        metadata={
            "backup_id": str(backup.id),
            "environment": backup.environment,
            "restored": restored,
            "rotate": rotate,
        },
    )
    await db.commit()
    return {
        "backup_id": str(backup.id),
        "environment": backup.environment,
        "restored": restored,
        "rotate": rotate,
    }


def downloadable_backup_blob(backup: OwnerConfigBackup) -> dict[str, str]:
    """Return ciphertext only — restore requires the same DATA_ENCRYPTION_KEY."""
    return {
        "id": str(backup.id),
        "environment": backup.environment,
        "label": backup.label,
        "created_at": backup.created_at.isoformat() if backup.created_at else "",
        "provider_count": str(backup.provider_count),
        "encrypted_payload": backup.encrypted_payload,
        "note": (
            "Ciphertext encrypted with deployment DATA_ENCRYPTION_KEY. "
            "Store offline; never commit."
        ),
    }
