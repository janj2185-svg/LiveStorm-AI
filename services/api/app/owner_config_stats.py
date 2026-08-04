"""Provider usage statistics for the Owner Configuration panel."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import AIUsageRecord
from app.config import Settings
from app.ledger_models import PaymentOperation, PaymentOperationStatus
from app.models import EmailOutbox
from app.owner_config_models import OwnerServiceCredential, OwnerServiceHealthCheck
from app.owner_config_profiles import normalize_profile
from app.security import utcnow
from app.storage import S3ObjectStorage


async def collect_usage_statistics(
    db: AsyncSession,
    settings: Settings,
    *,
    environment: str | None = None,
    hours: int = 24,
) -> dict[str, Any]:
    profile = normalize_profile(environment, settings.environment)
    since = utcnow() - timedelta(hours=max(1, min(hours, 24 * 30)))

    ai_row = (
        await db.execute(
            select(
                func.coalesce(func.sum(AIUsageRecord.prompt_units), 0),
                func.coalesce(func.sum(AIUsageRecord.completion_units), 0),
                func.coalesce(func.sum(AIUsageRecord.cost_micros), 0),
                func.count(AIUsageRecord.id),
            ).where(AIUsageRecord.created_at >= since)
        )
    ).one()

    payments = (
        await db.execute(
            select(
                PaymentOperation.status,
                func.count(PaymentOperation.id),
                func.coalesce(func.sum(PaymentOperation.settlement_amount_minor), 0),
            )
            .where(
                PaymentOperation.created_at >= since,
                PaymentOperation.provider == "stripe",
            )
            .group_by(PaymentOperation.status)
        )
    ).all()
    payment_stats = {
        "by_status": {
            str(status): {"count": int(count), "settlement_minor": int(amount)}
            for status, count, amount in payments
        },
        "succeeded_count": 0,
        "succeeded_settlement_minor": 0,
    }
    for status, count, amount in payments:
        if status == PaymentOperationStatus.succeeded:
            payment_stats["succeeded_count"] = int(count)
            payment_stats["succeeded_settlement_minor"] = int(amount)

    email_row = (
        await db.execute(
            select(
                func.count(EmailOutbox.id),
                func.coalesce(
                    func.sum(case((EmailOutbox.sent_at.is_not(None), 1), else_=0)),
                    0,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (
                                (EmailOutbox.sent_at.is_(None))
                                & (EmailOutbox.last_error_code.is_not(None)),
                                1,
                            ),
                            else_=0,
                        )
                    ),
                    0,
                ),
            ).where(EmailOutbox.created_at >= since)
        )
    ).one()
    email_total = int(email_row[0] or 0)
    email_sent = int(email_row[1] or 0)
    email_failed = int(email_row[2] or 0)
    delivery_rate = (email_sent / email_total) if email_total else None

    health_rows = (
        await db.execute(
            select(
                OwnerServiceHealthCheck.provider_key,
                func.count(OwnerServiceHealthCheck.id),
                func.coalesce(
                    func.sum(case((OwnerServiceHealthCheck.ok.is_(True), 1), else_=0)),
                    0,
                ),
                func.coalesce(func.avg(OwnerServiceHealthCheck.latency_ms), 0),
            )
            .where(
                OwnerServiceHealthCheck.created_at >= since,
                OwnerServiceHealthCheck.environment == profile,
            )
            .group_by(OwnerServiceHealthCheck.provider_key)
        )
    ).all()
    health = {
        key: {
            "checks": int(total),
            "ok": int(ok_count),
            "uptime_ratio": (int(ok_count) / int(total)) if total else None,
            "avg_latency_ms": float(avg_latency or 0),
        }
        for key, total, ok_count, avg_latency in health_rows
    }

    storage: dict[str, Any] = {
        "configured": settings.s3_configured,
        "bucket": settings.s3_bucket,
        "object_count": None,
        "note": "Object counts require ListBucket; reported when storage is configured.",
    }
    if settings.s3_configured:
        try:
            client = S3ObjectStorage(settings)._s3_client()
            # Lightweight sample: list up to 1000 keys (not a full inventory).
            response = client.list_objects_v2(Bucket=settings.s3_bucket, MaxKeys=1000)
            storage["object_count_sample"] = int(response.get("KeyCount") or 0)
            storage["truncated"] = bool(response.get("IsTruncated"))
            storage["note"] = (
                "Sampled up to 1000 objects (truncated listing)."
                if response.get("IsTruncated")
                else "Full listing within sample window."
            )
        except Exception as exc:  # noqa: BLE001
            storage["error"] = str(exc)[:300]

    credentials = (
        await db.scalars(
            select(OwnerServiceCredential).where(
                OwnerServiceCredential.environment == profile
            )
        )
    ).all()

    return {
        "environment": profile,
        "window_hours": hours,
        "since": since.isoformat(),
        "openai": {
            "prompt_tokens": int(ai_row[0] or 0),
            "completion_tokens": int(ai_row[1] or 0),
            "total_tokens": int((ai_row[0] or 0) + (ai_row[1] or 0)),
            "cost_micros": int(ai_row[2] or 0),
            "requests": int(ai_row[3] or 0),
        },
        "stripe": payment_stats,
        "smtp": {
            "total": email_total,
            "sent": email_sent,
            "failed": email_failed,
            "delivery_rate": delivery_rate,
        },
        "storage": storage,
        "health": health,
        "providers_configured": sum(
            1 for item in credentials if item.encrypted_secrets or item.public_config
        ),
        "providers_connected": sum(
            1 for item in credentials if item.status.value == "connected"
        ),
    }
