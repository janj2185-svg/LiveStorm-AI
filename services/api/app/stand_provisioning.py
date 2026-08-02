"""Shared helpers for public multi-tester stand provisioning."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.errors import APIError
from app.gift_models import CreatorMonetizationSetting
from app.gift_service import creator_monetization
from app.ledger_models import LedgerAccountType, LedgerSide, LedgerTransactionType
from app.ledger_schemas import LedgerPosting
from app.ledger_service import post_transaction, system_account, user_account
from app.security import utcnow


def assert_stand_accepting_testers(settings: Settings) -> None:
    """Reject new traffic after TEST_STAND_ENDS_AT when configured."""
    if not settings.is_public_test_stand or not settings.test_stand_ends_at:
        return
    raw = settings.test_stand_ends_at.strip()
    try:
        if "T" in raw:
            ends = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if ends.tzinfo is None:
                ends = ends.replace(tzinfo=timezone.utc)
        else:
            ends = datetime.combine(date.fromisoformat(raw), datetime.min.time(), tzinfo=timezone.utc)
    except ValueError as exc:
        raise APIError(
            503,
            "stand_misconfigured",
            "Stand misconfigured",
            "TEST_STAND_ENDS_AT must be an ISO date or datetime.",
        ) from exc
    if utcnow() >= ends:
        raise APIError(
            403,
            "stand_closed",
            "Public stand closed",
            f"This SYLORA test stand ended at {settings.test_stand_ends_at}.",
        )


async def provision_stand_tester(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    user_id: uuid.UUID,
) -> dict[str, Any]:
    """Enable gifts + one-time sandbox credit for a newly registered stand tester."""
    result: dict[str, Any] = {"gifts_enabled": False, "sandbox_credit_minor": 0}
    if not settings.is_public_test_stand:
        return result

    setting = await creator_monetization(db, user_id)
    setting.gifts_enabled = True
    result["gifts_enabled"] = True

    if settings.test_stand_sandbox_wallet and settings.test_stand_sandbox_credit_minor > 0:
        amount = settings.test_stand_sandbox_credit_minor
        wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
        issuance = await system_account(db, "system:platform_issuance")
        await post_transaction(
            db,
            transaction_type=LedgerTransactionType.issuance,
            actor_user_id=user_id,
            idempotency_scope=f"test-stand-signup:{user_id}",
            idempotency_key="signup-credit",
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
            metadata={
                "source": "test_stand_signup_sandbox",
                "not_a_real_payment": True,
            },
        )
        add_audit_event(
            db,
            request,
            settings,
            "wallet.sandbox_credit_signup",
            actor_user_id=user_id,
            target_user_id=user_id,
            metadata={"amount_minor": amount},
        )
        result["sandbox_credit_minor"] = amount

    # Silence unused import if monetization helper already flushed.
    _ = CreatorMonetizationSetting
    await db.commit()
    return result
