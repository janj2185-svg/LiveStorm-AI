from __future__ import annotations

import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.business_service import settle_finance_invoice_webhook
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.errors import APIError
from app.ledger_models import (
    LedgerAccountType,
    LedgerEntry,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionType,
    PaymentOperation,
    PaymentOperationStatus,
    PaymentOperationType,
    PaymentWebhookEvent,
)
from app.ledger_schemas import (
    IssuanceRequest,
    LedgerPosting,
    LedgerTransactionPage,
    LedgerTransactionResponse,
    PaymentOperationResponse,
    PayoutRequest,
    ReversalRequest,
    TopUpIntentRequest,
    WalletBalanceResponse,
)
from app.ledger_service import (
    ASSET_CODE,
    account_balance,
    ledger_transaction_response,
    post_transaction,
    reverse_transaction,
    system_account,
    user_account,
    validate_safe_metadata,
)
from app.models import User
from app.payments import PaymentProvider
from app.platform_service import settle_external_commerce
from app.rate_limit import rate_limit
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor

router = APIRouter(tags=["Wallet"])
IDEMPOTENCY_PATTERN = r"^[A-Za-z0-9._:-]+$"
IdempotencyHeader = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=IDEMPOTENCY_PATTERN,
    ),
]


async def wallet_balance_for(db: AsyncSession, user_id: uuid.UUID) -> WalletBalanceResponse:
    account = await user_account(db, user_id, LedgerAccountType.user_wallet)
    return WalletBalanceResponse(
        asset_code=ASSET_CODE,
        spendable_minor=await account_balance(db, account),
        account_id=account.id,
        computed_at=utcnow(),
    )


@router.get("/wallet/balance", response_model=WalletBalanceResponse)
async def wallet_balance(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> WalletBalanceResponse:
    response = await wallet_balance_for(db, auth.user.id)
    await db.commit()
    return response


@router.get("/wallet/creator-earnings", response_model=WalletBalanceResponse)
async def creator_earnings_balance(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> WalletBalanceResponse:
    account = await user_account(db, auth.user.id, LedgerAccountType.creator_earnings)
    response = WalletBalanceResponse(
        asset_code=ASSET_CODE,
        spendable_minor=await account_balance(db, account),
        account_id=account.id,
        computed_at=utcnow(),
    )
    await db.commit()
    return response


async def transaction_history_for(
    *,
    db: AsyncSession,
    settings: Settings,
    user_id: uuid.UUID,
    cursor: str | None,
    limit: int,
) -> LedgerTransactionPage:
    wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
    earnings = await user_account(db, user_id, LedgerAccountType.creator_earnings)
    await db.commit()
    scope = f"wallet-history:{user_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    # Distinct on LedgerTransaction itself fails on PostgreSQL because the
    # metadata JSON column has no equality operator. Distinct the entry
    # transaction ids first, then load full transactions.
    account_txn_ids = (
        select(LedgerEntry.transaction_id)
        .where(LedgerEntry.account_id.in_([wallet.id, earnings.id]))
        .distinct()
    )
    statement = select(LedgerTransaction).where(
        LedgerTransaction.id.in_(account_txn_ids)
    )
    statement = apply_cursor(
        statement,
        LedgerTransaction.created_at,
        LedgerTransaction.id,
        cursor_value,
    )
    transactions = list(
        (
            await db.scalars(
                statement.order_by(
                    LedgerTransaction.created_at.desc(),
                    LedgerTransaction.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = transactions[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(transactions) > limit and visible
        else None
    )
    return LedgerTransactionPage(
        items=[await ledger_transaction_response(db, item) for item in visible],
        next_cursor=next_cursor,
    )


@router.get("/wallet/transactions", response_model=LedgerTransactionPage)
async def wallet_transactions(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LedgerTransactionPage:
    return await transaction_history_for(
        db=db,
        settings=settings,
        user_id=auth.user.id,
        cursor=cursor,
        limit=limit,
    )


@router.get(
    "/admin/ledger/users/{user_id}/transactions",
    response_model=LedgerTransactionPage,
    tags=["Administration"],
)
async def read_user_ledger(
    user_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    _: AuthContext = Depends(require_permission("ledger:read:any")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LedgerTransactionPage:
    return await transaction_history_for(
        db=db,
        settings=settings,
        user_id=user_id,
        cursor=cursor,
        limit=limit,
    )


@router.post(
    "/admin/ledger/issuance",
    response_model=LedgerTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Administration"],
)
async def issue_credits(
    payload: IssuanceRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(require_permission("ledger:issue")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LedgerTransactionResponse:
    if await db.scalar(select(User.id).where(User.id == payload.user_id)) is None:
        raise APIError(
            404,
            "user_not_found",
            "User not found",
            "The issuance target does not exist.",
        )
    issuance = await system_account(db, "system:platform_issuance")
    wallet = await user_account(db, payload.user_id, LedgerAccountType.user_wallet)
    transaction, created = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.issuance,
        actor_user_id=auth.user.id,
        idempotency_scope=f"admin-issuance:{payload.user_id}",
        idempotency_key=idempotency_key,
        postings=[
            LedgerPosting(
                account_id=issuance.id,
                side=LedgerSide.debit,
                amount_minor=payload.amount_minor,
            ),
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.credit,
                amount_minor=payload.amount_minor,
            ),
        ],
        metadata={"reason": payload.reason, "target_user_id": str(payload.user_id)},
    )
    if created:
        add_audit_event(
            db,
            request,
            settings,
            "ledger.credits_issued",
            actor_user_id=auth.user.id,
            target_user_id=payload.user_id,
            metadata={
                "ledger_transaction_id": str(transaction.id),
                "amount_minor": payload.amount_minor,
                "asset_code": ASSET_CODE,
                "reason": payload.reason,
            },
        )
        await db.commit()
    return await ledger_transaction_response(db, transaction)


@router.post(
    "/admin/ledger/transactions/{transaction_id}/reverse",
    response_model=LedgerTransactionResponse,
    tags=["Administration"],
)
async def reverse_ledger_transaction(
    transaction_id: uuid.UUID,
    payload: ReversalRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(require_permission("ledger:issue")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LedgerTransactionResponse:
    transaction, created = await reverse_transaction(
        db,
        transaction_id=transaction_id,
        actor_user_id=auth.user.id,
        idempotency_key=idempotency_key,
        reason=payload.reason,
    )
    if created:
        add_audit_event(
            db,
            request,
            settings,
            "ledger.transaction_reversed",
            actor_user_id=auth.user.id,
            metadata={
                "original_transaction_id": str(transaction_id),
                "reversal_transaction_id": str(transaction.id),
                "reason": payload.reason,
            },
        )
        await db.commit()
    return await ledger_transaction_response(db, transaction)


def payment_status(value: str) -> PaymentOperationStatus:
    try:
        return PaymentOperationStatus(value)
    except ValueError as exc:
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The payment provider returned an unsupported operation state.",
        ) from exc


@router.post(
    "/wallet/topups",
    response_model=PaymentOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_topup(
    payload: TopUpIntentRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PaymentOperation:
    await rate_limit(
        request,
        bucket="wallet-topups",
        subject=str(auth.user.id),
        limit=settings.topup_rate_limit,
        window_seconds=settings.wallet_rate_window_seconds,
    )
    await db.scalar(select(User.id).where(User.id == auth.user.id).with_for_update())
    existing = await db.scalar(
        select(PaymentOperation).where(
            PaymentOperation.actor_user_id == auth.user.id,
            PaymentOperation.operation_type == PaymentOperationType.topup,
            PaymentOperation.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        return existing
    provider: PaymentProvider = request.app.state.payment_provider
    result = await provider.create_topup_intent(
        idempotency_key=idempotency_key,
        user_reference=str(auth.user.id),
        amount_minor=payload.amount_minor,
        settlement_currency=payload.settlement_currency,
        return_url=payload.return_url,
    )
    if result.ledger_amount_minor <= 0 or result.settlement_amount_minor != payload.amount_minor:
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The payment provider returned an invalid settlement quote.",
        )
    operation = PaymentOperation(
        actor_user_id=auth.user.id,
        operation_type=PaymentOperationType.topup,
        status=payment_status(result.status),
        provider=provider.name,
        provider_operation_id=result.provider_operation_id,
        idempotency_key=idempotency_key,
        amount_minor=result.ledger_amount_minor,
        currency=ASSET_CODE,
        settlement_amount_minor=result.settlement_amount_minor,
        settlement_currency=payload.settlement_currency,
        safe_provider_data=validate_safe_metadata(result.client_data),
    )
    db.add(operation)
    await db.flush()
    if operation.status == PaymentOperationStatus.succeeded:
        await settle_payment_operation(
            db,
            operation,
            event_id=hashlib.sha256(
                f"intent:{provider.name}:{result.provider_operation_id}".encode()
            ).hexdigest(),
            new_status=PaymentOperationStatus.succeeded,
        )
    await db.commit()
    await db.refresh(operation)
    return operation


@router.post(
    "/wallet/payouts",
    response_model=PaymentOperationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payout(
    payload: PayoutRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PaymentOperation:
    await db.scalar(select(User.id).where(User.id == auth.user.id).with_for_update())
    existing = await db.scalar(
        select(PaymentOperation).where(
            PaymentOperation.actor_user_id == auth.user.id,
            PaymentOperation.operation_type == PaymentOperationType.payout,
            PaymentOperation.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        return existing
    earnings = await user_account(db, auth.user.id, LedgerAccountType.creator_earnings)
    if await account_balance(db, earnings) < payload.amount_minor:
        raise APIError(
            409,
            "insufficient_creator_balance",
            "Insufficient creator balance",
            "Creator earnings are too low for this payout.",
        )
    provider: PaymentProvider = request.app.state.payment_provider
    result = await provider.create_payout(
        idempotency_key=idempotency_key,
        user_reference=str(auth.user.id),
        amount_minor=payload.amount_minor,
        settlement_currency=payload.settlement_currency,
        destination_reference=payload.destination_reference,
    )
    if result.ledger_amount_minor != payload.amount_minor or result.settlement_amount_minor <= 0:
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The payment provider returned an invalid payout quote.",
        )
    liability = await system_account(db, "system:payout_liability")
    reservation, _ = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.payout,
        actor_user_id=auth.user.id,
        idempotency_scope="payout-reservation",
        idempotency_key=idempotency_key,
        postings=[
            LedgerPosting(
                account_id=earnings.id,
                side=LedgerSide.debit,
                amount_minor=payload.amount_minor,
            ),
            LedgerPosting(
                account_id=liability.id,
                side=LedgerSide.credit,
                amount_minor=payload.amount_minor,
            ),
        ],
        metadata={"provider": provider.name, "provider_operation_id": result.provider_operation_id},
    )
    operation = PaymentOperation(
        actor_user_id=auth.user.id,
        operation_type=PaymentOperationType.payout,
        status=payment_status(result.status),
        provider=provider.name,
        provider_operation_id=result.provider_operation_id,
        idempotency_key=idempotency_key,
        amount_minor=payload.amount_minor,
        currency=ASSET_CODE,
        settlement_amount_minor=result.settlement_amount_minor,
        settlement_currency=payload.settlement_currency,
        safe_provider_data=validate_safe_metadata(result.client_data),
        ledger_transaction_id=reservation.id,
    )
    db.add(operation)
    await db.flush()
    if operation.status == PaymentOperationStatus.succeeded:
        await settle_payment_operation(
            db,
            operation,
            event_id=hashlib.sha256(
                f"intent:{provider.name}:{result.provider_operation_id}".encode()
            ).hexdigest(),
            new_status=PaymentOperationStatus.succeeded,
        )
    await db.commit()
    await db.refresh(operation)
    return operation


async def settle_payment_operation(
    db: AsyncSession,
    operation: PaymentOperation,
    *,
    event_id: str,
    new_status: PaymentOperationStatus,
) -> None:
    if new_status == PaymentOperationStatus.succeeded:
        if operation.operation_type == PaymentOperationType.topup:
            clearing = await system_account(db, "system:processor_clearing")
            wallet = await user_account(db, operation.actor_user_id, LedgerAccountType.user_wallet)
            transaction, _ = await post_transaction(
                db,
                transaction_type=LedgerTransactionType.topup,
                actor_user_id=operation.actor_user_id,
                idempotency_scope=f"payment-settlement:{operation.id}",
                idempotency_key=event_id,
                postings=[
                    LedgerPosting(
                        account_id=clearing.id,
                        side=LedgerSide.debit,
                        amount_minor=operation.amount_minor,
                    ),
                    LedgerPosting(
                        account_id=wallet.id,
                        side=LedgerSide.credit,
                        amount_minor=operation.amount_minor,
                    ),
                ],
                metadata={
                    "provider": operation.provider,
                    "payment_operation_id": str(operation.id),
                },
                external_reference=operation.provider_operation_id,
            )
            operation.ledger_transaction_id = transaction.id
        elif operation.operation_type == PaymentOperationType.payout:
            liability = await system_account(db, "system:payout_liability")
            clearing = await system_account(db, "system:processor_clearing")
            await post_transaction(
                db,
                transaction_type=LedgerTransactionType.payout,
                actor_user_id=operation.actor_user_id,
                idempotency_scope=f"payout-settlement:{operation.id}",
                idempotency_key=event_id,
                postings=[
                    LedgerPosting(
                        account_id=liability.id,
                        side=LedgerSide.debit,
                        amount_minor=operation.amount_minor,
                    ),
                    LedgerPosting(
                        account_id=clearing.id,
                        side=LedgerSide.credit,
                        amount_minor=operation.amount_minor,
                    ),
                ],
                metadata={"payment_operation_id": str(operation.id)},
                external_reference=operation.provider_operation_id,
            )
        operation.completed_at = utcnow()
    elif new_status in {PaymentOperationStatus.failed, PaymentOperationStatus.cancelled}:
        if (
            operation.operation_type == PaymentOperationType.payout
            and operation.ledger_transaction_id is not None
        ):
            await reverse_transaction(
                db,
                transaction_id=operation.ledger_transaction_id,
                actor_user_id=operation.actor_user_id,
                idempotency_key=event_id,
                reason=f"payout {new_status.value}",
            )
        operation.completed_at = utcnow()
        operation.failure_code = f"provider_{new_status.value}"
    operation.status = new_status


@router.post("/payments/webhooks/{provider_name}", tags=["Payments"])
async def payment_webhook(
    provider_name: str,
    request: Request,
    payment_signature: Annotated[
        str | None, Header(alias="X-Payment-Signature", min_length=1)
    ] = None,
    stripe_signature: Annotated[str | None, Header(alias="Stripe-Signature", min_length=1)] = None,
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    provider: PaymentProvider = request.app.state.payment_provider
    raw_body = await request.body()
    signature = stripe_signature or payment_signature
    if signature is None:
        raise APIError(
            400,
            "payment_webhook_signature_required",
            "Payment webhook signature required",
            "Provide Stripe-Signature or X-Payment-Signature.",
        )
    verified = await provider.verify_webhook(raw_body=raw_body, signature=signature)
    if provider.name != provider_name:
        raise APIError(
            404,
            "payment_provider_not_selected",
            "Payment provider not selected",
            "This webhook route is not active for the selected payment provider.",
        )
    existing = await db.scalar(
        select(PaymentWebhookEvent).where(
            PaymentWebhookEvent.provider == provider_name,
            PaymentWebhookEvent.provider_event_id == verified.event_id,
        )
    )
    if existing is not None:
        return {"status": "already_processed"}
    event = PaymentWebhookEvent(
        provider=provider_name,
        provider_event_id=verified.event_id,
        payload_sha256=hashlib.sha256(raw_body).hexdigest(),
        signature_verified=True,
        event_type=verified.event_type,
    )
    db.add(event)
    operation: PaymentOperation | None = None
    if verified.operation_id is not None and verified.operation_status is not None:
        operation = await db.scalar(
            select(PaymentOperation)
            .where(
                PaymentOperation.provider == provider_name,
                PaymentOperation.provider_operation_id == verified.operation_id,
            )
            .with_for_update()
        )
        if operation is not None:
            new_status = payment_status(verified.operation_status)
            allowed: dict[PaymentOperationStatus, set[PaymentOperationStatus]] = {
                PaymentOperationStatus.pending: {
                    PaymentOperationStatus.requires_action,
                    PaymentOperationStatus.processing,
                    PaymentOperationStatus.succeeded,
                    PaymentOperationStatus.failed,
                    PaymentOperationStatus.cancelled,
                },
                PaymentOperationStatus.requires_action: {
                    PaymentOperationStatus.processing,
                    PaymentOperationStatus.succeeded,
                    PaymentOperationStatus.failed,
                    PaymentOperationStatus.cancelled,
                },
                PaymentOperationStatus.processing: {
                    PaymentOperationStatus.succeeded,
                    PaymentOperationStatus.failed,
                    PaymentOperationStatus.cancelled,
                },
            }
            if new_status != operation.status and new_status not in allowed.get(
                operation.status, set()
            ):
                raise APIError(
                    409,
                    "invalid_payment_state_transition",
                    "Invalid payment state transition",
                    "The verified provider event cannot move this operation to that state.",
                )
            if new_status != operation.status:
                await settle_payment_operation(
                    db,
                    operation,
                    event_id=verified.event_id,
                    new_status=new_status,
                )
        await settle_external_commerce(
            db,
            provider_name=provider_name,
            operation_id=verified.operation_id,
            operation_status=verified.operation_status,
        )
        await settle_finance_invoice_webhook(
            db,
            provider_name=provider_name,
            operation_id=verified.operation_id,
            operation_status=verified.operation_status,
        )
    event.processed_at = utcnow()
    add_audit_event(
        db,
        request,
        request.app.state.settings,
        "payments.webhook_processed",
        target_user_id=operation.actor_user_id if operation is not None else None,
        metadata={
            "provider": provider_name,
            "provider_event_id": verified.event_id,
            "event_type": verified.event_type,
            "operation_id": verified.operation_id,
            "operation_status": verified.operation_status,
            "payment_operation_id": str(operation.id) if operation is not None else None,
        },
    )
    await db.commit()
    return {"status": "processed"}
