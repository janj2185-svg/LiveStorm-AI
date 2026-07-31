from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.ledger_models import (
    LedgerAccountStatus,
    LedgerAccountType,
    LedgerSide,
    LedgerTransactionStatus,
    LedgerTransactionType,
    PaymentOperationStatus,
    PaymentOperationType,
)

IdempotencyKey = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


class LedgerPosting(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_id: uuid.UUID
    side: LedgerSide
    amount_minor: int = Field(gt=0, strict=True)


class LedgerAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID | None
    account_type: LedgerAccountType
    normal_side: LedgerSide
    status: LedgerAccountStatus
    currency: str
    scope: str
    balance_minor: int


class LedgerEntryResponse(BaseModel):
    account_id: uuid.UUID
    side: LedgerSide
    amount_minor: int


class LedgerTransactionResponse(BaseModel):
    id: uuid.UUID
    transaction_type: LedgerTransactionType
    status: LedgerTransactionStatus
    actor_user_id: uuid.UUID | None
    external_reference: str | None
    metadata: dict[str, Any]
    reverses_transaction_id: uuid.UUID | None
    created_at: datetime
    posted_at: datetime
    reversed_at: datetime | None
    entries: list[LedgerEntryResponse]


class LedgerTransactionPage(BaseModel):
    items: list[LedgerTransactionResponse]
    next_cursor: str | None


class WalletBalanceResponse(BaseModel):
    asset_code: str
    spendable_minor: int
    account_id: uuid.UUID
    computed_at: datetime


class IssuanceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: uuid.UUID
    amount_minor: int = Field(gt=0, le=100_000_000, strict=True)
    reason: str = Field(min_length=3, max_length=500)


class ReversalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=3, max_length=500)


class TopUpIntentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_minor: int = Field(gt=0, le=100_000_000, strict=True)
    settlement_currency: str = Field(pattern=r"^[A-Z]{3}$")
    return_url: str = Field(min_length=8, max_length=2048)


class PayoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount_minor: int = Field(gt=0, le=100_000_000, strict=True)
    settlement_currency: str = Field(pattern=r"^[A-Z]{3}$")
    destination_reference: str = Field(min_length=3, max_length=255)


class PaymentOperationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    operation_type: PaymentOperationType
    status: PaymentOperationStatus
    provider: str
    amount_minor: int
    currency: str
    settlement_amount_minor: int
    settlement_currency: str
    safe_provider_data: dict[str, Any]
    failure_code: str | None
    created_at: datetime
