"""Periodic health checks, expired-key detection, and owner alerts."""

from __future__ import annotations

import time
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_system_audit_event
from app.config import Settings
from app.models import EmailOutbox, Role, User, UserRole, UserStatus
from app.owner_config_catalog import get_provider_spec
from app.owner_config_models import (
    OwnerAlertSeverity,
    OwnerConfigAlert,
    OwnerServiceCredential,
    OwnerServiceHealthCheck,
    OwnerServiceStatus,
)
from app.owner_config_profiles import normalize_profile
from app.owner_config_service import (
    apply_values_to_runtime,
    decrypt_record_secrets,
    effective_settings,
)
from app.owner_config_validators import OwnerValidationError, test_provider_connection
from app.security import utcnow

EXPIRED_MARKERS = (
    "expired",
    "invalid_api_key",
    "authentication",
    "unauthorized",
    "revoked",
    "invalid api key",
    "api key is invalid",
    "401",
    "403",
)


def classify_failure(message: str) -> OwnerServiceStatus:
    lowered = message.lower()
    if any(marker in lowered for marker in EXPIRED_MARKERS):
        return OwnerServiceStatus.expired
    return OwnerServiceStatus.invalid


async def _owner_recipient_emails(db: AsyncSession) -> list[str]:
    rows = (
        await db.execute(
            select(User.email)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(
                Role.name.in_(("owner", "admin")),
                User.status == UserStatus.active,
                User.email.is_not(None),
                User.deleted_at.is_(None),
            )
            .distinct()
        )
    ).all()
    return [email for (email,) in rows if email]


async def _enqueue_alert_email(
    db: AsyncSession,
    *,
    title: str,
    body: str,
) -> int:
    recipients = await _owner_recipient_emails(db)
    for recipient in recipients:
        db.add(
            EmailOutbox(
                message_type="owner_config_alert",
                recipient=recipient,
                subject=f"[SYLORA] {title}",
                text_body=body,
                html_body=f"<h2>{title}</h2><p>{body}</p>",
            )
        )
    return len(recipients)


async def create_alert(
    db: AsyncSession,
    *,
    provider_key: str,
    environment: str,
    severity: OwnerAlertSeverity,
    title: str,
    message: str,
    notify: bool = True,
) -> OwnerConfigAlert:
    alert = OwnerConfigAlert(
        provider_key=provider_key,
        environment=environment,
        severity=severity,
        title=title,
        message=message[:2000],
    )
    db.add(alert)
    add_system_audit_event(
        db,
        "owner.config_alert",
        metadata={
            "provider_key": provider_key,
            "environment": environment,
            "severity": severity.value,
            "title": title,
        },
    )
    if notify:
        await _enqueue_alert_email(db, title=title, body=message)
    return alert


async def probe_provider(
    db: AsyncSession,
    settings: Settings,
    record: OwnerServiceCredential,
) -> OwnerServiceHealthCheck:
    spec = get_provider_spec(record.provider_key)
    started = time.perf_counter()
    secrets = decrypt_record_secrets(record, settings)
    public = {str(k): str(v) for k, v in (record.public_config or {}).items()}
    values = {**public, **secrets}
    if spec is not None:
        for field in spec.fields:
            if field.key not in values and field.default is not None:
                values[field.key] = field.default

    ok = False
    status = OwnerServiceStatus.invalid
    message = "Provider not configured"
    details: dict[str, Any] = {}

    if not values or (spec is None):
        message = "Missing credentials"
        status = OwnerServiceStatus.missing
    elif spec is not None and not spec.supports_live_test:
        ok = True
        status = OwnerServiceStatus.connected
        message = "Format-only provider (skipped live probe)"
        details = {"skipped_live": True}
    else:
        try:
            details = await test_provider_connection(record.provider_key, values)
            ok = True
            status = OwnerServiceStatus.connected
            message = str(details.get("message") or "Connected")
        except OwnerValidationError as exc:
            message = str(exc)
            status = classify_failure(message)
            details = exc.details
        except Exception as exc:  # noqa: BLE001
            message = f"Health probe failed: {exc}"
            status = classify_failure(message)

    latency_ms = int((time.perf_counter() - started) * 1000)
    prior_status = record.status
    check = OwnerServiceHealthCheck(
        provider_key=record.provider_key,
        environment=record.environment,
        ok=ok,
        status=status.value,
        message=message[:1000],
        latency_ms=latency_ms,
        details=details if isinstance(details, dict) else {},
    )
    db.add(check)

    record.last_tested_at = utcnow()
    record.last_error = None if ok else message[:1000]
    record.status = status
    if ok:
        record.last_success_at = utcnow()
        record.consecutive_failures = 0
        record.enabled = True
        if record.rotation_in_progress:
            record.previous_encrypted_secrets = None
            record.rotation_in_progress = False
        if spec is not None:
            apply_values_to_runtime(spec, values, enabled=True, status=status.value)
    else:
        record.consecutive_failures = int(record.consecutive_failures or 0) + 1
        if record.consecutive_failures >= 2:
            record.enabled = False
        # Zero-downtime: if rotation failed, keep previous secrets as active
        if record.rotation_in_progress and record.previous_encrypted_secrets:
            record.encrypted_secrets = record.previous_encrypted_secrets
            record.previous_encrypted_secrets = None
            record.rotation_in_progress = False
            record.status = OwnerServiceStatus.connected
            record.enabled = True
            message = f"Rotation rolled back — previous key restored. Probe error: {message}"
            check.message = message[:1000]
            check.ok = False
            check.status = OwnerServiceStatus.invalid.value

    # Alert on transition to failure / expiry / recovery
    if not ok and prior_status == OwnerServiceStatus.connected:
        severity = (
            OwnerAlertSeverity.critical
            if status == OwnerServiceStatus.expired
            else OwnerAlertSeverity.warning
        )
        title = (
            f"{record.provider_key} API key expired/revoked"
            if status == OwnerServiceStatus.expired
            else f"{record.provider_key} stopped working"
        )
        await create_alert(
            db,
            provider_key=record.provider_key,
            environment=record.environment,
            severity=severity,
            title=title,
            message=message,
        )
    elif ok and prior_status in {
        OwnerServiceStatus.invalid,
        OwnerServiceStatus.expired,
    }:
        await create_alert(
            db,
            provider_key=record.provider_key,
            environment=record.environment,
            severity=OwnerAlertSeverity.info,
            title=f"{record.provider_key} recovered",
            message=message,
            notify=True,
        )

    # Soft expiry warning from stored key_expires_at
    if record.key_expires_at and record.key_expires_at <= utcnow() and ok:
        record.status = OwnerServiceStatus.expired
        await create_alert(
            db,
            provider_key=record.provider_key,
            environment=record.environment,
            severity=OwnerAlertSeverity.critical,
            title=f"{record.provider_key} key past expiry date",
            message=f"Configured key_expires_at={record.key_expires_at.isoformat()} — rotate now.",
        )

    add_system_audit_event(
        db,
        "owner.config_health_probe",
        metadata={
            "provider_key": record.provider_key,
            "environment": record.environment,
            "ok": ok,
            "status": record.status.value,
            "latency_ms": latency_ms,
        },
    )
    return check


async def run_health_checks(
    db: AsyncSession,
    settings: Settings,
    *,
    environment: str | None = None,
) -> dict[str, Any]:
    profile = normalize_profile(environment, settings.environment)
    records = (
        await db.scalars(
            select(OwnerServiceCredential).where(
                OwnerServiceCredential.environment == profile,
                OwnerServiceCredential.encrypted_secrets.is_not(None),
            )
        )
    ).all()
    results: list[dict[str, Any]] = []
    for record in records:
        check = await probe_provider(db, settings, record)
        results.append(
            {
                "provider_key": record.provider_key,
                "ok": check.ok,
                "status": check.status,
                "message": check.message,
                "latency_ms": check.latency_ms,
            }
        )
    await db.commit()
    return {
        "environment": profile,
        "checked": len(results),
        "failed": sum(1 for item in results if not item["ok"]),
        "results": results,
        "settings_overlay_ready": True,
        "effective_smtp": effective_settings(settings).smtp_configured,
    }
