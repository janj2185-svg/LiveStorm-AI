from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs

import httpx
import pytest

from app.errors import APIError
from app.payments import StripePaymentProvider


@pytest.mark.asyncio
async def test_stripe_create_topup_intent_creates_checkout_session() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        assert request.method == "POST"
        assert request.url.path == "/v1/checkout/sessions"
        assert request.headers["Authorization"] == "Bearer sk_test_unit"
        assert request.headers["Idempotency-Key"] == "topup-stripe-0001"
        form = parse_qs(request.content.decode())
        assert form["mode"] == ["payment"]
        assert form["client_reference_id"] == ["user-123"]
        assert form["line_items[0][price_data][currency]"] == ["usd"]
        assert form["line_items[0][price_data][unit_amount]"] == ["1500"]
        assert form["metadata[operation_type]"] == ["topup"]
        assert form["payment_intent_data[metadata][user_reference]"] == ["user-123"]
        return httpx.Response(
            200,
            json={
                "id": "cs_test_topup",
                "object": "checkout.session",
                "status": "open",
                "payment_status": "unpaid",
                "url": "https://checkout.stripe.com/c/pay/cs_test_topup",
            },
        )

    provider = StripePaymentProvider(
        secret_key="sk_test_unit",
        webhook_secret="whsec_unit",
        publishable_key="pk_test_unit",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.create_topup_intent(
        idempotency_key="topup-stripe-0001",
        user_reference="user-123",
        amount_minor=1500,
        settlement_currency="USD",
        return_url="https://web.test.sylora.local/wallet",
    )

    assert len(seen) == 1
    assert result.provider_operation_id == "cs_test_topup"
    assert result.status == "pending"
    assert result.ledger_amount_minor == 1500
    assert result.settlement_amount_minor == 1500
    assert result.client_data == {
        "checkout_session_id": "cs_test_topup",
        "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_topup",
        "publishable_key": "pk_test_unit",
    }


@pytest.mark.asyncio
async def test_stripe_webhook_signature_verifies_checkout_completion() -> None:
    provider = StripePaymentProvider(
        secret_key="sk_test_unit",
        webhook_secret="whsec_unit",
    )
    payload = {
        "id": "evt_test_checkout_completed",
        "type": "checkout.session.completed",
        "livemode": False,
        "data": {
            "object": {
                "id": "cs_test_topup",
                "object": "checkout.session",
                "payment_status": "paid",
            }
        },
    }
    raw_body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.".encode() + raw_body
    digest = hmac.new(b"whsec_unit", signed_payload, hashlib.sha256).hexdigest()

    verified = await provider.verify_webhook(
        raw_body=raw_body,
        signature=f"t={timestamp},v1={digest}",
    )

    assert verified.event_id == "evt_test_checkout_completed"
    assert verified.event_type == "checkout.session.completed"
    assert verified.operation_id == "cs_test_topup"
    assert verified.operation_status == "succeeded"
    assert verified.safe_data == {"livemode": False, "object": "checkout.session"}

    with pytest.raises(APIError, match="invalid_payment_webhook_signature"):
        await provider.verify_webhook(raw_body=raw_body, signature=f"t={timestamp},v1=bad")
