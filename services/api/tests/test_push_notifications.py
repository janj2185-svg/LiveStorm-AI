from __future__ import annotations

import logging
import uuid
from typing import Any, cast

import httpx
import pytest
from sqlalchemy import select

from app.push_models import DevicePushToken
from app.push_service import (
    FcmHttpV1Provider,
    PushMessage,
    UnconfiguredPushProvider,
    push_dispatcher_is_configured,
)
from tests.conftest import bearer, login, register_and_verify


def test_dispatcher_without_configuration_marker_fails_closed() -> None:
    assert push_dispatcher_is_configured(cast(Any, object())) is False


async def test_unconfigured_provider_rejects_registration_but_allows_cleanup(api: Any) -> None:
    await register_and_verify(api)
    tokens = await login(api)
    headers = bearer(tokens["access_token"])

    registered = await api.client.post(
        "/v1/push/devices",
        headers=headers,
        json={"platform": "web", "token": "web-token-for-tests-123456"},
    )
    assert registered.status_code == 503, registered.text
    assert registered.json()["code"] == "push_provider_unavailable"

    devices = await api.client.get("/v1/push/devices", headers=headers)
    assert devices.status_code == 200, devices.text
    assert devices.json() == []

    unregistered = await api.client.post(
        "/v1/push/devices/unregister",
        headers=headers,
        json={"platform": "web", "token": "web-token-for-tests-123456"},
    )
    assert unregistered.status_code == 200, unregistered.text
    assert unregistered.json() == {"status": "unregistered"}


async def test_register_list_and_unregister_push_device(api_factory: Any) -> None:
    dispatcher = FcmHttpV1Provider(
        project_id="test-project",
        service_account={"client_email": "push@example.test", "private_key": "unused"},
    )
    async with api_factory(push_dispatcher=dispatcher) as api:
        await register_and_verify(api)
        tokens = await login(api)
        headers = bearer(tokens["access_token"])

        registered = await api.client.post(
            "/v1/push/devices",
            headers=headers,
            json={"platform": "web", "token": "web-token-for-tests-123456"},
        )
        assert registered.status_code == 201, registered.text
        body = registered.json()
        assert body["platform"] == "web"
        assert body["token"] == "web-token-for-tests-123456"
        assert body["revoked"] is False

        repeated = await api.client.post(
            "/v1/push/devices",
            headers=headers,
            json={"platform": "web", "token": "web-token-for-tests-123456"},
        )
        assert repeated.status_code == 201, repeated.text
        assert repeated.json()["id"] == body["id"]

        devices = await api.client.get("/v1/push/devices", headers=headers)
        assert devices.status_code == 200, devices.text
        assert [item["id"] for item in devices.json()] == [body["id"]]

        unregistered = await api.client.post(
            "/v1/push/devices/unregister",
            headers=headers,
            json={"platform": "web", "token": "web-token-for-tests-123456"},
        )
        assert unregistered.status_code == 200, unregistered.text
        assert unregistered.json() == {"status": "unregistered"}

        devices = await api.client.get("/v1/push/devices", headers=headers)
        assert devices.status_code == 200, devices.text
        assert devices.json()[0]["revoked"] is True


@pytest.mark.parametrize(
    ("status_code", "error_payload"),
    [
        (404, {"error": {"status": "NOT_FOUND"}}),
        (
            400,
            {
                "error": {
                    "status": "INVALID_ARGUMENT",
                    "details": [
                        {
                            "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                            "errorCode": "INVALID_ARGUMENT",
                        }
                    ],
                }
            },
        ),
        (
            400,
            {
                "error": {
                    "status": "INVALID_ARGUMENT",
                    "details": [
                        {
                            "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                            "errorCode": "UNREGISTERED",
                        }
                    ],
                }
            },
        ),
    ],
)
async def test_fcm_invalid_token_response_revokes_device(
    api_factory: Any,
    status_code: int,
    error_payload: dict[str, Any],
) -> None:
    async def fcm_response(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=error_payload, request=request)

    fcm_client = httpx.AsyncClient(transport=httpx.MockTransport(fcm_response))
    dispatcher = FcmHttpV1Provider(
        project_id="test-project",
        service_account={"client_email": "push@example.test", "private_key": "unused"},
        client=fcm_client,
    )
    dispatcher._access_token = "test-access-token"
    dispatcher._access_token_expires_at = float("inf")

    try:
        async with api_factory(push_dispatcher=dispatcher) as api:
            await register_and_verify(api)
            tokens = await login(api)
            registered = await api.client.post(
                "/v1/push/devices",
                headers=bearer(tokens["access_token"]),
                json={"platform": "web", "token": "invalid-fcm-token-123456"},
            )
            assert registered.status_code == 201, registered.text
            user = await api.user("member@example.com")

            async with api.app.state.session_factory() as session:
                summary = await dispatcher.dispatch(
                    session,
                    user_ids={user.id},
                    message=PushMessage(title="Test", body="Invalid token"),
                )

            assert summary.attempted == 1
            assert summary.sent == 0
            assert summary.failed == 1
            async with api.app.state.session_factory() as session:
                device = await session.scalar(
                    select(DevicePushToken).where(
                        DevicePushToken.token == "invalid-fcm-token-123456"
                    )
                )
                assert device is not None
                assert device.revoked_at is not None
    finally:
        await fcm_client.aclose()


async def test_unconfigured_push_provider_skips_with_structured_log(caplog: Any) -> None:
    caplog.set_level(logging.INFO, logger="sylora.push")
    provider = UnconfiguredPushProvider()
    user_id = uuid.uuid4()

    summary = await provider.dispatch(
        cast(Any, None),
        user_ids={user_id},
        message=PushMessage(title="Ignored", body="No provider configured."),
    )

    assert summary.skipped == 1
    record = next(item for item in caplog.records if item.message == "push_skipped")
    assert record.reason == "unconfigured"
    assert record.user_count == 1
