"""Development-only diagnostics endpoint for owner local testing.

Never exposes secrets. Disabled (404) when ENVIRONMENT=production.
"""

from __future__ import annotations

import os
import subprocess
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.config import Settings
from app.errors import APIError

router = APIRouter(tags=["Diagnostics"])

REPO_ROOT = Path(__file__).resolve().parents[4]


def _git(cmd: list[str]) -> str | None:
    try:
        return subprocess.check_output(
            cmd,
            cwd=str(REPO_ROOT),
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=3,
        ).strip()
    except Exception:
        return None


def _bool_status(ok: bool, detail: str | None = None) -> dict[str, Any]:
    return {"ok": ok, "detail": detail or ("up" if ok else "down")}


def _provider_flags(settings: Settings) -> tuple[list[str], list[str]]:
    configured: list[str] = []
    missing: list[str] = []

    def flag(name: str, present: bool) -> None:
        (configured if present else missing).append(name)

    flag("object_storage_s3", bool(settings.s3_endpoint_url and settings.s3_bucket and settings.s3_access_key_id))
    flag("payment_provider", False)  # always unconfigured unless injected
    flag("openai_api_key", bool(os.environ.get("OPENAI_API_KEY")))
    flag("youtube_oauth", bool(settings.youtube_client_id and settings.youtube_client_secret))
    flag("twitch_oauth", bool(settings.twitch_client_id and settings.twitch_client_secret))
    flag("discord_application", bool(settings.discord_application_id))
    flag("mediamtx_control", bool(settings.mediamtx_control_url))
    flag("smtp", bool(settings.smtp_host))
    flag("service_health_hmac", bool(settings.service_health_hmac_secret))
    return configured, missing


@router.get("/diagnostics")
async def diagnostics(request: Request) -> dict[str, Any]:
    settings: Settings = request.app.state.settings
    if settings.environment == "production":
        raise APIError(
            404,
            "not_found",
            "Not found",
            "Diagnostics are not available in production.",
        )

    db_ok = False
    db_detail = "unknown"
    migration_version: str | None = None
    try:
        async with request.app.state.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = True
            db_detail = "connected"
            try:
                row = await conn.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
                migration_version = row.scalar_one_or_none()
            except Exception:
                migration_version = None
                db_detail = "connected (alembic_version missing)"
    except Exception as exc:
        db_detail = type(exc).__name__

    redis_ok = False
    redis_detail = "unknown"
    try:
        await request.app.state.redis.ping()
        redis_ok = True
        redis_detail = "pong"
    except Exception as exc:
        redis_detail = type(exc).__name__

    storage = request.app.state.object_storage
    storage_configured = bool(getattr(storage, "configured", False) or getattr(storage, "client", None))
    # S3ObjectStorage may always exist; treat missing endpoint as unconfigured
    if not (settings.s3_endpoint_url and settings.s3_bucket):
        storage_configured = False

    payment = request.app.state.payment_provider
    payment_name = type(payment).__name__
    payment_ok = payment_name != "UnconfiguredPaymentProvider"

    configured, missing = _provider_flags(settings)
    if not payment_ok and "payment_provider" not in missing:
        missing.append("payment_provider")

    # Gift library honesty snapshot
    gift_summary: dict[str, Any] = {"ready": 0, "assets_built_not_ready": 0, "spec_only": 0, "total": 0}
    catalog_path = REPO_ROOT / "artifacts" / "gift-library" / "catalog.json"
    try:
        import json

        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        gifts = catalog.get("gifts", [])
        gift_summary["total"] = len(gifts)
        gift_summary["ready"] = sum(1 for g in gifts if g.get("status") == "READY")
        gift_summary["assets_built_not_ready"] = sum(
            1 for g in gifts if g.get("status") == "ASSETS_BUILT_NOT_READY"
        )
        gift_summary["spec_only"] = sum(1 for g in gifts if g.get("status") == "SPEC_ONLY")
    except Exception:
        gift_summary["error"] = "catalog_unreadable"

    celery_broker = bool(settings.celery_broker_url or settings.redis_url)

    # Product-loop demo seed snapshot (handles + issuance + posts)
    product_loop: dict[str, Any] = {
        "ok": False,
        "demo_handles": 0,
        "issuance_txns": 0,
        "published_posts": 0,
        "detail": "not seeded",
    }
    try:
        async with request.app.state.engine.connect() as conn:
            handles = (
                await conn.execute(
                    text("SELECT COUNT(*) FROM profiles WHERE handle LIKE 'sylora.%'")
                )
            ).scalar_one()
            issuance = (
                await conn.execute(
                    text(
                        "SELECT COUNT(*) FROM ledger_transactions "
                        "WHERE transaction_type = 'issuance' AND status = 'posted'"
                    )
                )
            ).scalar_one()
            posts = (
                await conn.execute(
                    text(
                        "SELECT COUNT(*) FROM posts "
                        "WHERE lifecycle = 'published' AND deleted_at IS NULL"
                    )
                )
            ).scalar_one()
            product_loop["demo_handles"] = int(handles or 0)
            product_loop["issuance_txns"] = int(issuance or 0)
            product_loop["published_posts"] = int(posts or 0)
            seeded = (
                product_loop["demo_handles"] >= 5
                and product_loop["issuance_txns"] >= 1
                and product_loop["published_posts"] >= 1
            )
            product_loop["ok"] = seeded
            product_loop["detail"] = (
                "demo seed present"
                if seeded
                else "run: python3 scripts/seed_product_demo.py"
            )
    except Exception as exc:
        product_loop["detail"] = f"query_failed:{type(exc).__name__}"

    return {
        "service": settings.service_name,
        "environment": settings.environment,
        "test_stand": {
            "enabled": settings.is_public_test_stand,
            "auto_verify_email": settings.test_stand_auto_verify_email,
            "sandbox_wallet": settings.test_stand_sandbox_wallet,
            "ends_at": settings.test_stand_ends_at,
            "bug_report_url": settings.test_stand_bug_report_url,
            "stand_status_path": "/v1/public/stand-status",
        },
        "commit": _git(["git", "rev-parse", "HEAD"]),
        "branch": _git(["git", "branch", "--show-current"]),
        "backend": _bool_status(True, "listening"),
        "database": _bool_status(db_ok, db_detail),
        "redis": _bool_status(redis_ok, redis_detail),
        "websocket": {
            "ok": True,
            "detail": "endpoints mounted at /v1/.../ws (auth required)",
            "paths": [
                "/v1/messaging/ws",
                "/v1/live/sessions/{id}/ws",
                "/v1/gifts/ws",
            ],
        },
        "storage": _bool_status(
            storage_configured,
            "configured" if storage_configured else "Provider not configured",
        ),
        "workers": _bool_status(
            celery_broker,
            "broker configured (verify celery process separately)",
        ),
        "migrations": {
            "ok": migration_version is not None,
            "version": migration_version,
        },
        "payment_provider": _bool_status(
            payment_ok,
            payment_name if payment_ok else "Provider not configured",
        ),
        "configured_providers": configured,
        "missing_providers": missing,
        "gift_library": gift_summary,
        "product_loop": product_loop,
        "recent_errors": [],
        "failed_background_jobs": [],
        "notes": [
            "Secrets are never returned by this endpoint.",
            "Unconfigured providers must fail closed with Provider not configured — never fake success.",
            "READY gift count is honest; do not claim 100 READY unless catalog says so.",
            "Phase 1 product loops: login → handle → wallet → feed → DM. Phase 2+ needs owner confirm.",
            "Use GET /v1/public/stand-status for the public READY/PARTIAL/BLOCKED matrix.",
        ],
    }
