from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections import defaultdict
from collections.abc import Mapping, Sequence
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import APIError
from app.ledger_models import (
    LedgerAccount,
    LedgerAccountStatus,
    LedgerAccountType,
    LedgerEntry,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionStatus,
    LedgerTransactionType,
)
from app.ledger_schemas import LedgerEntryResponse, LedgerPosting, LedgerTransactionResponse
from app.models import User

ASSET_CODE = "SYLORA_CREDIT"
SENSITIVE_METADATA_MARKERS = {
    "card",
    "cvv",
    "password",
    "secret",
    "signature",
    "token",
    "authorization",
    "credential",
}

SYSTEM_ACCOUNT_SPECS: dict[str, tuple[LedgerAccountType, LedgerSide, bool]] = {
    "system:platform_issuance": (
        LedgerAccountType.platform_issuance,
        LedgerSide.debit,
        True,
    ),
    "system:platform_revenue": (
        LedgerAccountType.platform_revenue,
        LedgerSide.credit,
        True,
    ),
    "system:processor_clearing": (
        LedgerAccountType.processor_clearing,
        LedgerSide.debit,
        True,
    ),
    "system:refund_liability": (
        LedgerAccountType.refund_liability,
        LedgerSide.credit,
        True,
    ),
    "system:gift_liability": (
        LedgerAccountType.gift_liability,
        LedgerSide.credit,
        False,
    ),
    "system:payout_liability": (
        LedgerAccountType.payout_liability,
        LedgerSide.credit,
        False,
    ),
}


class FinancialOperationLockPool:
    """Bounded in-process serialization; database locks remain authoritative."""

    def __init__(self, stripes: int = 257) -> None:
        self._locks = tuple(asyncio.Lock() for _ in range(stripes))

    def lock(self, key: str) -> asyncio.Lock:
        digest = hashlib.sha256(key.encode()).digest()
        index = int.from_bytes(digest[:8], "big") % len(self._locks)
        return self._locks[index]


def validate_safe_metadata(value: Mapping[str, Any] | None) -> dict[str, Any]:
    if value is None:
        return {}

    def clean(item: Any, depth: int = 0) -> Any:
        if depth > 4:
            raise ValueError("metadata nesting is too deep")
        if item is None or isinstance(item, (bool, int)):
            return item
        if isinstance(item, str):
            if len(item) > 1000:
                raise ValueError("metadata string is too long")
            return item
        if isinstance(item, list):
            if len(item) > 50:
                raise ValueError("metadata list is too long")
            return [clean(child, depth + 1) for child in item]
        if isinstance(item, Mapping):
            if len(item) > 50:
                raise ValueError("metadata object has too many keys")
            result: dict[str, Any] = {}
            for key, child in item.items():
                normalized = str(key)
                if len(normalized) > 96 or any(
                    marker in normalized.lower() for marker in SENSITIVE_METADATA_MARKERS
                ):
                    raise ValueError("metadata contains a disallowed key")
                result[normalized] = clean(child, depth + 1)
            return result
        raise ValueError("metadata contains an unsupported value")

    try:
        cleaned = clean(value)
    except ValueError as exc:
        raise APIError(
            422,
            "unsafe_ledger_metadata",
            "Invalid ledger metadata",
            "Ledger metadata must contain only bounded, non-sensitive JSON values.",
        ) from exc
    assert isinstance(cleaned, dict)
    return cleaned


async def seed_platform_accounts(session: AsyncSession) -> None:
    existing = set(
        (
            await session.scalars(
                select(LedgerAccount.scope).where(
                    LedgerAccount.scope.in_(tuple(SYSTEM_ACCOUNT_SPECS))
                )
            )
        ).all()
    )
    for scope, (account_type, normal_side, allow_negative) in SYSTEM_ACCOUNT_SPECS.items():
        if scope not in existing:
            session.add(
                LedgerAccount(
                    owner_user_id=None,
                    account_type=account_type,
                    normal_side=normal_side,
                    status=LedgerAccountStatus.active,
                    currency=ASSET_CODE,
                    scope=scope,
                    allow_negative=allow_negative,
                )
            )
    await session.commit()


async def system_account(session: AsyncSession, scope: str) -> LedgerAccount:
    if scope not in SYSTEM_ACCOUNT_SPECS:
        raise ValueError(f"unknown system ledger scope: {scope}")
    account = await session.scalar(
        select(LedgerAccount).where(
            LedgerAccount.scope == scope,
            LedgerAccount.currency == ASSET_CODE,
        )
    )
    if account is None:
        account_type, normal_side, allow_negative = SYSTEM_ACCOUNT_SPECS[scope]
        account = LedgerAccount(
            account_type=account_type,
            normal_side=normal_side,
            status=LedgerAccountStatus.active,
            currency=ASSET_CODE,
            scope=scope,
            allow_negative=allow_negative,
        )
        session.add(account)
        await session.flush()
    return account


async def user_account(
    session: AsyncSession,
    user_id: uuid.UUID,
    account_type: LedgerAccountType,
) -> LedgerAccount:
    if account_type not in {
        LedgerAccountType.user_wallet,
        LedgerAccountType.creator_earnings,
    }:
        raise ValueError("unsupported user account type")
    scope = f"user:{user_id}:{account_type.value}"
    account = await session.scalar(
        select(LedgerAccount).where(
            LedgerAccount.scope == scope,
            LedgerAccount.currency == ASSET_CODE,
        )
    )
    if account is None:
        account = LedgerAccount(
            owner_user_id=user_id,
            account_type=account_type,
            normal_side=LedgerSide.credit,
            status=LedgerAccountStatus.active,
            currency=ASSET_CODE,
            scope=scope,
            allow_negative=False,
        )
        session.add(account)
        await session.flush()
    return account


async def account_balance(session: AsyncSession, account: LedgerAccount) -> int:
    debit_total, credit_total = (
        await session.execute(
            select(
                func.coalesce(func.sum(LedgerEntry.debit_minor), 0),
                func.coalesce(func.sum(LedgerEntry.credit_minor), 0),
            ).where(LedgerEntry.account_id == account.id)
        )
    ).one()
    debit = int(debit_total or 0)
    credit = int(credit_total or 0)
    return debit - credit if account.normal_side == LedgerSide.debit else credit - debit


def _postings_fingerprint(
    transaction_type: LedgerTransactionType,
    postings: Sequence[LedgerPosting],
    external_reference: str | None,
    reverses_transaction_id: uuid.UUID | None,
) -> str:
    canonical = {
        "type": transaction_type.value,
        "postings": sorted(
            (
                str(posting.account_id),
                posting.side.value,
                posting.amount_minor,
            )
            for posting in postings
        ),
        "external_reference": external_reference,
        "reverses_transaction_id": (
            str(reverses_transaction_id) if reverses_transaction_id else None
        ),
    }
    return hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


async def post_transaction(
    session: AsyncSession,
    *,
    transaction_type: LedgerTransactionType,
    actor_user_id: uuid.UUID | None,
    idempotency_scope: str,
    idempotency_key: str,
    postings: Sequence[LedgerPosting],
    metadata: Mapping[str, Any] | None = None,
    external_reference: str | None = None,
    reverses_transaction_id: uuid.UUID | None = None,
) -> tuple[LedgerTransaction, bool]:
    if not postings:
        raise APIError(
            422,
            "empty_ledger_transaction",
            "Ledger transaction is empty",
            "At least two balanced entries are required.",
        )
    actor_scope = str(actor_user_id) if actor_user_id is not None else "system"
    request_hash = _postings_fingerprint(
        transaction_type,
        postings,
        external_reference,
        reverses_transaction_id,
    )
    if actor_user_id is not None:
        await session.scalar(select(User.id).where(User.id == actor_user_id).with_for_update())
    existing = await session.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.idempotency_actor_scope == actor_scope,
            LedgerTransaction.idempotency_scope == idempotency_scope,
            LedgerTransaction.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        if existing.transaction_metadata.get("_request_hash") != request_hash:
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different operation.",
            )
        return existing, False

    debit_total = sum(
        posting.amount_minor for posting in postings if posting.side == LedgerSide.debit
    )
    credit_total = sum(
        posting.amount_minor for posting in postings if posting.side == LedgerSide.credit
    )
    if debit_total != credit_total:
        raise APIError(
            422,
            "unbalanced_ledger_transaction",
            "Ledger transaction is not balanced",
            "Total debits must equal total credits in integer minor units.",
        )

    account_ids = sorted({posting.account_id for posting in postings}, key=lambda item: item.int)
    accounts = list(
        (
            await session.scalars(
                select(LedgerAccount)
                .where(LedgerAccount.id.in_(account_ids))
                .order_by(LedgerAccount.id)
                .with_for_update()
            )
        ).all()
    )
    if len(accounts) != len(account_ids):
        raise APIError(
            422,
            "ledger_account_not_found",
            "Ledger account not found",
            "One or more ledger accounts do not exist.",
        )
    existing = await session.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.idempotency_actor_scope == actor_scope,
            LedgerTransaction.idempotency_scope == idempotency_scope,
            LedgerTransaction.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        if existing.transaction_metadata.get("_request_hash") != request_hash:
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different operation.",
            )
        return existing, False
    account_by_id = {account.id: account for account in accounts}
    changes: dict[uuid.UUID, list[int]] = defaultdict(lambda: [0, 0])
    for posting in postings:
        account = account_by_id[posting.account_id]
        if account.status != LedgerAccountStatus.active:
            raise APIError(
                409,
                "ledger_account_unavailable",
                "Ledger account unavailable",
                "A required ledger account is frozen or closed.",
            )
        if account.currency != ASSET_CODE:
            raise APIError(
                422,
                "ledger_asset_mismatch",
                "Ledger asset mismatch",
                "All transaction entries must use the same asset code.",
            )
        changes[posting.account_id][0 if posting.side == LedgerSide.debit else 1] += (
            posting.amount_minor
        )

    for account in accounts:
        current = await account_balance(session, account)
        debit_change, credit_change = changes[account.id]
        delta = (
            debit_change - credit_change
            if account.normal_side == LedgerSide.debit
            else credit_change - debit_change
        )
        if not account.allow_negative and current + delta < 0:
            raise APIError(
                409,
                "insufficient_funds",
                "Insufficient funds",
                "The spendable ledger balance is too low for this operation.",
            )

    cleaned_metadata = validate_safe_metadata(metadata)
    cleaned_metadata["_request_hash"] = request_hash
    transaction = LedgerTransaction(
        transaction_type=transaction_type,
        status=LedgerTransactionStatus.posted,
        actor_user_id=actor_user_id,
        idempotency_actor_scope=actor_scope,
        idempotency_scope=idempotency_scope,
        idempotency_key=idempotency_key,
        external_reference=external_reference,
        transaction_metadata=cleaned_metadata,
        reverses_transaction_id=reverses_transaction_id,
    )
    session.add(transaction)
    await session.flush()
    session.add_all(
        [
            LedgerEntry(
                transaction_id=transaction.id,
                account_id=posting.account_id,
                debit_minor=(posting.amount_minor if posting.side == LedgerSide.debit else None),
                credit_minor=(posting.amount_minor if posting.side == LedgerSide.credit else None),
            )
            for posting in postings
        ]
    )
    await session.flush()
    persisted_debits, persisted_credits = (
        await session.execute(
            select(
                func.coalesce(func.sum(LedgerEntry.debit_minor), 0),
                func.coalesce(func.sum(LedgerEntry.credit_minor), 0),
            ).where(LedgerEntry.transaction_id == transaction.id)
        )
    ).one()
    if int(persisted_debits or 0) != int(persisted_credits or 0):
        raise RuntimeError("ledger service invariant rejected an unbalanced transaction")
    return transaction, True


async def reverse_transaction(
    session: AsyncSession,
    *,
    transaction_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    idempotency_key: str,
    reason: str,
    transaction_type: LedgerTransactionType = LedgerTransactionType.reversal,
) -> tuple[LedgerTransaction, bool]:
    existing_reversal = await session.scalar(
        select(LedgerTransaction).where(LedgerTransaction.reverses_transaction_id == transaction_id)
    )
    if existing_reversal is not None:
        return existing_reversal, False
    original = await session.get(LedgerTransaction, transaction_id)
    if original is None:
        raise APIError(
            404,
            "ledger_transaction_not_found",
            "Ledger transaction not found",
            "The requested ledger transaction does not exist.",
        )
    entries = list(
        (
            await session.scalars(
                select(LedgerEntry)
                .where(LedgerEntry.transaction_id == transaction_id)
                .order_by(LedgerEntry.account_id, LedgerEntry.id)
            )
        ).all()
    )
    postings = [
        LedgerPosting(
            account_id=entry.account_id,
            side=LedgerSide.credit if entry.debit_minor else LedgerSide.debit,
            amount_minor=int(entry.debit_minor or entry.credit_minor or 0),
        )
        for entry in entries
    ]
    return await post_transaction(
        session,
        transaction_type=transaction_type,
        actor_user_id=actor_user_id,
        idempotency_scope=f"reversal:{transaction_id}",
        idempotency_key=idempotency_key,
        postings=postings,
        metadata={"reason": reason, "original_transaction_id": str(transaction_id)},
        reverses_transaction_id=transaction_id,
    )


async def ledger_transaction_response(
    session: AsyncSession, transaction: LedgerTransaction
) -> LedgerTransactionResponse:
    entries = list(
        (
            await session.scalars(
                select(LedgerEntry)
                .where(LedgerEntry.transaction_id == transaction.id)
                .order_by(LedgerEntry.account_id, LedgerEntry.id)
            )
        ).all()
    )
    public_metadata = {
        key: value
        for key, value in transaction.transaction_metadata.items()
        if not key.startswith("_")
    }
    reversal = await session.scalar(
        select(LedgerTransaction).where(LedgerTransaction.reverses_transaction_id == transaction.id)
    )
    return LedgerTransactionResponse(
        id=transaction.id,
        transaction_type=transaction.transaction_type,
        status=(LedgerTransactionStatus.reversed if reversal is not None else transaction.status),
        actor_user_id=transaction.actor_user_id,
        external_reference=transaction.external_reference,
        metadata=public_metadata,
        reverses_transaction_id=transaction.reverses_transaction_id,
        created_at=transaction.created_at,
        posted_at=transaction.posted_at,
        reversed_at=reversal.posted_at if reversal is not None else transaction.reversed_at,
        entries=[
            LedgerEntryResponse(
                account_id=entry.account_id,
                side=LedgerSide.debit if entry.debit_minor else LedgerSide.credit,
                amount_minor=int(entry.debit_minor or entry.credit_minor or 0),
            )
            for entry in entries
        ],
    )


def account_delta_expression(account: LedgerAccount) -> Any:
    if account.normal_side == LedgerSide.credit:
        return case(
            (LedgerEntry.credit_minor.is_not(None), LedgerEntry.credit_minor),
            else_=-LedgerEntry.debit_minor,
        )
    return case(
        (LedgerEntry.debit_minor.is_not(None), LedgerEntry.debit_minor),
        else_=-LedgerEntry.credit_minor,
    )
