from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.config import Settings
from app.errors import APIError


@dataclass(frozen=True)
class ProviderOperationResult:
    provider_operation_id: str
    status: str
    ledger_amount_minor: int
    settlement_amount_minor: int
    client_data: dict[str, Any]


@dataclass(frozen=True)
class VerifiedWebhook:
    event_id: str
    event_type: str
    operation_id: str | None
    operation_status: str | None
    safe_data: dict[str, Any]


class PaymentProvider(Protocol):
    """Boundary implemented only by a configured, real payment integration."""

    name: str

    async def create_topup_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
    ) -> ProviderOperationResult: ...

    async def create_refund(
        self,
        *,
        idempotency_key: str,
        provider_operation_id: str,
        amount_minor: int,
    ) -> ProviderOperationResult: ...

    async def create_payout(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        destination_reference: str,
    ) -> ProviderOperationResult: ...

    async def verify_webhook(self, *, raw_body: bytes, signature: str) -> VerifiedWebhook: ...


class UnconfiguredPaymentProvider:
    name = "unconfigured"

    @staticmethod
    def _unavailable() -> APIError:
        return APIError(
            503,
            "payment_provider_unavailable",
            "Payment provider unavailable",
            "No real payment provider is selected and configured for this deployment.",
        )

    async def create_topup_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
    ) -> ProviderOperationResult:
        raise self._unavailable()

    async def create_refund(
        self,
        *,
        idempotency_key: str,
        provider_operation_id: str,
        amount_minor: int,
    ) -> ProviderOperationResult:
        raise self._unavailable()

    async def create_payout(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        destination_reference: str,
    ) -> ProviderOperationResult:
        raise self._unavailable()

    async def verify_webhook(self, *, raw_body: bytes, signature: str) -> VerifiedWebhook:
        raise self._unavailable()


def configured_payment_provider(settings: Settings) -> PaymentProvider:
    # Provider implementations are injected into create_app. Merely naming a
    # provider cannot enable payments without its real API and signature flow.
    return UnconfiguredPaymentProvider()
