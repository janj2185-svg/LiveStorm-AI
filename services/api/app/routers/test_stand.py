"""Public test-stand status and sandbox helpers.

No secrets are returned. Real payments stay disabled.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.ledger_models import LedgerAccountType, LedgerSide, LedgerTransactionType
from app.ledger_schemas import LedgerPosting, WalletBalanceResponse
from app.ledger_service import (
    ASSET_CODE,
    account_balance,
    post_transaction,
    system_account,
    user_account,
)
from app.live_models import IntegrationPlatform
from app.live_platforms.common.status import LivePlatformId, LivePlatformIntegrationStatus
from app.live_platforms.tiktok.status import current_status as tiktok_status
from app.models import Role, UserRole
from app.rate_limit import rate_limit
from app.security import utcnow

router = APIRouter(tags=["Public Test Stand"])


def _feature(status: str, detail: str, *, mode: str | None = None) -> dict[str, Any]:
    item: dict[str, Any] = {"status": status, "detail": detail}
    if mode:
        item["mode"] = mode
    return item


@router.get("/public/stand-status")
async def public_stand_status(request: Request) -> dict[str, Any]:
    """Honest READY / PARTIAL / BLOCKED matrix for multi-tester stands."""
    settings: Settings = request.app.state.settings
    registry = request.app.state.live_adapter_registry

    platforms: dict[str, Any] = {}
    for platform_id in LivePlatformId:
        try:
            integration = IntegrationPlatform(platform_id.value)
            adapter = registry.resolve(integration)
            descriptor = adapter.descriptor()
            status_code = str(descriptor.status)
            if status_code in {
                LivePlatformIntegrationStatus.BLOCKED_BY_PROVIDER_ACCESS.value,
                "blocked_by_provider_access",
            }:
                level = "BLOCKED"
            elif descriptor.available:
                level = "PARTIAL"
            else:
                level = "BLOCKED"
            platforms[platform_id.value] = _feature(
                level,
                descriptor.limitation or status_code,
                mode=status_code,
            )
        except Exception as exc:  # noqa: BLE001 - honest matrix must not crash
            platforms[platform_id.value] = _feature(
                "BLOCKED",
                f"adapter_unavailable:{type(exc).__name__}",
            )

    platforms["tiktok"] = _feature(
        "BLOCKED"
        if tiktok_status() is LivePlatformIntegrationStatus.BLOCKED_BY_PROVIDER_ACCESS
        else "PARTIAL",
        tiktok_status().value,
        mode=tiktok_status().value,
    )

    payment_name = type(request.app.state.payment_provider).__name__
    payments_blocked = payment_name == "UnconfiguredPaymentProvider"
    llm_ok = bool(os.environ.get("OPENAI_API_KEY"))

    features = {
        "registration": _feature(
            "READY"
            if settings.smtp_configured or settings.test_stand_auto_verify_email
            else "BLOCKED",
            "register + login available"
            if settings.smtp_configured or settings.test_stand_auto_verify_email
            else "SMTP or TEST_STAND_AUTO_VERIFY_EMAIL required",
            mode="auto_verify" if settings.test_stand_auto_verify_email else "smtp",
        ),
        "login_logout": _feature("READY", "JWT access + rotating refresh sessions"),
        "password_reset": _feature(
            "READY" if settings.smtp_configured else "PARTIAL",
            "SMTP password reset" if settings.smtp_configured else "requires SMTP (not auto-verify)",
        ),
        "profile": _feature("READY", "GET/PATCH /v1/users/me + public profiles"),
        "feed": _feature("READY", "social posts feed"),
        "messaging": _feature("READY", "DM + websocket /v1/ws/messages (ticket or bearer)"),
        "wallet": _feature(
            "PARTIAL" if settings.test_stand_sandbox_wallet or not payments_blocked else "BLOCKED",
            "sandbox issuance only — real payments disabled"
            if payments_blocked
            else "payment provider configured",
            mode="sandbox" if payments_blocked else "provider",
        ),
        "gift_library": _feature(
            "PARTIAL",
            "soft-ping seeded on stand boot; catalog + ticket WS; AAA art remaster not claimed",
        ),
        "gift_realtime": _feature(
            "READY",
            "POST /v1/gifts/events/ticket + /v1/ws/gifts?ticket= for browsers",
        ),
        "message_realtime": _feature(
            "READY",
            "POST /v1/messages/events/ticket + /v1/ws/messages?ticket= for browsers",
        ),
        "email_verification": _feature(
            "READY" if settings.smtp_configured else "PARTIAL",
            "SMTP verification"
            if settings.smtp_configured
            else "SMTP not connected — TEST_STAND_AUTO_VERIFY_EMAIL auto-verifies on this stand",
            mode="smtp" if settings.smtp_configured else "auto_verify",
        ),
        "ai_assistant": _feature(
            "READY" if llm_ok else "PARTIAL",
            "LLM configured" if llm_ok else "Provider not configured",
        ),
        "live_studio": _feature("PARTIAL", "studio UI + adapters; platform feeds vary"),
        "tts": _feature("PARTIAL", "orchestrator hooks; voice provider may be unset"),
        "avatar": _feature(
            "READY",
            "Living female avatar runtime + GET /v1/live/avatar/presence + OBS /avatar-overlay.html",
        ),
        "obs_mediamtx": _feature(
            "PARTIAL" if settings.mediamtx_control_url else "BLOCKED",
            "MediaMTX control configured"
            if settings.mediamtx_control_url
            else "MediaMTX not configured",
        ),
        "account_delete": _feature("READY", "DELETE /v1/users/me"),
        "diagnostics": _feature(
            "READY" if settings.environment != "production" else "BLOCKED",
            "GET /v1/diagnostics (non-production)",
        ),
    }

    return {
        "product": "SYLORA",
        "stand": {
            "enabled": settings.is_public_test_stand,
            "environment": settings.environment,
            "web_base_url": settings.web_base_url,
            "ends_at": settings.test_stand_ends_at,
            "bug_report_url": settings.test_stand_bug_report_url,
            "real_payments": (not payments_blocked),
            "fake_live_events_as_proof": False,
        },
        "roles": [
            "owner",
            "admin",
            "creator",
            "streamer",
            "viewer",
            "user",
            "moderator",
            "business",
        ],
        "features": features,
        "platforms": platforms,
        "health": {
            "live": "/health/live",
            "ready": "/health/ready",
            "diagnostics": "/v1/diagnostics",
            "stand_status": "/v1/public/stand-status",
        },
        "notes": [
            "TikTok BLOCKED_BY_PROVIDER_ACCESS does not block the rest of SYLORA.",
            "Fake transport events are tests-only and never prove real LIVE integration.",
            "Secrets, JWT keys, and API keys are never returned by this endpoint.",
        ],
    }


@router.post("/test-stand/sandbox-credit", response_model=WalletBalanceResponse)
async def sandbox_credit(
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> WalletBalanceResponse:
    """Sandbox wallet credit for public testers. Not a real payment."""
    if not settings.is_public_test_stand or not settings.test_stand_sandbox_wallet:
        raise APIError(
            404,
            "not_found",
            "Not found",
            "Sandbox wallet credit is not enabled on this deployment.",
        )
    await rate_limit(
        request,
        bucket="test-stand-sandbox-credit",
        subject=str(auth.user.id),
        limit=3,
        window_seconds=3600,
    )
    amount = settings.test_stand_sandbox_credit_minor
    if amount <= 0:
        raise APIError(400, "sandbox_disabled", "Sandbox disabled", "Credit amount is zero.")

    wallet = await user_account(db, auth.user.id, LedgerAccountType.user_wallet)
    issuance = await system_account(db, "system:platform_issuance")
    await post_transaction(
        db,
        transaction_type=LedgerTransactionType.issuance,
        actor_user_id=auth.user.id,
        idempotency_scope=f"test-stand-sandbox:{auth.user.id}",
        idempotency_key=f"sandbox-{uuid.uuid4()}",
        postings=[
            LedgerPosting(
                account_id=issuance.id,
                side=LedgerSide.debit,
                amount_minor=amount,
            ),
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.credit,
                amount_minor=amount,
            ),
        ],
        metadata={"source": "test_stand_sandbox", "not_a_real_payment": True},
    )
    add_audit_event(
        db,
        request,
        settings,
        "wallet.sandbox_credit",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"amount_minor": amount},
    )
    await db.commit()
    return WalletBalanceResponse(
        asset_code=ASSET_CODE,
        spendable_minor=await account_balance(db, wallet),
        account_id=wallet.id,
        computed_at=utcnow(),
    )


@router.post("/test-stand/assume-role/{role_name}")
async def assume_test_role(
    role_name: str,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Allow testers to pick viewer/streamer/creator on the public stand only."""
    if not settings.is_public_test_stand:
        raise APIError(404, "not_found", "Not found", "Role switching is stand-only.")
    allowed = {"viewer", "streamer", "creator", "user"}
    if role_name not in allowed:
        raise APIError(
            400,
            "role_not_allowed",
            "Role not allowed",
            f"Allowed test roles: {sorted(allowed)}. owner/admin require operator grant.",
        )
    role = await db.scalar(select(Role).where(Role.name == role_name))
    if role is None:
        raise APIError(503, "service_not_ready", "Service not ready", "Role missing.")
    existing = (await db.scalars(select(UserRole).where(UserRole.user_id == auth.user.id))).all()
    for link in existing:
        linked = await db.get(Role, link.role_id)
        if linked and linked.name in allowed:
            await db.delete(link)
    db.add(UserRole(user_id=auth.user.id, role_id=role.id))
    add_audit_event(
        db,
        request,
        settings,
        "identity.test_stand_role_assumed",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"role": role_name},
    )
    await db.commit()
    return {"ok": True, "role": role_name}
