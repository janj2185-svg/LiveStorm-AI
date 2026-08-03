from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx

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

    async def create_checkout_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
        line_references: list[str],
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

    async def create_checkout_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
        line_references: list[str],
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


StripeForm = list[tuple[str, str]]


def _secret_value(value: Any | None) -> str | None:
    if value is None:
        return None
    resolved = value.get_secret_value() if hasattr(value, "get_secret_value") else str(value)
    resolved = resolved.strip()
    return resolved or None


def _stripe_status(raw_status: str | None) -> str:
    match raw_status:
        case "succeeded" | "paid" | "complete":
            return "succeeded"
        case "requires_action" | "requires_payment_method" | "requires_confirmation":
            return "requires_action"
        case "processing" | "open":
            return "processing"
        case "canceled" | "cancelled" | "expired":
            return "cancelled"
        case "failed":
            return "failed"
        case _:
            return "pending"


def _form_value(value: str | int | bool) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _append_metadata(form: StripeForm, prefix: str, metadata: dict[str, str]) -> None:
    for key, value in metadata.items():
        form.append((f"{prefix}[metadata][{key}]", value))


class StripePaymentProvider:
    """Stripe REST adapter. It is constructed only when real Stripe secrets exist."""

    name = "stripe"

    def __init__(
        self,
        *,
        secret_key: str,
        webhook_secret: str,
        publishable_key: str | None = None,
        api_base_url: str = "https://api.stripe.com/v1",
        timeout_seconds: float = 20,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not secret_key or not webhook_secret:
            raise ValueError("Stripe secret key and webhook secret are required")
        if not secret_key.startswith(("sk_test_", "sk_live_")):
            raise ValueError("Stripe secret key must be a Stripe sk_test_ or sk_live_ value")
        if not webhook_secret.startswith("whsec_"):
            raise ValueError("Stripe webhook secret must be a Stripe whsec_ value")
        self._secret_key = secret_key
        self._webhook_secret = webhook_secret
        self._publishable_key = publishable_key
        self._api_base_url = api_base_url.rstrip("/")
        self._timeout = httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 10))
        self._transport = transport

    def _headers(self, idempotency_key: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._secret_key}",
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        form: StripeForm | None = None,
        params: StripeForm | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                follow_redirects=False,
                transport=self._transport,
            ) as client:
                response = await client.request(
                    method,
                    f"{self._api_base_url}{path}",
                    headers=self._headers(idempotency_key),
                    content=urlencode(form).encode() if form is not None else None,
                    params=params,
                )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise APIError(
                503,
                "payment_provider_network_error",
                "Payment provider temporarily unavailable",
                "Stripe could not be reached. Retry the operation later.",
            ) from exc
        try:
            data = response.json()
        except json.JSONDecodeError as exc:
            raise APIError(
                502,
                "payment_provider_invalid_response",
                "Invalid payment provider response",
                "Stripe returned a non-JSON response.",
            ) from exc
        if response.status_code == 429 or response.status_code >= 500:
            raise APIError(
                503,
                "payment_provider_temporarily_unavailable",
                "Payment provider temporarily unavailable",
                "Stripe rejected the request temporarily. Retry later.",
            )
        if response.status_code < 200 or response.status_code >= 300:
            error = data.get("error") if isinstance(data, dict) else None
            code = str(error.get("code") or error.get("type") or "payment_provider_rejected")
            raise APIError(
                502,
                "payment_provider_rejected",
                "Payment provider rejected the request",
                "Stripe rejected the payment operation.",
                extra={"provider_code": code},
            )
        if not isinstance(data, dict):
            raise APIError(
                502,
                "payment_provider_invalid_response",
                "Invalid payment provider response",
                "Stripe returned an unsupported response shape.",
            )
        return data

    def _checkout_client_data(self, data: dict[str, Any]) -> dict[str, Any]:
        client_data: dict[str, Any] = {
            "checkout_session_id": str(data["id"]),
            "checkout_url": str(data["url"]),
        }
        if self._publishable_key:
            client_data["publishable_key"] = self._publishable_key
        return client_data

    async def _create_checkout_session(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
        operation_type: str,
        line_references: list[str] | None = None,
    ) -> ProviderOperationResult:
        metadata = {
            "operation_type": operation_type,
            "user_reference": user_reference,
            "idempotency_key": idempotency_key,
        }
        if line_references:
            metadata["line_references_hash"] = hashlib.sha256(
                "\n".join(sorted(line_references)).encode()
            ).hexdigest()
        form: StripeForm = [
            ("mode", "payment"),
            ("client_reference_id", user_reference),
            ("success_url", return_url),
            ("cancel_url", return_url),
            ("line_items[0][quantity]", "1"),
            ("line_items[0][price_data][currency]", settlement_currency.lower()),
            ("line_items[0][price_data][unit_amount]", _form_value(amount_minor)),
            (
                "line_items[0][price_data][product_data][name]",
                "SYLORA credits" if operation_type == "topup" else "SYLORA checkout",
            ),
        ]
        _append_metadata(form, "payment_intent_data", metadata)
        for key, value in metadata.items():
            form.append((f"metadata[{key}]", value))
        data = await self._request(
            "POST",
            "/checkout/sessions",
            form=form,
            idempotency_key=idempotency_key,
        )
        if not data.get("id") or not data.get("url"):
            raise APIError(
                502,
                "payment_provider_invalid_response",
                "Invalid payment provider response",
                "Stripe did not return a usable Checkout Session.",
            )
        status = "pending"
        if data.get("payment_status") == "paid":
            status = "succeeded"
        elif data.get("status") == "expired":
            status = "cancelled"
        return ProviderOperationResult(
            provider_operation_id=str(data["id"]),
            status=status,
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data=self._checkout_client_data(data),
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
        return await self._create_checkout_session(
            idempotency_key=idempotency_key,
            user_reference=user_reference,
            amount_minor=amount_minor,
            settlement_currency=settlement_currency,
            return_url=return_url,
            operation_type="topup",
        )

    async def create_refund(
        self,
        *,
        idempotency_key: str,
        provider_operation_id: str,
        amount_minor: int,
    ) -> ProviderOperationResult:
        payment_intent_id = provider_operation_id
        if provider_operation_id.startswith("cs_"):
            session = await self._request(
                "GET",
                f"/checkout/sessions/{provider_operation_id}",
                params=[("expand[]", "payment_intent")],
            )
            payment_intent = session.get("payment_intent")
            if isinstance(payment_intent, dict):
                payment_intent_id = str(payment_intent.get("id") or "")
            elif isinstance(payment_intent, str):
                payment_intent_id = payment_intent
        if not payment_intent_id.startswith("pi_"):
            raise APIError(
                422,
                "payment_operation_not_refundable",
                "Payment operation is not refundable",
                "Stripe refunds require a settled PaymentIntent reference.",
            )
        data = await self._request(
            "POST",
            "/refunds",
            form=[
                ("payment_intent", payment_intent_id),
                ("amount", _form_value(amount_minor)),
                ("metadata[provider_operation_id]", provider_operation_id),
            ],
            idempotency_key=idempotency_key,
        )
        return ProviderOperationResult(
            provider_operation_id=str(data.get("id") or payment_intent_id),
            status=_stripe_status(str(data.get("status") or "")),
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={"refund_id": str(data.get("id") or "")},
        )

    async def create_checkout_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
        line_references: list[str],
    ) -> ProviderOperationResult:
        return await self._create_checkout_session(
            idempotency_key=idempotency_key,
            user_reference=user_reference,
            amount_minor=amount_minor,
            settlement_currency=settlement_currency,
            return_url=return_url,
            operation_type="checkout",
            line_references=line_references,
        )

    async def create_payout(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        destination_reference: str,
    ) -> ProviderOperationResult:
        if not destination_reference.startswith("acct_"):
            raise APIError(
                422,
                "invalid_payout_destination",
                "Invalid payout destination",
                "Stripe payouts require a connected account destination reference.",
            )
        data = await self._request(
            "POST",
            "/transfers",
            form=[
                ("amount", _form_value(amount_minor)),
                ("currency", settlement_currency.lower()),
                ("destination", destination_reference),
                ("metadata[user_reference]", user_reference),
                ("metadata[idempotency_key]", idempotency_key),
            ],
            idempotency_key=idempotency_key,
        )
        return ProviderOperationResult(
            provider_operation_id=str(data.get("id") or ""),
            status="succeeded",
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={"transfer_id": str(data.get("id") or "")},
        )

    def _verify_stripe_signature(self, raw_body: bytes, signature: str) -> None:
        parts: dict[str, list[str]] = {}
        for item in signature.split(","):
            if "=" not in item:
                continue
            key, value = item.split("=", 1)
            parts.setdefault(key, []).append(value)
        timestamps = parts.get("t") or []
        signatures = parts.get("v1") or []
        if not timestamps or not signatures:
            raise self._invalid_signature()
        try:
            timestamp = int(timestamps[-1])
        except ValueError as exc:
            raise self._invalid_signature() from exc
        if abs(time.time() - timestamp) > 300:
            raise self._invalid_signature()
        signed_payload = f"{timestamp}.".encode() + raw_body
        expected = hmac.new(
            self._webhook_secret.encode(),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()
        if not any(hmac.compare_digest(expected, candidate) for candidate in signatures):
            raise self._invalid_signature()

    @staticmethod
    def _invalid_signature() -> APIError:
        return APIError(
            400,
            "invalid_payment_webhook_signature",
            "Invalid payment webhook signature",
            "The Stripe-Signature header could not be verified.",
        )

    async def verify_webhook(self, *, raw_body: bytes, signature: str) -> VerifiedWebhook:
        self._verify_stripe_signature(raw_body, signature)
        try:
            event = json.loads(raw_body)
            event_id = str(event["id"])
            event_type = str(event["type"])
            data_object = event["data"]["object"]
            if not isinstance(data_object, dict):
                raise TypeError
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise APIError(
                400,
                "invalid_payment_webhook_payload",
                "Invalid payment webhook payload",
                "The verified Stripe webhook payload has an unsupported shape.",
            ) from exc

        operation_id: str | None = None
        operation_status: str | None = None
        if event_type.startswith("checkout.session."):
            operation_id = str(data_object.get("id") or "")
            if event_type == "checkout.session.completed":
                operation_status = (
                    "succeeded" if data_object.get("payment_status") == "paid" else "processing"
                )
            elif event_type == "checkout.session.async_payment_succeeded":
                operation_status = "succeeded"
            elif event_type == "checkout.session.async_payment_failed":
                operation_status = "failed"
            elif event_type == "checkout.session.expired":
                operation_status = "cancelled"
        elif event_type.startswith("payment_intent."):
            operation_id = str(data_object.get("id") or "")
            operation_status = _stripe_status(str(data_object.get("status") or ""))
        elif event_type.startswith("refund."):
            operation_id = str(data_object.get("payment_intent") or "")
            operation_status = _stripe_status(str(data_object.get("status") or ""))
        elif event_type.startswith(("transfer.", "payout.")):
            operation_id = str(data_object.get("id") or "")
            operation_status = "failed" if event_type.endswith(".failed") else "succeeded"
        if operation_id == "":
            operation_id = None
        return VerifiedWebhook(
            event_id=event_id,
            event_type=event_type,
            operation_id=operation_id,
            operation_status=operation_status,
            safe_data={
                "livemode": bool(event.get("livemode", False)),
                "object": str(data_object.get("object") or ""),
            },
        )


class StripeTestSandboxProvider:
    """Deterministic CI-only Stripe-shaped provider; refuses production."""

    name = "stripe_test_sandbox"

    def __init__(self, *, environment: str) -> None:
        if environment == "production":
            raise ValueError("Stripe test sandbox provider is forbidden in production")
        self.environment = environment

    @staticmethod
    def _operation_id(prefix: str, payload: dict[str, Any]) -> str:
        encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        return f"sandbox_{prefix}_{hashlib.sha256(encoded).hexdigest()[:32]}"

    async def create_topup_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
    ) -> ProviderOperationResult:
        operation_id = self._operation_id(
            "topup",
            {
                "idempotency_key": idempotency_key,
                "user_reference": user_reference,
                "amount_minor": amount_minor,
                "settlement_currency": settlement_currency,
            },
        )
        return ProviderOperationResult(
            provider_operation_id=operation_id,
            status="requires_action",
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={
                "sandbox": True,
                "sandbox_provider": self.name,
                "checkout_url": f"{return_url.rstrip('/')}/sandbox-payment/{operation_id}",
            },
        )

    async def create_refund(
        self,
        *,
        idempotency_key: str,
        provider_operation_id: str,
        amount_minor: int,
    ) -> ProviderOperationResult:
        operation_id = self._operation_id(
            "refund",
            {
                "idempotency_key": idempotency_key,
                "provider_operation_id": provider_operation_id,
                "amount_minor": amount_minor,
            },
        )
        return ProviderOperationResult(
            provider_operation_id=operation_id,
            status="succeeded",
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={"sandbox": True, "sandbox_provider": self.name},
        )

    async def create_checkout_intent(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        return_url: str,
        line_references: list[str],
    ) -> ProviderOperationResult:
        operation_id = self._operation_id(
            "checkout",
            {
                "idempotency_key": idempotency_key,
                "user_reference": user_reference,
                "amount_minor": amount_minor,
                "settlement_currency": settlement_currency,
                "line_references": sorted(line_references),
            },
        )
        return ProviderOperationResult(
            provider_operation_id=operation_id,
            status="requires_action",
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={
                "sandbox": True,
                "sandbox_provider": self.name,
                "checkout_url": f"{return_url.rstrip('/')}/sandbox-payment/{operation_id}",
            },
        )

    async def create_payout(
        self,
        *,
        idempotency_key: str,
        user_reference: str,
        amount_minor: int,
        settlement_currency: str,
        destination_reference: str,
    ) -> ProviderOperationResult:
        operation_id = self._operation_id(
            "payout",
            {
                "idempotency_key": idempotency_key,
                "user_reference": user_reference,
                "amount_minor": amount_minor,
                "settlement_currency": settlement_currency,
                "destination_reference": destination_reference,
            },
        )
        return ProviderOperationResult(
            provider_operation_id=operation_id,
            status="processing",
            ledger_amount_minor=amount_minor,
            settlement_amount_minor=amount_minor,
            client_data={"sandbox": True, "sandbox_provider": self.name},
        )

    async def verify_webhook(self, *, raw_body: bytes, signature: str) -> VerifiedWebhook:
        raise APIError(
            503,
            "payment_sandbox_webhooks_unavailable",
            "Payment sandbox webhook unavailable",
            "The Stripe test sandbox provider does not process external webhooks.",
        )


def configured_payment_provider(settings: Settings) -> PaymentProvider:
    if settings.payment_provider == "stripe":
        secret_key = _secret_value(settings.stripe_secret_key)
        webhook_secret = _secret_value(settings.stripe_webhook_secret)
        if secret_key and webhook_secret:
            return StripePaymentProvider(
                secret_key=secret_key,
                webhook_secret=webhook_secret,
                publishable_key=settings.stripe_publishable_key,
            )
        if settings.payment_sandbox_mode and settings.environment in {
            "development",
            "test",
            "staging",
        }:
            return StripeTestSandboxProvider(environment=settings.environment)
    # Merely naming a provider cannot enable payments without its real API and
    # signature flow. Missing production Stripe secrets therefore fail closed.
    return UnconfiguredPaymentProvider()
