from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from collections.abc import AsyncIterator, Mapping, Sequence
from datetime import UTC, datetime
from typing import Any

import jwt
import pytest
from fastapi import WebSocketDisconnect
from sqlalchemy import select

from app.ai_models import AICapability, PromptTemplate, PromptTemplateState
from app.gift_models import GiftEvent
from app.live_adapters import (
    AdapterActionResult,
    AdapterConnectionContext,
    AdapterConnectionResult,
    AdapterHealth,
    AdapterInboundEvent,
    BasePlatformAdapter,
    PlatformDescriptor,
    obs_authentication_response,
)
from app.live_models import (
    AILivePersona,
    AILiveRule,
    IntegrationConnection,
    IntegrationPlatform,
    LiveAction,
    LiveActionState,
    LiveActionType,
    LiveCapability,
    LiveDestination,
    LiveDestinationState,
    LiveEvent,
    LiveNormalizedEventType,
    LiveRuleRisk,
    LiveSession,
    LiveSessionState,
)
from app.live_rules import evaluate_condition, validate_condition_dsl
from app.live_service import (
    normalize_sylora_gift_event,
    persist_normalized_event,
    process_webhook_delivery,
    replay_event,
)
from app.models import Role, UserRole
from app.routers.live import live_websocket
from tests.conftest import APIHarness, bearer, login, register_and_verify


class TestAdapter(BasePlatformAdapter):
    __test__ = False

    def __init__(
        self,
        platform: IntegrationPlatform,
        capabilities: frozenset[LiveCapability],
    ) -> None:
        self.platform = platform
        self.potential_capabilities = capabilities
        self.healthy = True
        self.fail_reconnect = False
        self.actions: list[tuple[str, dict[str, Any]]] = []

    def descriptor(self) -> PlatformDescriptor:
        return PlatformDescriptor(
            platform=self.platform,
            available=True,
            status="test_adapter_injected",
            potential_capabilities=self.potential_capabilities,
        )

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        if not self.healthy:
            from app.live_adapters import AdapterError

            raise AdapterError("test_adapter_unhealthy", retryable=True)
        return AdapterConnectionResult(
            verified_capabilities=self.potential_capabilities,
            external_account_id=context.external_account_id or "test-account",
            external_channel_id=context.external_channel_id or "test-channel",
            provider_metadata={"transport_verified": True},
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        return AdapterHealth(
            ok=self.healthy,
            status="connected" if self.healthy else "test_adapter_unhealthy",
            verified_capabilities=self.potential_capabilities if self.healthy else frozenset(),
        )

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        assert context.connection_secret
        expected = hmac.new(context.connection_secret.encode(), body, hashlib.sha256).hexdigest()
        supplied = headers.get("x-test-signature", "")
        if not hmac.compare_digest(supplied, expected):
            from app.live_adapters import AdapterError

            raise AdapterError("test_webhook_signature_invalid")
        return str(json.loads(body)["id"])

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        payload = json.loads(body)
        return [
            AdapterInboundEvent(
                platform_event_id=str(payload["id"]),
                event_type=LiveNormalizedEventType.chat,
                occurred_at=datetime.now(UTC),
                actor_platform_id="viewer-1",
                actor_display_name="Viewer",
                text=str(payload["text"]),
                safe_metadata={"official_test_transport": True},
            )
        ]

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        if False:
            yield AdapterInboundEvent(
                platform_event_id="unreachable",
                event_type=LiveNormalizedEventType.custom,
                occurred_at=datetime.now(UTC),
            )

    async def create_broadcast(
        self,
        context: AdapterConnectionContext,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        self.actions.append(("create", dict(configuration)))
        return AdapterActionResult(
            provider_reference="broadcast-ref",
            external_broadcast_id=str(configuration.get("ingest_path", "external-broadcast")),
        )

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        self.actions.append(("update", dict(configuration)))
        return AdapterActionResult(provider_reference=external_broadcast_id)

    async def end_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
    ) -> AdapterActionResult:
        self.actions.append(("end", {"id": external_broadcast_id}))
        return AdapterActionResult(provider_reference=external_broadcast_id)

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        self.actions.append(("chat", {"text": text}))
        return AdapterActionResult(provider_reference="message-ref")


class TestRegistry:
    __test__ = False

    def __init__(self, adapters: Sequence[TestAdapter]) -> None:
        self.adapters = {adapter.platform: adapter for adapter in adapters}

    def resolve(self, platform: IntegrationPlatform) -> TestAdapter:
        return self.adapters[platform]

    def descriptors(self) -> tuple[PlatformDescriptor, ...]:
        return tuple(adapter.descriptor() for adapter in self.adapters.values())


class ReplayWebSocket:
    def __init__(
        self,
        app: Any,
        authorization: str,
        since: str,
    ) -> None:
        self.app = app
        self.headers = {"authorization": authorization}
        self.query_params = {"since": since}
        self.accepted = False
        self.close_codes: list[int] = []
        self.sent: list[dict[str, Any]] = []

    async def accept(self) -> None:
        self.accepted = True

    async def close(self, code: int) -> None:
        self.close_codes.append(code)

    async def send_json(self, payload: dict[str, Any]) -> None:
        self.sent.append(payload)

    async def receive_text(self) -> str:
        raise WebSocketDisconnect()


async def creator_headers(api: APIHarness) -> tuple[dict[str, str], uuid.UUID]:
    await register_and_verify(
        api,
        email="creator-live@example.com",
        display_name="Live Creator",
    )
    user = await api.user("creator-live@example.com")
    async with api.app.state.session_factory() as db:
        role = await db.scalar(select(Role).where(Role.name == "creator"))
        assert role is not None
        db.add(UserRole(user_id=user.id, role_id=role.id))
        await db.commit()
    tokens = await login(api, email="creator-live@example.com")
    return bearer(tokens["access_token"]), user.id


async def connect_test_integration(
    api: APIHarness,
    headers: dict[str, str],
    platform: str = "rtmp_webrtc",
    *,
    capabilities: list[str] | None = None,
) -> dict[str, Any]:
    response = await api.client.post(
        "/v1/live/integrations/connect",
        headers=headers,
        json={
            "platform": platform,
            "connection_secret": "test-webhook-secret",
            "requested_capabilities": capabilities or ["publish", "events"],
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_platform_capability_gating_and_secret_redaction(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, _ = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        assert connection["state"] == "connected"
        assert sorted(connection["verified_capabilities"]) == [
            "events",
            "first_party_ingest",
            "publish",
        ]
        assert connection["connection_secret_configured"] is True
        assert "test-webhook-secret" not in json.dumps(connection)

    async with api_factory() as unconfigured_api:
        headers, _ = await creator_headers(unconfigured_api)
        denied = await unconfigured_api.client.post(
            "/v1/live/integrations/connect",
            headers=headers,
            json={"platform": "tiktok"},
        )
        assert denied.status_code == 409
        assert denied.json()["code"] == "blocked_by_provider_access"


@pytest.mark.asyncio
async def test_session_preflight_state_machine_and_reveal_once_key(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, _ = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={
                "title": "Official live test",
                "destinations": [
                    {
                        "connection_id": connection["id"],
                        "publish_enabled": True,
                        "events_enabled": True,
                    }
                ],
            },
        )
        assert created.status_code == 201, created.text
        body = created.json()
        raw_key = body["stream_key_once"]
        assert len(raw_key) >= 32
        session_id = body["id"]
        listing = await api.client.get(f"/v1/live/sessions/{session_id}", headers=headers)
        assert raw_key not in listing.text
        reveal = await api.client.get(f"/v1/live/sessions/{session_id}/stream-key", headers=headers)
        assert reveal.status_code == 410

        preflight = await api.client.post(
            f"/v1/live/sessions/{session_id}/preflight", headers=headers
        )
        assert preflight.status_code == 200
        assert preflight.json()["ready"] is True
        started = await api.client.post(f"/v1/live/sessions/{session_id}/start", headers=headers)
        assert started.status_code == 200, started.text
        assert started.json()["state"] == "live"
        ended = await api.client.post(f"/v1/live/sessions/{session_id}/end", headers=headers)
        assert ended.status_code == 200
        assert ended.json()["state"] == "ended"
        rotated = await api.client.post(
            f"/v1/live/sessions/{session_id}/stream-key/rotate",
            headers=headers,
        )
        assert rotated.status_code == 200
        assert rotated.json()["stream_key_once"] != raw_key
        assert rotated.json()["key_version"] == 2


@pytest.mark.asyncio
async def test_publish_credentials_fail_closed_when_mediamtx_unset(api_factory: Any) -> None:
    async with api_factory() as api:
        headers, _ = await creator_headers(api)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "No media plane"},
        )
        assert created.status_code == 201, created.text
        session_id = created.json()["id"]

        capability = await api.client.get(
            f"/v1/live/sessions/{session_id}/media-capability",
            headers=headers,
        )
        assert capability.status_code == 200
        assert capability.json()["status"] == "unavailable"
        assert capability.json()["reason"] == "mediamtx_control_unconfigured"
        assert capability.json()["whip_available"] is False

        credentials = await api.client.post(
            f"/v1/live/sessions/{session_id}/publish-credentials",
            headers=headers,
        )
        assert credentials.status_code == 200
        body = credentials.json()
        assert body["status"] == "unavailable"
        assert body["whip_url"] is None
        assert body["playback_url"] is None
        assert body["bearer_token"] is None
        assert body["token_expires_in_seconds"] == 0
        assert body["ice_servers"] == []


@pytest.mark.asyncio
async def test_publish_credentials_shape_when_mediamtx_configured(api_factory: Any) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset({LiveCapability.publish, LiveCapability.first_party_ingest}),
    )
    async with api_factory(
        live_adapter_registry=TestRegistry([media]),
        mediamtx_control_url="http://mediamtx.test:9997",
        mediamtx_whip_base_url="https://live.test.sylora.local",
        mediamtx_playback_base_url="https://watch.test.sylora.local",
        turn_urls=["turns:turn.test.sylora.local:5349"],
        turn_username="creator",
        turn_credential="turn-secret",
    ) as api:
        headers, user_id = await creator_headers(api)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "WHIP media plane"},
        )
        assert created.status_code == 201, created.text
        created_body = created.json()
        session_id = created_body["id"]
        ingest_path = created_body["ingest_path"]

        capability = await api.client.post(
            f"/v1/live/sessions/{session_id}/media-capability",
            headers=headers,
        )
        assert capability.status_code == 200
        assert capability.json()["status"] == "available"
        assert capability.json()["reason"] is None
        assert capability.json()["whip_available"] is True

        credentials = await api.client.post(
            f"/v1/live/sessions/{session_id}/publish-credentials",
            headers=headers,
        )
        assert credentials.status_code == 200, credentials.text
        body = credentials.json()
        assert body["status"] == "available"
        assert body["whip_url"] == f"https://live.test.sylora.local/{ingest_path}/whip"
        assert body["playback_url"] == f"https://watch.test.sylora.local/{ingest_path}"
        assert body["token_expires_in_seconds"] == 300
        assert body["ice_servers"] == [
            {
                "urls": ["turns:turn.test.sylora.local:5349"],
                "username": "creator",
                "credential": "turn-secret",
            }
        ]
        payload = jwt.decode(
            body["bearer_token"],
            api.app.state.settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            audience=api.app.state.settings.jwt_audience,
            issuer=api.app.state.settings.jwt_issuer,
        )
        assert payload["type"] == "live_whip_publish"
        assert payload["sid"] == session_id
        assert payload["path"] == ingest_path
        assert payload["sub"] == str(user_id)


@pytest.mark.asyncio
async def test_injected_adapter_reconnect_error_and_recovery(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, _ = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={
                "title": "Reconnect test",
                "destinations": [
                    {
                        "connection_id": connection["id"],
                        "publish_enabled": True,
                        "events_enabled": True,
                    }
                ],
            },
        )
        session_id = uuid.UUID(created.json()["id"])
        await api.client.post(f"/v1/live/sessions/{session_id}/preflight", headers=headers)
        started = await api.client.post(f"/v1/live/sessions/{session_id}/start", headers=headers)
        assert started.status_code == 200

        async with api.app.state.session_factory() as db:
            destination = await db.scalar(
                select(LiveDestination).where(LiveDestination.session_id == session_id)
            )
            assert destination is not None
            destination.state = LiveDestinationState.failed
            await db.commit()

        media.healthy = False
        failed = await api.client.post(f"/v1/live/sessions/{session_id}/reconnect", headers=headers)
        assert failed.status_code == 200
        assert failed.json()["state"] == "reconnecting"
        assert failed.json()["destinations"][0]["state"] == "reconnecting"
        assert failed.json()["destinations"][0]["last_error_code"] == "test_adapter_unhealthy"
        assert failed.json()["destinations"][0]["reconnect_count"] == 1

        media.healthy = True
        recovered = await api.client.post(
            f"/v1/live/sessions/{session_id}/reconnect", headers=headers
        )
        assert recovered.status_code == 200
        assert recovered.json()["state"] == "live"
        assert recovered.json()["destinations"][0]["state"] == "live"
        assert recovered.json()["destinations"][0]["last_error_code"] is None
        assert recovered.json()["destinations"][0]["reconnect_count"] == 2


@pytest.mark.asyncio
async def test_webhook_signature_dedupe_and_normalized_persistence(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    deliveries: list[uuid.UUID] = []

    async def capture(delivery_id: uuid.UUID) -> None:
        deliveries.append(delivery_id)

    async with api_factory(
        live_adapter_registry=TestRegistry([media]),
        live_webhook_dispatcher=capture,
    ) as api:
        headers, _ = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        session = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={
                "title": "Webhook live",
                "destinations": [
                    {
                        "connection_id": connection["id"],
                        "publish_enabled": True,
                        "events_enabled": True,
                    }
                ],
            },
        )
        session_id = session.json()["id"]
        await api.client.post(f"/v1/live/sessions/{session_id}/preflight", headers=headers)
        await api.client.post(f"/v1/live/sessions/{session_id}/start", headers=headers)
        payload = json.dumps({"id": "official-event-1", "text": "Hello live"}).encode()
        signature = hmac.new(b"test-webhook-secret", payload, hashlib.sha256).hexdigest()
        rejected = await api.client.post(
            f"/v1/live/webhooks/rtmp_webrtc/{connection['id']}",
            content=payload,
            headers={"x-test-signature": "bad"},
        )
        assert rejected.status_code == 401
        accepted = await api.client.post(
            f"/v1/live/webhooks/rtmp_webrtc/{connection['id']}",
            content=payload,
            headers={"x-test-signature": signature},
        )
        assert accepted.status_code == 202, accepted.text
        duplicate = await api.client.post(
            f"/v1/live/webhooks/rtmp_webrtc/{connection['id']}",
            content=payload,
            headers={"x-test-signature": signature},
        )
        assert duplicate.json()["status"] == "duplicate"
        assert len(deliveries) == 1
        async with api.app.state.session_factory() as db:
            records = await process_webhook_delivery(db, deliveries[0])
            assert len(records) == 1
            assert records[0].sequence == 1
            assert records[0].event_type == LiveNormalizedEventType.chat
            assert records[0].text == "Hello live"


def test_rule_dsl_is_typed_bounded_and_has_no_eval() -> None:
    condition = validate_condition_dsl(
        {
            "all": [
                {"field": "event_type", "op": "eq", "value": "chat"},
                {"field": "text", "op": "contains", "value": "quiz"},
                {"field": "monetary_minor", "op": "gte", "value": 100},
            ]
        }
    )
    assert evaluate_condition(
        condition,
        {
            "event_type": "chat",
            "text": "Start the quiz",
            "monetary_minor": 100,
            "metadata": {},
        },
    )
    with pytest.raises(ValueError):
        validate_condition_dsl({"field": "__class__", "op": "eq", "value": "anything"})
    with pytest.raises(ValueError):
        validate_condition_dsl({"field": "text", "op": "eval", "value": "open('/etc/passwd')"})


@pytest.mark.asyncio
async def test_rule_cooldown_idempotency_and_moderation_never_auto_bans(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.moderation_timeout,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, user_id = await creator_headers(api)
        connection = await connect_test_integration(
            api,
            headers,
            capabilities=["publish", "events", "moderation_timeout"],
        )
        invalid_policy = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={
                "title": "Unsafe policy",
                "moderation_mode": "policy",
                "moderation_policy": {
                    "auto_actions": {"harassment": "ban"},
                    "minimum_confidence": 0.99,
                },
            },
        )
        assert invalid_policy.status_code == 422

        async with api.app.state.session_factory() as db:
            live_session = LiveSession(
                owner_user_id=user_id,
                owner_subject_hash="a" * 64,
                title="Rules",
                language="en",
                state=LiveSessionState.live,
                ingest_path=f"live/{uuid.uuid4()}",
                ingest_key_hash="b" * 64,
                ingest_provisioned=True,
            )
            db.add(live_session)
            await db.flush()
            rule = AILiveRule(
                owner_user_id=user_id,
                name="One response",
                trigger_event=LiveNormalizedEventType.chat,
                condition_dsl={
                    "field": "text",
                    "op": "contains",
                    "value": "hello",
                },
                action_type=LiveActionType.respond_text,
                action_configuration={"text": "Welcome"},
                cooldown_seconds=60,
                rate_limit_count=2,
                rate_limit_window_seconds=60,
                requires_approval=False,
                risk=LiveRuleRisk.low,
                enabled=True,
            )
            db.add(rule)
            await db.flush()
            event = await persist_normalized_event(
                db,
                live_session,
                None,
                uuid.UUID(connection["id"]),
                {
                    "platform_event_id": "rule-event",
                    "event_type": "chat",
                    "occurred_at": datetime.now(UTC).isoformat(),
                    "actor_platform_id": "viewer",
                    "actor_display_name": "Viewer",
                    "text": "hello",
                    "monetary_minor": None,
                    "currency": None,
                    "safe_metadata": {},
                },
            )
            from app.live_service import evaluate_rules_for_event

            first = await evaluate_rules_for_event(db, live_session, event)
            second = await evaluate_rules_for_event(db, live_session, event)
            await db.commit()
            assert len(first) == 1
            assert second == []
            action = LiveAction(
                session_id=live_session.id,
                action_type=LiveActionType.moderate,
                state=LiveActionState.queued,
                idempotency_key=str(uuid.uuid4()),
                typed_payload={"kind": "ban", "platform_user_id": "viewer"},
                requires_approval=False,
            )
            db.add(action)
            await db.commit()
            action_id = action.id
        execution = await api.client.post(f"/v1/live/actions/{action_id}/execute", headers=headers)
        assert execution.status_code == 409
        assert execution.json()["code"] == "live_auto_ban_forbidden"


def test_obs_protocol_authentication_vector() -> None:
    assert (
        obs_authentication_response(
            "supersecret",
            "1",
            "2",
        )
        == "+UZaMFHmE3gWi1HmrojM/MKlweFIylccEklCP137Ff0="
    )


@pytest.mark.asyncio
async def test_ai_unavailable_is_explicit_and_quiz_scores_real_answers(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, user_id = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        session_response = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "AI and quiz", "ai_mode": "copilot"},
        )
        session_id = session_response.json()["id"]
        persona = await api.client.post(
            "/v1/live/personas",
            headers=headers,
            json={
                "name": "Host",
                "system_prompt_reference": "live.host",
                "system_prompt_version": 1,
                "languages": ["en"],
            },
        )
        assert persona.status_code == 201
        async with api.app.state.session_factory() as db:
            db.add(
                PromptTemplate(
                    template_key="live.host",
                    version=1,
                    locale="en",
                    capability=AICapability.chat,
                    content="Respond as the configured live host.",
                    policy_metadata={},
                    state=PromptTemplateState.published,
                    created_by_id=user_id,
                    published_by_id=user_id,
                )
            )
            live_session = await db.get(LiveSession, uuid.UUID(session_id))
            assert live_session is not None
            event = await persist_normalized_event(
                db,
                live_session,
                None,
                uuid.UUID(connection["id"]),
                {
                    "platform_event_id": "ai-event",
                    "event_type": "chat",
                    "occurred_at": datetime.now(UTC).isoformat(),
                    "actor_platform_id": "viewer",
                    "actor_display_name": "Viewer",
                    "text": "Say hello",
                    "monetary_minor": None,
                    "currency": None,
                    "safe_metadata": {},
                },
            )
            await db.commit()
            event_id = event.id
        turn = await api.client.post(
            f"/v1/live/sessions/{session_id}/events/{event_id}/turns",
            headers=headers,
            json={"persona_id": persona.json()["id"]},
        )
        assert turn.status_code == 200, turn.text
        assert turn.json()["status"] == "unavailable"
        assert turn.json()["failure_code"] == "ai_consent_required"
        consent = await api.client.patch(
            "/v1/ai/settings",
            headers=headers,
            json={"consent_granted": True},
        )
        assert consent.status_code == 200
        unavailable_provider = await api.client.post(
            f"/v1/live/sessions/{session_id}/events/{event_id}/turns",
            headers=headers,
            json={"persona_id": persona.json()["id"]},
        )
        assert unavailable_provider.status_code == 200
        assert unavailable_provider.json()["status"] == "unavailable"
        assert unavailable_provider.json()["failure_code"] == "ai_provider_unavailable"

        game = await api.client.post(
            "/v1/live/games",
            headers=headers,
            json={
                "live_session_id": session_id,
                "title": "Real score",
                "questions": [
                    {
                        "prompt": "2 + 2?",
                        "options": ["3", "4", "5"],
                        "correct_option": 1,
                        "points": 7,
                    }
                ],
            },
        )
        assert game.status_code == 201, game.text
        game_id = game.json()["id"]
        question_id = game.json()["questions"][0]["id"]
        await api.client.post(f"/v1/live/games/{game_id}/start", headers=headers)
        answer = await api.client.post(
            f"/v1/live/games/{game_id}/answers",
            headers=headers,
            json={
                "question_id": question_id,
                "connection_id": connection["id"],
                "platform_user_id": "viewer-quiz",
                "display_name": "Quiz Viewer",
                "selected_option": 1,
            },
        )
        assert answer.status_code == 200, answer.text
        assert answer.json()["correct"] is True
        assert answer.json()["total_score"] == 7
        scores = await api.client.get(f"/v1/live/games/{game_id}/scores", headers=headers)
        assert scores.json()[0]["score"] == 7


@pytest.mark.asyncio
async def test_first_party_gift_separation_and_account_deletion_cleanup(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, user_id = await creator_headers(api)
        connection = await connect_test_integration(api, headers)
        async with api.app.state.session_factory() as db:
            live_session = LiveSession(
                owner_user_id=user_id,
                owner_subject_hash="a" * 64,
                title="Gift live",
                language="en",
                state=LiveSessionState.live,
                ingest_path=f"live/{uuid.uuid4()}",
                ingest_key_hash="b" * 64,
                ingest_provisioned=True,
            )
            gift = GiftEvent(
                user_id=user_id,
                event_type="gift_received",
                event_payload={"amount_minor": 999_999},
            )
            db.add_all([live_session, gift])
            await db.commit()
            await db.refresh(gift)
            events = await normalize_sylora_gift_event(db, gift)
            assert events[0].event_type == LiveNormalizedEventType.custom
            assert events[0].monetary_minor is None
            assert events[0].safe_metadata["does_not_mint_credits"] is True

        deleted = await api.client.request(
            "DELETE",
            "/v1/users/me",
            headers=headers,
            json={"password": "CorrectHorse!2026"},
        )
        assert deleted.status_code == 200, deleted.text
        async with api.app.state.session_factory() as db:
            stored_connection = await db.get(IntegrationConnection, uuid.UUID(connection["id"]))
            assert stored_connection is not None
            assert stored_connection.owner_user_id is None
            assert stored_connection.encrypted_connection_secret is None
            assert stored_connection.verified_capabilities == []
            stored_session = await db.get(LiveSession, live_session.id)
            assert stored_session is not None
            assert stored_session.owner_user_id is None
            assert stored_session.state == LiveSessionState.failed
            assert (
                await db.scalar(select(AILivePersona).where(AILivePersona.owner_user_id == user_id))
                is None
            )


@pytest.mark.asyncio
async def test_live_replay_outbox_is_durable(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, _ = await creator_headers(api)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "Replay live"},
        )
        session_id = uuid.UUID(created.json()["id"])
        async with api.app.state.session_factory() as db:
            rows = (
                await db.scalars(select(LiveEvent).where(LiveEvent.session_id == session_id))
            ).all()
            assert [row.event_type for row in rows] == ["session.created"]


@pytest.mark.asyncio
async def test_live_websocket_replays_committed_events_after_cursor(
    api_factory: Any,
) -> None:
    media = TestAdapter(
        IntegrationPlatform.rtmp_webrtc,
        frozenset(
            {
                LiveCapability.publish,
                LiveCapability.events,
                LiveCapability.first_party_ingest,
            }
        ),
    )
    async with api_factory(live_adapter_registry=TestRegistry([media])) as api:
        headers, _ = await creator_headers(api)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "WebSocket replay"},
        )
        session_id = uuid.UUID(created.json()["id"])
        async with api.app.state.session_factory() as db:
            first = await db.scalar(
                select(LiveEvent)
                .where(LiveEvent.session_id == session_id)
                .order_by(LiveEvent.created_at, LiveEvent.id)
            )
            assert first is not None
            cursor = replay_event(first, api.app.state.settings).cursor
            assert cursor is not None

        preflight = await api.client.post(
            f"/v1/live/sessions/{session_id}/preflight", headers=headers
        )
        assert preflight.status_code == 200
        websocket = ReplayWebSocket(
            api.app,
            headers["Authorization"],
            cursor,
        )
        await live_websocket(websocket, session_id)  # type: ignore[arg-type]
        assert websocket.accepted is True
        assert websocket.close_codes == []
        assert [item["event"] for item in websocket.sent] == ["session.preflight_completed"]
