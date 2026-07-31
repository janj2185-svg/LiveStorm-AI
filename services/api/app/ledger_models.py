from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class LedgerAccountType(enum.StrEnum):
    user_wallet = "user_wallet"
    creator_earnings = "creator_earnings"
    platform_revenue = "platform_revenue"
    platform_issuance = "platform_issuance"
    processor_clearing = "processor_clearing"
    refund_liability = "refund_liability"
    gift_liability = "gift_liability"
    payout_liability = "payout_liability"


class LedgerSide(enum.StrEnum):
    debit = "debit"
    credit = "credit"


class LedgerAccountStatus(enum.StrEnum):
    active = "active"
    frozen = "frozen"
    closed = "closed"


class LedgerTransactionStatus(enum.StrEnum):
    posted = "posted"
    reversed = "reversed"


class LedgerTransactionType(enum.StrEnum):
    issuance = "issuance"
    topup = "topup"
    gift_purchase = "gift_purchase"
    gift_send = "gift_send"
    subscription_purchase = "subscription_purchase"
    marketplace_purchase = "marketplace_purchase"
    marketplace_refund = "marketplace_refund"
    course_enrollment = "course_enrollment"
    refund = "refund"
    reversal = "reversal"
    payout = "payout"
    chargeback = "chargeback"


class LedgerAccount(Base):
    __tablename__ = "ledger_accounts"
    __table_args__ = (
        UniqueConstraint("currency", "scope", name="uq_ledger_accounts_currency_scope"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    account_type: Mapped[LedgerAccountType] = mapped_column(
        Enum(LedgerAccountType, native_enum=False, length=32), index=True
    )
    normal_side: Mapped[LedgerSide] = mapped_column(Enum(LedgerSide, native_enum=False, length=8))
    status: Mapped[LedgerAccountStatus] = mapped_column(
        Enum(LedgerAccountStatus, native_enum=False, length=16),
        default=LedgerAccountStatus.active,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(32), default="SYLORA_CREDIT")
    scope: Mapped[str] = mapped_column(String(160))
    allow_negative: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"
    __table_args__ = (
        UniqueConstraint(
            "idempotency_actor_scope",
            "idempotency_scope",
            "idempotency_key",
            name="uq_ledger_transactions_idempotency",
        ),
        UniqueConstraint("reverses_transaction_id", name="uq_ledger_transactions_reversal"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    transaction_type: Mapped[LedgerTransactionType] = mapped_column(
        Enum(LedgerTransactionType, native_enum=False, length=24), index=True
    )
    status: Mapped[LedgerTransactionStatus] = mapped_column(
        Enum(LedgerTransactionStatus, native_enum=False, length=16),
        default=LedgerTransactionStatus.posted,
        index=True,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    idempotency_actor_scope: Mapped[str] = mapped_column(String(80))
    idempotency_scope: Mapped[str] = mapped_column(String(96))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    external_reference: Mapped[str | None] = mapped_column(String(255), index=True)
    transaction_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    reverses_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    __table_args__ = (
        CheckConstraint(
            "(debit_minor > 0 AND credit_minor IS NULL) OR "
            "(credit_minor > 0 AND debit_minor IS NULL)",
            name="ck_ledger_entries_exactly_one_side",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), index=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ledger_accounts.id", ondelete="RESTRICT"), index=True
    )
    debit_minor: Mapped[int | None] = mapped_column(BigInteger)
    credit_minor: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentOperationType(enum.StrEnum):
    topup = "topup"
    refund = "refund"
    payout = "payout"


class PaymentOperationStatus(enum.StrEnum):
    pending = "pending"
    requires_action = "requires_action"
    processing = "processing"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class PaymentOperation(Base):
    __tablename__ = "payment_operations"
    __table_args__ = (
        UniqueConstraint(
            "actor_user_id",
            "operation_type",
            "idempotency_key",
            name="uq_payment_operations_idempotency",
        ),
        UniqueConstraint(
            "provider", "provider_operation_id", name="uq_payment_operations_provider_reference"
        ),
        CheckConstraint(
            "amount_minor > 0 AND settlement_amount_minor > 0",
            name="ck_payment_operations_positive_amount",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    operation_type: Mapped[PaymentOperationType] = mapped_column(
        Enum(PaymentOperationType, native_enum=False, length=16), index=True
    )
    status: Mapped[PaymentOperationStatus] = mapped_column(
        Enum(PaymentOperationStatus, native_enum=False, length=24), index=True
    )
    provider: Mapped[str] = mapped_column(String(64))
    provider_operation_id: Mapped[str] = mapped_column(String(255))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(32), default="SYLORA_CREDIT")
    settlement_amount_minor: Mapped[int] = mapped_column(BigInteger)
    settlement_currency: Mapped[str] = mapped_column(String(8))
    safe_provider_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ledger_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"
    __table_args__ = (
        UniqueConstraint("provider", "provider_event_id", name="uq_payment_webhook_provider_event"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String(64), index=True)
    provider_event_id: Mapped[str] = mapped_column(String(255))
    payload_sha256: Mapped[str] = mapped_column(String(64))
    signature_verified: Mapped[bool] = mapped_column(Boolean)
    event_type: Mapped[str] = mapped_column(String(96))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


@event.listens_for(LedgerEntry, "before_update")
@event.listens_for(LedgerEntry, "before_delete")
def reject_ledger_entry_mutation(*_: object) -> None:
    raise ValueError("ledger entries are immutable")


@event.listens_for(LedgerTransaction, "before_update")
@event.listens_for(LedgerTransaction, "before_delete")
def reject_posted_transaction_mutation(_: object, __: object, target: LedgerTransaction) -> None:
    if target.status in {LedgerTransactionStatus.posted, LedgerTransactionStatus.reversed}:
        raise ValueError("posted ledger transactions are immutable")


Index(
    "ix_ledger_entries_account_created",
    LedgerEntry.account_id,
    LedgerEntry.created_at,
    LedgerEntry.id,
)
Index(
    "ix_ledger_transactions_actor_created",
    LedgerTransaction.actor_user_id,
    LedgerTransaction.created_at,
    LedgerTransaction.id,
)
