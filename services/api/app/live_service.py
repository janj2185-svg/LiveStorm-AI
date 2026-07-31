from __future__ import annotations

import asyncio
import hashlib
import json
import secrets
import uuid
from collections import defaultdict
from collections.abc import Awaitable, Callable, Mapping, Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AICapability,
    AIConversation,
    AIConversationMode,
    AIJob,
    AIJobStatus,
    AIMessage,
    AIMessageRole,
    AIMessageStatus,
    PromptTemplate,
    PromptTemplateState,
)
from app.ai_schemas import AISendMessageRequest, validate_safe_json
from app.ai_service import (
    create_generation_job,
    invoke_moderation,
    send_chat_message,
)
from app.config import Settings
from app.errors import APIError
from app.gift_models import GiftEvent
from app.live_adapters import (
    AdapterActionResult,
    AdapterConnectionContext,
    AdapterError,
    AdapterInboundEvent,
    AdapterRegistry,
    OBSAdapter,
    TwitchAdapter,
    YouTubeAdapter,
    retry_delay_seconds,
)
from app.live_models import (
    AILivePersona,
    AILiveRule,
    AILiveTurn,
    GameState,
    IntegrationCapabilitySnapshot,
    IntegrationConnection,
    IntegrationPlatform,
    IntegrationState,
    IntegrationWebhookDelivery,
    LiveAction,
    LiveActionState,
    LiveActionTransition,
    LiveActionType,
    LiveAIMode,
    LiveCapability,
    LiveDestination,
    LiveDestinationState,
    LiveEvent,
    LiveGameQuestion,
    LiveGameScore,
    LiveGameSession,
    LiveModerationDecision,
    LiveNormalizedEvent,
    LiveNormalizedEventType,
    LiveParticipantAnswer,
    LivePluginManifest,
    LiveRuleRisk,
    LiveSession,
    LiveSessionState,
    LiveTurnStatus,
    LiveViewerConsent,
    LiveViewerMemory,
    ModerationDisposition,
)
from app.live_rules import evaluate_condition
from app.live_schemas import (
    GameAnswerRequest,
    GameAnswerResponse,
    GameCreate,
    IntegrationConnectRequest,
    LiveDestinationCreate,
    LiveReplayEvent,
    LiveSessionCreate,
    PreflightCheck,
    PreflightResponse,
)
from app.security import (
    create_oauth_state,
    decode_oauth_state,
    decrypt_secret,
    encrypt_secret,
    hash_token,
    utcnow,
)
from app.social_schemas import validate_plain_text
from app.social_service import encode_cursor

WebhookDispatcher = Callable[[uuid.UUID], Awaitable[None]]
AIJobDispatcher = Callable[[uuid.UUID], Awaitable[None]]


def live_subject_hash(user_id: uuid.UUID) -> str:
    return hashlib.sha256(f"sylora-live-subject:{user_id}".encode()).hexdigest()


def _safe_provider_metadata(value: Mapping[str, Any]) -> dict[str, Any]:
    safe = validate_safe_json(dict(value))
    if not isinstance(safe, dict):
        raise AdapterError("provider_metadata_invalid")
    return safe


def connection_context(
    connection: IntegrationConnection, settings: Settings
) -> AdapterConnectionContext:
    return AdapterConnectionContext(
        connection_id=connection.id,
        platform=connection.platform,
        access_credential=decrypt_secret(
            connection.encrypted_access_credential, settings
        )
        if connection.encrypted_access_credential
        else None,
        refresh_credential=decrypt_secret(
            connection.encrypted_refresh_credential, settings
        )
        if connection.encrypted_refresh_credential
        else None,
        connection_secret=decrypt_secret(
            connection.encrypted_connection_secret, settings
        )
        if connection.encrypted_connection_secret
        else None,
        scopes=frozenset(connection.scopes),
        external_account_id=connection.external_account_id,
        external_channel_id=connection.external_channel_id,
        safe_configuration=connection.safe_configuration,
    )


def _adapter_api_error(exc: AdapterError, *, operation: str) -> APIError:
    status_code = 409 if exc.code in {
        "requires_provider_review",
        "platform_adapter_unavailable",
        "plugin_signing_key_not_allowed",
        "plugin_endpoint_host_not_allowed",
        "obs_websocket_host_not_allowed",
    } else 503
    return APIError(
        status_code,
        exc.code,
        f"Live integration {operation} unavailable",
        f"The official integration could not complete {operation}; status is {exc.code}.",
    )


async def owned_connection(
    db: AsyncSession, connection_id: uuid.UUID, owner_user_id: uuid.UUID
) -> IntegrationConnection:
    connection = await db.scalar(
        select(IntegrationConnection).where(
            IntegrationConnection.id == connection_id,
            IntegrationConnection.owner_user_id == owner_user_id,
        )
    )
    if connection is None:
        raise APIError(
            404,
            "live_integration_not_found",
            "Live integration not found",
            "The integration connection does not exist.",
        )
    return connection


def _connection_safe_configuration(payload: IntegrationConnectRequest) -> dict[str, Any]:
    configuration: dict[str, Any] = {
        "requested_capabilities": [
            capability.value for capability in payload.requested_capabilities
        ]
    }
    if payload.endpoint_url:
        configuration["endpoint_url"] = payload.endpoint_url
    if payload.guild_id:
        configuration["guild_id"] = payload.guild_id
    if payload.bot_application_id:
        configuration["bot_application_id"] = payload.bot_application_id
    if payload.plugin_manifest:
        configuration["plugin_manifest"] = payload.plugin_manifest.model_dump(mode="json")
    return configuration


async def create_integration_connection(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    owner_user_id: uuid.UUID,
    payload: IntegrationConnectRequest,
) -> IntegrationConnection:
    adapter = registry.resolve(payload.platform)
    descriptor = adapter.descriptor()
    if not descriptor.available:
        raise APIError(
            409,
            descriptor.status,
            "Platform integration unavailable",
            descriptor.limitation or "The official integration is unavailable.",
        )
    safe_configuration = _connection_safe_configuration(payload)
    if isinstance(adapter, OBSAdapter) and payload.endpoint_url:
        adapter.validate_endpoint(payload.endpoint_url)
    record = IntegrationConnection(
        owner_user_id=owner_user_id,
        workspace_id=payload.workspace_id,
        owner_subject_hash=live_subject_hash(owner_user_id),
        platform=payload.platform,
        state=IntegrationState.authorizing,
        encrypted_access_credential=encrypt_secret(
            payload.access_credential.get_secret_value(), settings
        )
        if payload.access_credential
        else None,
        encrypted_refresh_credential=encrypt_secret(
            payload.refresh_credential.get_secret_value(), settings
        )
        if payload.refresh_credential
        else None,
        encrypted_connection_secret=encrypt_secret(
            payload.connection_secret.get_secret_value(), settings
        )
        if payload.connection_secret
        else None,
        token_expires_at=payload.token_expires_at,
        scopes=payload.scopes,
        external_account_id=payload.external_account_id,
        external_channel_id=payload.external_channel_id,
        verified_capabilities=[],
        safe_configuration=safe_configuration,
        provider_status="authorizing",
    )
    db.add(record)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "live_integration_exists",
            "Live integration already exists",
            "This external platform account is already connected by the owner.",
        ) from exc
    await db.refresh(record)
    connection_id = record.id
    try:
        result = await adapter.connect(connection_context(record, settings))
        metadata = _safe_provider_metadata(result.provider_metadata)
        verified = sorted(capability.value for capability in result.verified_capabilities)
        requested = {capability.value for capability in payload.requested_capabilities}
        missing = requested - set(verified)
        record.verified_capabilities = verified
        record.external_account_id = (
            result.external_account_id or record.external_account_id
        )
        record.external_channel_id = (
            result.external_channel_id or record.external_channel_id
        )
        if result.refreshed_access_credential:
            record.encrypted_access_credential = encrypt_secret(
                result.refreshed_access_credential, settings
            )
        if result.refreshed_refresh_credential:
            record.encrypted_refresh_credential = encrypt_secret(
                result.refreshed_refresh_credential, settings
            )
        record.token_expires_at = result.token_expires_at or record.token_expires_at
        record.state = IntegrationState.degraded if missing else IntegrationState.connected
        record.provider_status = (
            "capability_mismatch" if missing else "capabilities_verified"
        )
        record.last_health_at = utcnow()
        record.last_error_code = "requested_capability_unavailable" if missing else None
        record.last_error_at = utcnow() if missing else None
        snapshot = IntegrationCapabilitySnapshot(
            connection_id=record.id,
            fetched_capabilities=sorted(
                capability.value for capability in adapter.potential_capabilities
            ),
            verified_capabilities=verified,
            provider_metadata={
                **metadata,
                "missing_requested_capabilities": sorted(missing),
            },
            status=record.provider_status,
        )
        db.add(snapshot)
        if payload.plugin_manifest:
            manifest = payload.plugin_manifest.model_dump(mode="json")
            canonical = {
                key: value for key, value in manifest.items() if key != "signature"
            }
            db.add(
                LivePluginManifest(
                    connection_id=record.id,
                    manifest_id=payload.plugin_manifest.manifest_id,
                    schema_version=payload.plugin_manifest.schema_version,
                    callback_url=payload.plugin_manifest.callback_url,
                    webhook_url=payload.plugin_manifest.webhook_url,
                    oauth_reference=payload.plugin_manifest.oauth_reference,
                    secret_reference=payload.plugin_manifest.secret_reference,
                    declared_capabilities=[
                        item.value
                        for item in payload.plugin_manifest.declared_capabilities
                    ],
                    signing_key_id=payload.plugin_manifest.signing_key_id,
                    manifest_hash=hashlib.sha256(
                        json.dumps(
                            canonical, sort_keys=True, separators=(",", ":")
                        ).encode()
                    ).hexdigest(),
                    verified_at=utcnow(),
                )
            )
        await db.commit()
        await db.refresh(record)
        return record
    except AdapterError as exc:
        await db.rollback()
        failed_record = await db.get(IntegrationConnection, connection_id)
        assert failed_record is not None
        failed_record.state = (
            IntegrationState.revoked if exc.revoked else IntegrationState.error
        )
        failed_record.provider_status = exc.code
        failed_record.last_error_code = exc.code
        failed_record.last_error_at = utcnow()
        await db.commit()
        raise _adapter_api_error(exc, operation="connection") from exc


async def health_connection(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    connection: IntegrationConnection,
) -> IntegrationCapabilitySnapshot:
    adapter = registry.resolve(connection.platform)
    health = await adapter.health(connection_context(connection, settings))
    connection.last_health_at = utcnow()
    connection.provider_status = health.status
    connection.verified_capabilities = sorted(
        capability.value for capability in health.verified_capabilities
    )
    if health.ok:
        connection.state = IntegrationState.connected
        connection.last_error_code = None
    else:
        connection.state = (
            IntegrationState.revoked
            if "revoked" in health.status or "permission" in health.status
            else IntegrationState.degraded
        )
        connection.last_error_code = health.status
        connection.last_error_at = utcnow()
    snapshot = IntegrationCapabilitySnapshot(
        connection_id=connection.id,
        fetched_capabilities=sorted(
            capability.value for capability in adapter.potential_capabilities
        ),
        verified_capabilities=connection.verified_capabilities,
        provider_metadata=_safe_provider_metadata(health.provider_metadata),
        status=health.status,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)
    return snapshot


async def disconnect_integration(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    connection: IntegrationConnection,
) -> None:
    try:
        await registry.resolve(connection.platform).disconnect(
            connection_context(connection, settings)
        )
    except AdapterError as exc:
        connection.last_error_code = exc.code
        connection.last_error_at = utcnow()
    connection.state = IntegrationState.revoked
    connection.provider_status = "disconnected_by_owner"
    connection.encrypted_access_credential = None
    connection.encrypted_refresh_credential = None
    connection.encrypted_connection_secret = None
    connection.verified_capabilities = []
    await db.commit()


def oauth_start(
    registry: AdapterRegistry,
    settings: Settings,
    owner_user_id: uuid.UUID,
    platform: IntegrationPlatform,
    scopes: Sequence[str],
    external_channel_id: str | None,
) -> str:
    verifier = secrets.token_urlsafe(48)
    challenge = (
        base64_url(hashlib.sha256(verifier.encode()).digest())
    )
    state = create_oauth_state(
        {
            "purpose": "live_integration",
            "owner_user_id": str(owner_user_id),
            "platform": platform.value,
            "scopes": list(scopes),
            "external_channel_id": external_channel_id,
            "verifier": verifier,
            "nonce": secrets.token_urlsafe(24),
        },
        settings,
    )
    adapter = registry.resolve(platform)
    if isinstance(adapter, (YouTubeAdapter, TwitchAdapter)):
        return adapter.authorization_url(state, challenge, scopes)
    raise APIError(
        409,
        "live_oauth_unavailable",
        "Live OAuth unavailable",
        "This platform does not expose a configured OAuth authorization boundary.",
    )


def base64_url(value: bytes) -> str:
    import base64

    return base64.urlsafe_b64encode(value).decode().rstrip("=")


async def oauth_callback_connection(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    owner_user_id: uuid.UUID,
    code: str,
    state_token: str,
) -> IntegrationConnection:
    state = decode_oauth_state(state_token, settings)
    if (
        state.get("purpose") != "live_integration"
        or state.get("owner_user_id") != str(owner_user_id)
    ):
        raise APIError(
            400,
            "invalid_live_oauth_state",
            "Invalid live OAuth state",
            "The authorization state does not belong to this account.",
        )
    try:
        platform = IntegrationPlatform(state["platform"])
        scopes = [str(item) for item in state["scopes"]]
        verifier = str(state["verifier"])
    except (KeyError, TypeError, ValueError) as exc:
        raise APIError(
            400,
            "invalid_live_oauth_state",
            "Invalid live OAuth state",
            "The authorization state is malformed.",
        ) from exc
    adapter = registry.resolve(platform)
    if not isinstance(adapter, (YouTubeAdapter, TwitchAdapter)):
        raise APIError(
            409,
            "live_oauth_unavailable",
            "Live OAuth unavailable",
            "This platform does not use the configured OAuth boundary.",
        )
    try:
        token = await adapter.exchange_code(code, verifier)
    except AdapterError as exc:
        raise _adapter_api_error(exc, operation="OAuth callback") from exc
    access_token = token.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise APIError(
            502,
            "live_oauth_token_invalid",
            "Invalid live OAuth token response",
            "The official token endpoint returned an invalid response.",
        )
    granted_scopes = token.get("scope", scopes)
    if isinstance(granted_scopes, str):
        granted_scopes = granted_scopes.split()
    expires_at = utcnow() + timedelta(seconds=int(token.get("expires_in", 3600)))
    from pydantic import SecretStr

    return await create_integration_connection(
        db,
        registry,
        settings,
        owner_user_id,
        IntegrationConnectRequest(
            platform=platform,
            access_credential=SecretStr(access_token),
            refresh_credential=SecretStr(str(token["refresh_token"]))
            if token.get("refresh_token")
            else None,
            token_expires_at=expires_at,
            scopes=[str(scope) for scope in granted_scopes],
            external_channel_id=state.get("external_channel_id"),
            requested_capabilities=[],
        ),
    )


class LiveEventHub:
    """Bounded process-local fan-out; LiveEvent rows are the durable replay source."""

    def __init__(self, queue_size: int = 100) -> None:
        self.queue_size = queue_size
        self._queues: dict[
            uuid.UUID, set[asyncio.Queue[LiveReplayEvent]]
        ] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(
        self, session_id: uuid.UUID
    ) -> asyncio.Queue[LiveReplayEvent]:
        queue: asyncio.Queue[LiveReplayEvent] = asyncio.Queue(maxsize=self.queue_size)
        async with self._lock:
            self._queues[session_id].add(queue)
        return queue

    async def unsubscribe(
        self, session_id: uuid.UUID, queue: asyncio.Queue[LiveReplayEvent]
    ) -> None:
        async with self._lock:
            self._queues[session_id].discard(queue)
            if not self._queues[session_id]:
                self._queues.pop(session_id, None)

    async def publish(self, session_id: uuid.UUID, item: LiveReplayEvent) -> None:
        async with self._lock:
            queues = tuple(self._queues.get(session_id, ()))
        for queue in queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(item)


def replay_event(record: LiveEvent, settings: Settings) -> LiveReplayEvent:
    return LiveReplayEvent(
        event=record.event_type,
        cursor=encode_cursor(
            settings,
            f"live-replay:{record.session_id}",
            record.created_at,
            record.id,
        ),
        aggregate_type=record.aggregate_type,
        aggregate_id=record.aggregate_id,
        payload=record.event_payload,
        occurred_at=record.created_at,
    )


def _append_live_event(
    db: AsyncSession,
    live_session: LiveSession,
    event_type: str,
    aggregate_type: str,
    aggregate_id: uuid.UUID,
    payload: Mapping[str, Any] | None = None,
) -> LiveEvent:
    safe = validate_safe_json(dict(payload or {}))
    assert isinstance(safe, dict)
    record = LiveEvent(
        session_id=live_session.id,
        owner_user_id=live_session.owner_user_id,
        event_type=event_type,
        aggregate_type=aggregate_type,
        aggregate_id=aggregate_id,
        event_payload=safe,
        created_at=utcnow(),
    )
    db.add(record)
    return record


async def owned_live_session(
    db: AsyncSession, session_id: uuid.UUID, owner_user_id: uuid.UUID
) -> LiveSession:
    record = await db.scalar(
        select(LiveSession).where(
            LiveSession.id == session_id,
            LiveSession.owner_user_id == owner_user_id,
        )
    )
    if record is None:
        raise APIError(
            404,
            "live_session_not_found",
            "Live session not found",
            "The live session does not exist.",
        )
    return record


def media_context() -> AdapterConnectionContext:
    return AdapterConnectionContext(
        connection_id=uuid.UUID(int=0),
        platform=IntegrationPlatform.rtmp_webrtc,
        access_credential=None,
        refresh_credential=None,
        connection_secret=None,
        scopes=frozenset(),
        external_account_id=None,
        external_channel_id=None,
    )


async def _provision_ingest(
    registry: AdapterRegistry, ingest_path: str, stream_key: str
) -> bool:
    adapter = registry.resolve(IntegrationPlatform.rtmp_webrtc)
    if not adapter.descriptor().available:
        return False
    try:
        await adapter.create_broadcast(
            media_context(),
            {"ingest_path": ingest_path, "ingest_key": stream_key},
        )
    except AdapterError:
        return False
    return True


async def create_live_session(
    db: AsyncSession,
    registry: AdapterRegistry,
    owner_user_id: uuid.UUID,
    payload: LiveSessionCreate,
) -> tuple[LiveSession, str]:
    raw_key = secrets.token_urlsafe(32)
    ingest_path = f"live/{owner_user_id}/{secrets.token_urlsafe(12)}"
    provisioned = await _provision_ingest(registry, ingest_path, raw_key)
    record = LiveSession(
        owner_user_id=owner_user_id,
        workspace_id=payload.workspace_id,
        owner_subject_hash=live_subject_hash(owner_user_id),
        title=payload.title,
        language=payload.language,
        ingest_path=ingest_path,
        ingest_key_hash=hash_token(raw_key),
        ingest_key_version=1,
        ingest_provisioned=provisioned,
        recording_enabled=payload.recording_enabled,
        moderation_mode=payload.moderation_mode,
        moderation_policy=payload.moderation_policy.model_dump(mode="json"),
        ai_mode=payload.ai_mode,
    )
    db.add(record)
    await db.flush()
    for destination_payload in payload.destinations:
        await add_destination(
            db, record, owner_user_id, destination_payload, commit=False
        )
    _append_live_event(
        db,
        record,
        "session.created",
        "session",
        record.id,
        {"ingest_provisioned": provisioned, "key_version": 1},
    )
    await db.commit()
    await db.refresh(record)
    return record, raw_key


async def rotate_stream_key(
    db: AsyncSession,
    registry: AdapterRegistry,
    live_session: LiveSession,
) -> str:
    if live_session.state in {
        LiveSessionState.starting,
        LiveSessionState.live,
        LiveSessionState.ending,
    }:
        raise APIError(
            409,
            "live_stream_key_rotation_conflict",
            "Stream key rotation unavailable",
            "End the active stream before rotating its ingest key.",
        )
    raw_key = secrets.token_urlsafe(32)
    adapter = registry.resolve(IntegrationPlatform.rtmp_webrtc)
    provisioned = False
    if adapter.descriptor().available:
        try:
            await adapter.update_broadcast(
                media_context(),
                live_session.ingest_path,
                {"ingest_key": raw_key},
            )
            provisioned = True
        except AdapterError as exc:
            raise _adapter_api_error(exc, operation="stream-key rotation") from exc
    live_session.ingest_key_hash = hash_token(raw_key)
    live_session.ingest_key_version += 1
    live_session.ingest_provisioned = provisioned
    _append_live_event(
        db,
        live_session,
        "session.stream_key_rotated",
        "session",
        live_session.id,
        {
            "key_version": live_session.ingest_key_version,
            "ingest_provisioned": provisioned,
        },
    )
    await db.commit()
    return raw_key


async def add_destination(
    db: AsyncSession,
    live_session: LiveSession,
    owner_user_id: uuid.UUID,
    payload: LiveDestinationCreate,
    *,
    commit: bool = True,
) -> LiveDestination:
    if live_session.state not in {LiveSessionState.draft, LiveSessionState.preflight}:
        raise APIError(
            409,
            "live_destination_state_conflict",
            "Destination cannot be changed",
            "Destinations can be changed only before a session starts.",
        )
    connection = await owned_connection(db, payload.connection_id, owner_user_id)
    if connection.state not in {IntegrationState.connected, IntegrationState.degraded}:
        raise APIError(
            409,
            "live_integration_not_connected",
            "Live integration not connected",
            "Connect and verify the integration before adding it as a destination.",
        )
    destination = LiveDestination(
        session_id=live_session.id,
        connection_id=connection.id,
        publish_enabled=payload.publish_enabled,
        chat_enabled=payload.chat_enabled,
        events_enabled=payload.events_enabled,
        moderation_enabled=payload.moderation_enabled,
        analytics_enabled=payload.analytics_enabled,
        max_reconnects=payload.max_reconnects,
    )
    db.add(destination)
    try:
        if commit:
            _append_live_event(
                db,
                live_session,
                "destination.added",
                "destination",
                destination.id,
                {"platform": connection.platform.value},
            )
            await db.commit()
            await db.refresh(destination)
        else:
            await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "live_destination_exists",
            "Live destination already exists",
            "This integration is already attached to the live session.",
        ) from exc
    return destination


def _required_capability_checks(
    destination: LiveDestination,
    connection: IntegrationConnection,
) -> list[tuple[str, bool]]:
    available = set(connection.verified_capabilities)
    publish_capabilities = {LiveCapability.publish.value}
    if connection.platform == IntegrationPlatform.obs:
        publish_capabilities.add(LiveCapability.stream_control.value)
    return [
        (
            "publish",
            not destination.publish_enabled
            or bool(available & publish_capabilities),
        ),
        (
            "chat",
            not destination.chat_enabled
            or LiveCapability.chat_send.value in available,
        ),
        (
            "events",
            not destination.events_enabled or LiveCapability.events.value in available,
        ),
        (
            "moderation",
            not destination.moderation_enabled
            or bool(
                available
                & {
                    LiveCapability.moderation_delete.value,
                    LiveCapability.moderation_timeout.value,
                }
            ),
        ),
        (
            "analytics",
            not destination.analytics_enabled
            or LiveCapability.analytics.value in available,
        ),
    ]


async def session_destinations(
    db: AsyncSession, session_id: uuid.UUID
) -> list[LiveDestination]:
    return list(
        (
            await db.scalars(
                select(LiveDestination)
                .where(LiveDestination.session_id == session_id)
                .order_by(LiveDestination.created_at, LiveDestination.id)
            )
        ).all()
    )


async def preflight_session(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    live_session: LiveSession,
) -> PreflightResponse:
    if live_session.state not in {LiveSessionState.draft, LiveSessionState.preflight}:
        raise APIError(
            409,
            "live_preflight_state_conflict",
            "Live preflight unavailable",
            "Only a draft or previously preflighted session can be checked.",
        )
    checks: list[PreflightCheck] = []
    media = registry.resolve(IntegrationPlatform.rtmp_webrtc)
    media_health = await media.health(media_context())
    media_ok = media_health.ok and live_session.ingest_provisioned
    checks.append(
        PreflightCheck(
            subject="media_ingest",
            ok=media_ok,
            status=media_health.status
            if live_session.ingest_provisioned
            else "stream_path_not_provisioned",
            detail=(
                "The deployment-managed MediaMTX path is healthy."
                if media_ok
                else "A healthy, provisioned MediaMTX path is required before going live."
            ),
        )
    )
    destinations = await session_destinations(db, live_session.id)
    for destination in destinations:
        connection = await db.get(IntegrationConnection, destination.connection_id)
        assert connection is not None
        capability_checks = _required_capability_checks(destination, connection)
        missing = [name for name, ok in capability_checks if not ok]
        if missing:
            destination.state = LiveDestinationState.unavailable
            destination.last_error_code = "destination_capability_unavailable"
            checks.append(
                PreflightCheck(
                    subject=f"destination:{destination.id}",
                    ok=False,
                    status="destination_capability_unavailable",
                    detail="Missing verified capabilities: " + ", ".join(missing),
                )
            )
            continue
        health = await registry.resolve(connection.platform).health(
            connection_context(connection, settings)
        )
        destination.last_health_at = utcnow()
        destination.state = (
            LiveDestinationState.ready
            if health.ok
            else LiveDestinationState.unavailable
        )
        destination.last_error_code = None if health.ok else health.status
        checks.append(
            PreflightCheck(
                subject=f"destination:{destination.id}",
                ok=health.ok,
                status=health.status,
                detail=(
                    f"{connection.platform.value} official adapter is healthy."
                    if health.ok
                    else f"{connection.platform.value} health check failed."
                ),
            )
        )
    ready = all(check.ok for check in checks)
    live_session.state = LiveSessionState.preflight
    live_session.last_error_code = None if ready else "live_preflight_failed"
    _append_live_event(
        db,
        live_session,
        "session.preflight_completed",
        "session",
        live_session.id,
        {"ready": ready, "check_count": len(checks)},
    )
    await db.commit()
    return PreflightResponse(session_id=live_session.id, ready=ready, checks=checks)


async def start_session(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    live_session: LiveSession,
) -> LiveSession:
    if live_session.state != LiveSessionState.preflight:
        raise APIError(
            409,
            "live_start_requires_preflight",
            "Live session requires preflight",
            "Run a successful preflight immediately before starting.",
        )
    preflight = await preflight_session(db, registry, settings, live_session)
    if not preflight.ready:
        raise APIError(
            409,
            "live_preflight_failed",
            "Live preflight failed",
            "The session cannot go live until every required check succeeds.",
            extra={"checks": [check.model_dump(mode="json") for check in preflight.checks]},
        )
    live_session.state = LiveSessionState.starting
    await db.commit()
    destinations = await session_destinations(db, live_session.id)
    try:
        for destination in destinations:
            connection = await db.get(IntegrationConnection, destination.connection_id)
            assert connection is not None
            adapter = registry.resolve(connection.platform)
            destination.state = LiveDestinationState.starting
            if destination.publish_enabled:
                result = await adapter.create_broadcast(
                    connection_context(connection, settings),
                    {
                        "title": live_session.title,
                        "language": live_session.language,
                        "recording_enabled": live_session.recording_enabled,
                        "scheduled_start_time": utcnow().isoformat(),
                    },
                )
                destination.external_broadcast_id = (
                    result.external_broadcast_id
                    or destination.external_broadcast_id
                    or result.provider_reference
                )
            destination.state = LiveDestinationState.live
            destination.last_error_code = None
        live_session.state = LiveSessionState.live
        live_session.started_at = utcnow()
        live_session.last_error_code = None
        _append_live_event(
            db,
            live_session,
            "session.started",
            "session",
            live_session.id,
            {"destination_count": len(destinations)},
        )
        await db.commit()
        await db.refresh(live_session)
        return live_session
    except AdapterError as exc:
        live_session.state = LiveSessionState.failed
        live_session.last_error_code = exc.code
        for destination in destinations:
            if destination.state == LiveDestinationState.starting:
                destination.state = LiveDestinationState.failed
                destination.last_error_code = exc.code
        _append_live_event(
            db,
            live_session,
            "session.start_failed",
            "session",
            live_session.id,
            {"failure_code": exc.code},
        )
        await db.commit()
        raise _adapter_api_error(exc, operation="session start") from exc


async def reconnect_session(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    live_session: LiveSession,
) -> LiveSession:
    if live_session.state not in {
        LiveSessionState.live,
        LiveSessionState.reconnecting,
        LiveSessionState.failed,
    }:
        raise APIError(
            409,
            "live_reconnect_state_conflict",
            "Live reconnect unavailable",
            "Only a live, reconnecting, or failed session can reconnect.",
        )
    live_session.state = LiveSessionState.reconnecting
    destinations = await session_destinations(db, live_session.id)
    failures = 0
    for destination in destinations:
        if destination.state == LiveDestinationState.live:
            continue
        if destination.reconnect_count >= destination.max_reconnects:
            destination.state = LiveDestinationState.failed
            destination.last_error_code = "manual_intervention_required"
            failures += 1
            continue
        connection = await db.get(IntegrationConnection, destination.connection_id)
        assert connection is not None
        destination.reconnect_count += 1
        destination.state = LiveDestinationState.reconnecting
        destination.next_retry_at = utcnow() + timedelta(
            seconds=retry_delay_seconds(destination.reconnect_count)
        )
        health = await registry.resolve(connection.platform).health(
            connection_context(connection, settings)
        )
        if health.ok:
            destination.state = LiveDestinationState.live
            destination.next_retry_at = None
            destination.last_error_code = None
            connection.last_reconnect_at = utcnow()
        else:
            destination.last_error_code = health.status
            failures += 1
    live_session.state = (
        LiveSessionState.reconnecting if failures else LiveSessionState.live
    )
    live_session.last_error_code = "destination_reconnect_pending" if failures else None
    _append_live_event(
        db,
        live_session,
        "session.reconnect_checked",
        "session",
        live_session.id,
        {"failure_count": failures},
    )
    await db.commit()
    await db.refresh(live_session)
    return live_session


async def end_session(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    live_session: LiveSession,
) -> LiveSession:
    if live_session.state in {LiveSessionState.ended, LiveSessionState.ending}:
        raise APIError(
            409,
            "live_end_state_conflict",
            "Live session already ending",
            "The live session is already ending or ended.",
        )
    live_session.state = LiveSessionState.ending
    destinations = await session_destinations(db, live_session.id)
    errors: list[str] = []
    for destination in destinations:
        connection = await db.get(IntegrationConnection, destination.connection_id)
        if connection is None:
            continue
        if destination.publish_enabled and destination.external_broadcast_id:
            try:
                await registry.resolve(connection.platform).end_broadcast(
                    connection_context(connection, settings),
                    destination.external_broadcast_id,
                )
            except AdapterError as exc:
                errors.append(exc.code)
                destination.last_error_code = exc.code
        destination.state = LiveDestinationState.ended
    media = registry.resolve(IntegrationPlatform.rtmp_webrtc)
    if live_session.ingest_provisioned:
        try:
            await media.end_broadcast(
                media_context(), live_session.ingest_path
            )
            live_session.ingest_provisioned = False
        except AdapterError as exc:
            errors.append(exc.code)
    live_session.state = LiveSessionState.ended if not errors else LiveSessionState.failed
    live_session.ended_at = utcnow()
    live_session.last_error_code = errors[0] if errors else None
    _append_live_event(
        db,
        live_session,
        "session.ended" if not errors else "session.end_failed",
        "session",
        live_session.id,
        {"failure_codes": errors},
    )
    await db.commit()
    await db.refresh(live_session)
    return live_session


def _serialized_inbound(event: AdapterInboundEvent) -> dict[str, Any]:
    text = validate_plain_text(event.text) if event.text is not None else None
    if text is not None and len(text) > 10_000:
        raise AdapterError("live_event_text_too_large")
    currency = event.currency.upper() if event.currency else None
    if currency and (len(currency) != 3 or not currency.isalpha()):
        raise AdapterError("live_event_currency_invalid")
    if event.monetary_minor is not None and event.monetary_minor < 0:
        raise AdapterError("live_event_amount_invalid")
    metadata = _safe_provider_metadata(event.safe_metadata)
    return {
        "platform_event_id": event.platform_event_id,
        "event_type": event.event_type.value,
        "occurred_at": event.occurred_at.isoformat(),
        "actor_platform_id": event.actor_platform_id,
        "actor_display_name": validate_plain_text(event.actor_display_name)
        if event.actor_display_name
        else None,
        "text": text,
        "monetary_minor": event.monetary_minor,
        "currency": currency,
        "safe_metadata": metadata,
    }


async def accept_webhook(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    connection: IntegrationConnection,
    headers: Mapping[str, str],
    body: bytes,
    dispatcher: WebhookDispatcher,
) -> tuple[IntegrationWebhookDelivery, bool]:
    if connection.state not in {IntegrationState.connected, IntegrationState.degraded}:
        raise APIError(
            409,
            "live_integration_not_connected",
            "Live integration not connected",
            "Webhook delivery is disabled for this integration.",
        )
    adapter = registry.resolve(connection.platform)
    context = connection_context(connection, settings)
    try:
        provider_event_id = adapter.verify_webhook(context, headers, body)
        inbound = adapter.ingest_webhook(context, headers, body)
        normalized = [_serialized_inbound(event) for event in inbound]
    except AdapterError as exc:
        raise APIError(
            401
            if "signature" in exc.code
            else 422,
            exc.code,
            "Live webhook rejected",
            "The webhook failed official transport verification or its strict schema.",
        ) from exc
    existing = await db.scalar(
        select(IntegrationWebhookDelivery).where(
            IntegrationWebhookDelivery.connection_id == connection.id,
            IntegrationWebhookDelivery.provider_event_id == provider_event_id,
        )
    )
    if existing is not None:
        return existing, True
    delivery = IntegrationWebhookDelivery(
        connection_id=connection.id,
        platform=connection.platform,
        provider_event_id=provider_event_id,
        event_payload={"normalized": normalized},
        payload_hash=hashlib.sha256(body).hexdigest(),
    )
    db.add(delivery)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await db.scalar(
            select(IntegrationWebhookDelivery).where(
                IntegrationWebhookDelivery.connection_id == connection.id,
                IntegrationWebhookDelivery.provider_event_id == provider_event_id,
            )
        )
        assert existing is not None
        return existing, True
    await db.refresh(delivery)
    try:
        await dispatcher(delivery.id)
    except Exception as exc:
        delivery.failure_code = "webhook_dispatch_unavailable"
        await db.commit()
        raise APIError(
            503,
            "webhook_dispatch_unavailable",
            "Live webhook queue unavailable",
            "The verified webhook was persisted but could not be queued for processing.",
        ) from exc
    return delivery, False


async def _active_destination_for_connection(
    db: AsyncSession, connection_id: uuid.UUID
) -> tuple[LiveDestination, LiveSession] | None:
    row = (
        await db.execute(
            select(LiveDestination, LiveSession)
            .join(LiveSession, LiveSession.id == LiveDestination.session_id)
            .where(
                LiveDestination.connection_id == connection_id,
                LiveDestination.state.in_(
                    (LiveDestinationState.live, LiveDestinationState.reconnecting)
                ),
                LiveSession.state.in_(
                    (LiveSessionState.live, LiveSessionState.reconnecting)
                ),
            )
            .order_by(LiveSession.started_at.desc())
            .limit(1)
        )
    ).first()
    return (row[0], row[1]) if row else None


async def persist_normalized_event(
    db: AsyncSession,
    live_session: LiveSession,
    destination: LiveDestination | None,
    connection_id: uuid.UUID | None,
    payload: Mapping[str, Any],
) -> LiveNormalizedEvent:
    platform_event_id = str(payload["platform_event_id"])
    if connection_id:
        existing = await db.scalar(
            select(LiveNormalizedEvent).where(
                LiveNormalizedEvent.connection_id == connection_id,
                LiveNormalizedEvent.platform_event_id == platform_event_id,
            )
        )
        if existing is not None:
            return existing
    sequence = int(
        await db.scalar(
            select(func.coalesce(func.max(LiveNormalizedEvent.sequence), 0)).where(
                LiveNormalizedEvent.session_id == live_session.id
            )
        )
        or 0
    ) + 1
    event = LiveNormalizedEvent(
        session_id=live_session.id,
        destination_id=destination.id if destination else None,
        connection_id=connection_id,
        sequence=sequence,
        event_type=LiveNormalizedEventType(str(payload["event_type"])),
        platform_event_id=platform_event_id,
        actor_platform_id=payload.get("actor_platform_id"),
        actor_display_name=payload.get("actor_display_name"),
        text=payload.get("text"),
        monetary_minor=payload.get("monetary_minor"),
        currency=payload.get("currency"),
        safe_metadata=dict(payload.get("safe_metadata", {})),
        occurred_at=_aware_datetime(str(payload["occurred_at"])),
    )
    db.add(event)
    await db.flush()
    _append_live_event(
        db,
        live_session,
        "normalized_event.created",
        "normalized_event",
        event.id,
        {"sequence": sequence, "event_type": event.event_type.value},
    )
    return event


def _aware_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


async def process_webhook_delivery(
    db: AsyncSession, delivery_id: uuid.UUID
) -> list[LiveNormalizedEvent]:
    delivery = await db.get(IntegrationWebhookDelivery, delivery_id)
    if delivery is None:
        raise ValueError("webhook delivery does not exist")
    if delivery.processed_at is not None:
        return []
    active = await _active_destination_for_connection(db, delivery.connection_id)
    if active is None:
        delivery.failure_code = "no_active_live_session"
        delivery.processed_at = utcnow()
        await db.commit()
        return []
    destination, live_session = active
    records: list[LiveNormalizedEvent] = []
    try:
        for payload in delivery.event_payload.get("normalized", []):
            event = await persist_normalized_event(
                db, live_session, destination, delivery.connection_id, payload
            )
            records.append(event)
            await evaluate_rules_for_event(db, live_session, event)
        delivery.processed_at = utcnow()
        delivery.failure_code = None
        await db.commit()
        return records
    except Exception:
        await db.rollback()
        delivery = await db.get(IntegrationWebhookDelivery, delivery_id)
        if delivery is not None:
            delivery.failure_code = "webhook_processing_failed"
            await db.commit()
        raise


def event_rule_context(event: LiveNormalizedEvent) -> dict[str, Any]:
    return {
        "event_type": event.event_type.value,
        "text": event.text,
        "actor_platform_id": event.actor_platform_id,
        "actor_display_name": event.actor_display_name,
        "monetary_minor": event.monetary_minor,
        "currency": event.currency,
        "metadata": event.safe_metadata,
    }


def _event_filter_matches(rule: AILiveRule, event: LiveNormalizedEvent) -> bool:
    context = event_rule_context(event)
    for key, expected in rule.event_filter.items():
        if key == "metadata" and isinstance(expected, Mapping):
            if any(event.safe_metadata.get(item) != value for item, value in expected.items()):
                return False
        elif context.get(key) != expected:
            return False
    return True


async def evaluate_rules_for_event(
    db: AsyncSession, live_session: LiveSession, event: LiveNormalizedEvent
) -> list[LiveAction]:
    if live_session.owner_user_id is None:
        return []
    rules = list(
        (
            await db.scalars(
                select(AILiveRule).where(
                    AILiveRule.owner_user_id == live_session.owner_user_id,
                    AILiveRule.enabled.is_(True),
                    AILiveRule.trigger_event == event.event_type,
                    or_(
                        AILiveRule.workspace_id.is_(None),
                        AILiveRule.workspace_id == live_session.workspace_id,
                    ),
                )
            )
        ).all()
    )
    now = utcnow()
    actions: list[LiveAction] = []
    for rule in rules:
        if not _event_filter_matches(rule, event) or not evaluate_condition(
            rule.condition_dsl, event_rule_context(event)
        ):
            continue
        if rule.cooldown_seconds:
            recent = await db.scalar(
                select(LiveAction.id)
                .where(
                    LiveAction.rule_id == rule.id,
                    LiveAction.created_at
                    >= now - timedelta(seconds=rule.cooldown_seconds),
                )
                .limit(1)
            )
            if recent is not None:
                continue
        count = int(
            await db.scalar(
                select(func.count())
                .select_from(LiveAction)
                .where(
                    LiveAction.rule_id == rule.id,
                    LiveAction.created_at
                    >= now - timedelta(seconds=rule.rate_limit_window_seconds),
                )
            )
            or 0
        )
        if count >= rule.rate_limit_count:
            continue
        idempotency_key = hashlib.sha256(
            f"live-rule:{rule.id}:{event.id}".encode()
        ).hexdigest()
        existing = await db.scalar(
            select(LiveAction).where(
                LiveAction.idempotency_key == idempotency_key
            )
        )
        if existing is not None:
            actions.append(existing)
            continue
        destination_id = rule.action_configuration.get("destination_id")
        action = LiveAction(
            session_id=live_session.id,
            event_id=event.id,
            rule_id=rule.id,
            destination_id=uuid.UUID(destination_id)
            if isinstance(destination_id, str)
            else None,
            action_type=rule.action_type,
            state=LiveActionState.queued,
            idempotency_key=idempotency_key,
            typed_payload=rule.action_configuration,
            requires_approval=(
                rule.requires_approval
                or rule.risk != LiveRuleRisk.low
                or live_session.ai_mode != LiveAIMode.autopilot
            ),
        )
        db.add(action)
        await db.flush()
        db.add(
            LiveActionTransition(
                action_id=action.id,
                from_state=None,
                to_state=LiveActionState.queued,
            )
        )
        _append_live_event(
            db,
            live_session,
            "action.queued",
            "action",
            action.id,
            {"action_type": action.action_type.value},
        )
        actions.append(action)
    return actions


async def _transition_action(
    db: AsyncSession,
    action: LiveAction,
    new_state: LiveActionState,
    failure_code: str | None = None,
) -> None:
    prior = action.state
    action.state = new_state
    action.failure_code = failure_code
    db.add(
        LiveActionTransition(
            action_id=action.id,
            from_state=prior,
            to_state=new_state,
            failure_code=failure_code,
        )
    )


async def execute_live_action(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    action: LiveAction,
) -> LiveAction:
    if action.state not in {LiveActionState.queued, LiveActionState.retry}:
        raise APIError(
            409,
            "live_action_state_conflict",
            "Live action state conflict",
            "Only queued or retry actions can execute.",
        )
    if action.requires_approval and action.approved_at is None:
        raise APIError(
            409,
            "live_action_approval_required",
            "Live action approval required",
            "A human must approve this action before execution.",
        )
    if action.action_type == LiveActionType.moderate and action.typed_payload.get(
        "kind"
    ) == "ban":
        raise APIError(
            409,
            "live_auto_ban_forbidden",
            "Automatic ban forbidden",
            "Live automation never executes a ban action.",
        )
    destination = (
        await db.get(LiveDestination, action.destination_id)
        if action.destination_id
        else None
    )
    if destination is not None and (
        destination.session_id != action.session_id
        or destination.state != LiveDestinationState.live
    ):
        destination = None
    required_flag = None
    if action.action_type == LiveActionType.respond_text:
        required_flag = LiveDestination.chat_enabled
    elif action.action_type == LiveActionType.moderate:
        required_flag = LiveDestination.moderation_enabled
    if destination is not None and required_flag is not None:
        enabled = (
            destination.chat_enabled
            if action.action_type == LiveActionType.respond_text
            else destination.moderation_enabled
        )
        if not enabled:
            destination = None
    if destination is None:
        destination_statement = select(LiveDestination).where(
            LiveDestination.session_id == action.session_id,
            LiveDestination.state == LiveDestinationState.live,
        )
        if required_flag is not None:
            destination_statement = destination_statement.where(
                required_flag.is_(True)
            )
        destination = await db.scalar(
            destination_statement.order_by(
                LiveDestination.created_at
            ).limit(1)
        )
    if destination is None:
        raise APIError(
            409,
            "live_action_destination_unavailable",
            "Live action destination unavailable",
            "No active destination can execute this action.",
        )
    connection = await db.get(IntegrationConnection, destination.connection_id)
    if connection is None:
        raise APIError(
            409,
            "live_action_destination_unavailable",
            "Live action destination unavailable",
            "The integration connection is unavailable.",
        )
    adapter = registry.resolve(connection.platform)
    await _transition_action(db, action, LiveActionState.executing)
    await db.commit()
    action_id = action.id
    try:
        context = connection_context(connection, settings)
        result: AdapterActionResult
        if action.action_type == LiveActionType.respond_text:
            text = str(action.typed_payload.get("text", ""))
            if not text:
                raise AdapterError("live_action_text_required")
            result = await adapter.send_chat(context, validate_plain_text(text))
        elif action.action_type == LiveActionType.moderate:
            result = await adapter.moderate(context, action.typed_payload)
        elif action.action_type in {
            LiveActionType.obs_scene,
            LiveActionType.overlay,
            LiveActionType.gift_effect,
            LiveActionType.quiz,
            LiveActionType.game,
            LiveActionType.custom_tool,
        }:
            result = await adapter.update_broadcast(
                context,
                destination.external_broadcast_id or str(destination.id),
                action.typed_payload,
            )
        else:
            raise AdapterError("live_action_execution_unavailable")
        action.official_response_reference_hash = hashlib.sha256(
            result.provider_reference.encode()
        ).hexdigest()
        await _transition_action(db, action, LiveActionState.succeeded)
        live_session = await db.get(LiveSession, action.session_id)
        assert live_session is not None
        _append_live_event(
            db,
            live_session,
            "action.succeeded",
            "action",
            action.id,
            {"action_type": action.action_type.value},
        )
        await db.commit()
        await db.refresh(action)
        return action
    except AdapterError as exc:
        await db.rollback()
        failed_action = await db.get(LiveAction, action_id)
        assert failed_action is not None
        failed_action.retry_count += 1
        terminal = (
            not exc.retryable
            or exc.revoked
            or failed_action.retry_count >= failed_action.max_retries
        )
        if terminal:
            await _transition_action(
                db,
                failed_action,
                LiveActionState.failed,
                "manual_intervention_required"
                if failed_action.retry_count >= failed_action.max_retries
                else exc.code,
            )
            failed_action.next_retry_at = None
        else:
            await _transition_action(
                db, failed_action, LiveActionState.retry, exc.code
            )
            failed_action.next_retry_at = utcnow() + timedelta(
                seconds=retry_delay_seconds(failed_action.retry_count)
            )
        if exc.revoked:
            connection.state = IntegrationState.revoked
            connection.last_error_code = exc.code
            connection.last_error_at = utcnow()
        await db.commit()
        if terminal:
            raise _adapter_api_error(exc, operation="action execution") from exc
        return failed_action


async def approve_live_action(
    db: AsyncSession, action: LiveAction, user_id: uuid.UUID
) -> LiveAction:
    if action.state != LiveActionState.queued or action.approved_at is not None:
        raise APIError(
            409,
            "live_action_state_conflict",
            "Live action state conflict",
            "Only a queued unapproved action can be approved.",
        )
    action.approved_by_user_id = user_id
    action.approved_at = utcnow()
    if action.action_type == LiveActionType.respond_voice and action.event_id:
        turn = await db.scalar(
            select(AILiveTurn).where(
                AILiveTurn.event_id == action.event_id,
                AILiveTurn.session_id == action.session_id,
            )
        )
        if turn is not None:
            turn.human_approved_by_id = user_id
            turn.human_approved_at = action.approved_at
    await db.commit()
    await db.refresh(action)
    return action


async def generate_live_ai_turn(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    event: LiveNormalizedEvent,
    persona: AILivePersona,
    live_session: LiveSession,
    action_type: LiveActionType,
    *,
    destination_id: uuid.UUID | None,
    allow_text_fallback: bool,
) -> AILiveTurn:
    turn = AILiveTurn(
        session_id=live_session.id,
        event_id=event.id,
        persona_id=persona.id,
        status=LiveTurnStatus.queued,
    )
    db.add(turn)
    await db.flush()
    turn_id = turn.id
    if live_session.owner_user_id is None:
        turn.status = LiveTurnStatus.unavailable
        turn.failure_code = "live_owner_deleted"
        await db.commit()
        return turn
    if live_session.ai_mode == LiveAIMode.off:
        turn.status = LiveTurnStatus.unavailable
        turn.failure_code = "live_ai_disabled"
        await db.commit()
        return turn
    prompt = await db.scalar(
        select(PromptTemplate).where(
            PromptTemplate.template_key == persona.system_prompt_reference,
            PromptTemplate.version == persona.system_prompt_version,
            PromptTemplate.capability == AICapability.chat,
            PromptTemplate.state == PromptTemplateState.published,
        )
    )
    if prompt is None:
        turn.status = LiveTurnStatus.unavailable
        turn.failure_code = "live_persona_prompt_unavailable"
        await db.commit()
        return turn
    if not event.text:
        turn.status = LiveTurnStatus.unavailable
        turn.failure_code = "live_event_text_unavailable"
        await db.commit()
        return turn
    conversation_title = f"live:{live_session.id}:{persona.id}"
    conversation = await db.scalar(
        select(AIConversation).where(
            AIConversation.user_id == live_session.owner_user_id,
            AIConversation.title == conversation_title,
            AIConversation.deleted_at.is_(None),
        )
    )
    mode = {
        LiveAIMode.copilot: AIConversationMode.copilot,
        LiveAIMode.autopilot: AIConversationMode.autopilot,
        LiveAIMode.manual: AIConversationMode.manual,
    }[live_session.ai_mode]
    if conversation is None:
        conversation = AIConversation(
            user_id=live_session.owner_user_id,
            title=conversation_title,
            mode=mode,
            locale=live_session.language,
        )
        db.add(conversation)
        await db.flush()
        db.add(
            AIMessage(
                conversation_id=conversation.id,
                role=AIMessageRole.system,
                content=prompt.content,
                structured_content_refs=[],
                status=AIMessageStatus.completed,
                completed_at=utcnow(),
            )
        )
    await db.commit()
    started = utcnow()
    try:
        response, _ = await send_chat_message(
            db,
            request.app.state.ai_provider_registry,
            settings,
            request,
            user_id=live_session.owner_user_id,
            conversation_id=conversation.id,
            payload=AISendMessageRequest(content=event.text),
        )
        completed_turn = await db.get(AILiveTurn, turn_id)
        assert completed_turn is not None
        completed_turn.ai_conversation_id = conversation.id
        completed_turn.ai_message_id = response.id
        completed_turn.response_text = response.content
        completed_turn.latency_ms = int((utcnow() - started).total_seconds() * 1000)
        completed_turn.status = (
            LiveTurnStatus.awaiting_approval
            if live_session.ai_mode != LiveAIMode.autopilot
            else LiveTurnStatus.succeeded
        )
        action_payload: dict[str, Any] = {"text": response.content}
        effective_action_type = action_type
        if action_type == LiveActionType.respond_voice:
            try:
                job = await create_generation_job(
                    db,
                    request.app.state.ai_provider_registry,
                    request.app.state.ai_job_dispatcher,
                    live_session.owner_user_id,
                    AICapability.voice,
                    {
                        "text": response.content,
                        "voice_config_reference": persona.voice_config_reference,
                        "locale": live_session.language,
                    },
                )
                completed_turn.ai_job_id = job.id
                completed_turn.status = (
                    LiveTurnStatus.queued
                    if live_session.ai_mode == LiveAIMode.autopilot
                    else LiveTurnStatus.awaiting_approval
                )
            except APIError as exc:
                if not allow_text_fallback:
                    completed_turn.status = LiveTurnStatus.unavailable
                    completed_turn.failure_code = exc.code
                    await db.commit()
                    return completed_turn
                effective_action_type = LiveActionType.respond_text
        if effective_action_type == LiveActionType.respond_text:
            selected_destination = (
                await db.get(LiveDestination, destination_id)
                if destination_id
                else None
            )
            if selected_destination is not None and (
                selected_destination.session_id != live_session.id
                or selected_destination.state != LiveDestinationState.live
                or not selected_destination.chat_enabled
            ):
                selected_destination = None
            if selected_destination is None:
                selected_destination = await db.scalar(
                    select(LiveDestination)
                    .where(
                        LiveDestination.session_id == live_session.id,
                        LiveDestination.state == LiveDestinationState.live,
                        LiveDestination.chat_enabled.is_(True),
                    )
                    .order_by(LiveDestination.created_at)
                    .limit(1)
                )
            if selected_destination is None:
                completed_turn.status = LiveTurnStatus.unavailable
                completed_turn.failure_code = "live_chat_destination_unavailable"
                await db.commit()
                return completed_turn
            destination_id = selected_destination.id
        action = LiveAction(
            session_id=live_session.id,
            event_id=event.id,
            destination_id=destination_id,
            action_type=effective_action_type,
            state=LiveActionState.queued,
            idempotency_key=hashlib.sha256(
                f"live-ai-turn:{completed_turn.id}:{effective_action_type.value}".encode()
            ).hexdigest(),
            typed_payload=action_payload,
            requires_approval=live_session.ai_mode != LiveAIMode.autopilot,
        )
        db.add(action)
        await db.flush()
        db.add(
            LiveActionTransition(
                action_id=action.id,
                from_state=None,
                to_state=LiveActionState.queued,
            )
        )
        _append_live_event(
            db,
            live_session,
            "turn.completed",
            "turn",
            completed_turn.id,
            {"action_id": str(action.id), "status": completed_turn.status.value},
        )
        await db.commit()
        await db.refresh(completed_turn)
        return completed_turn
    except APIError as exc:
        await db.rollback()
        unavailable_turn = await db.get(AILiveTurn, turn_id)
        assert unavailable_turn is not None
        unavailable_turn.status = LiveTurnStatus.unavailable
        unavailable_turn.failure_code = exc.code
        unavailable_turn.latency_ms = int(
            (utcnow() - started).total_seconds() * 1000
        )
        await db.commit()
        return unavailable_turn


async def moderate_live_event(
    db: AsyncSession,
    ai_registry: Any,
    live_session: LiveSession,
    event: LiveNormalizedEvent,
) -> LiveModerationDecision:
    if live_session.owner_user_id is None or not event.text:
        raise APIError(
            409,
            "live_moderation_input_unavailable",
            "Live moderation input unavailable",
            "A current owner and plain-text event are required.",
        )
    provider, result = await invoke_moderation(
        db,
        ai_registry,
        live_session.owner_user_id,
        event.text,
    )
    recommendation = {
        "allow": ModerationDisposition.allow,
        "review": ModerationDisposition.review,
        "block": ModerationDisposition.review,
    }[result.recommendation]
    decision = LiveModerationDecision(
        session_id=live_session.id,
        event_id=event.id,
        destination_id=event.destination_id,
        provider=provider,
        recommendation=recommendation,
        confidence=result.confidence,
        categories=dict(result.categories),
        policy_snapshot=live_session.moderation_policy,
        automatically_actioned=False,
    )
    db.add(decision)
    await db.flush()
    policy = live_session.moderation_policy
    auto_actions = policy.get("auto_actions", {})
    minimum_confidence = float(policy.get("minimum_confidence", 1))
    selected: tuple[str, str, float] | None = None
    if live_session.moderation_mode.value == "policy":
        for category, confidence in result.categories.items():
            action_kind = auto_actions.get(category)
            if (
                action_kind in {"delete", "timeout"}
                and confidence >= minimum_confidence
                and (selected is None or confidence > selected[2])
            ):
                selected = (category, action_kind, confidence)
    if selected and event.destination_id:
        category, kind, _ = selected
        payload: dict[str, Any] = {
            "kind": kind,
            "platform_user_id": event.actor_platform_id,
            "message_id": event.platform_event_id,
            "reason": f"Configured high-confidence category: {category}",
        }
        if kind == "timeout":
            payload["duration_seconds"] = int(policy.get("timeout_seconds", 300))
        action = LiveAction(
            session_id=live_session.id,
            event_id=event.id,
            destination_id=event.destination_id,
            action_type=LiveActionType.moderate,
            state=LiveActionState.queued,
            idempotency_key=hashlib.sha256(
                f"live-moderation:{decision.id}:{kind}".encode()
            ).hexdigest(),
            typed_payload=payload,
            requires_approval=False,
        )
        db.add(action)
        await db.flush()
        db.add(
            LiveActionTransition(
                action_id=action.id,
                from_state=None,
                to_state=LiveActionState.queued,
            )
        )
        decision.action_id = action.id
        decision.automatically_actioned = True
        decision.recommendation = ModerationDisposition(kind)
    await db.commit()
    await db.refresh(decision)
    return decision


async def record_human_moderation_decision(
    db: AsyncSession,
    live_session: LiveSession,
    event: LiveNormalizedEvent,
    disposition: ModerationDisposition,
    moderator_user_id: uuid.UUID,
) -> LiveModerationDecision:
    decision = LiveModerationDecision(
        session_id=live_session.id,
        event_id=event.id,
        destination_id=event.destination_id,
        recommendation=disposition,
        confidence=1,
        categories={},
        policy_snapshot={"human_decision": True},
        automatically_actioned=False,
        decided_by_user_id=moderator_user_id,
    )
    db.add(decision)
    await db.commit()
    await db.refresh(decision)
    return decision


async def create_game(
    db: AsyncSession, owner_user_id: uuid.UUID, payload: GameCreate
) -> LiveGameSession:
    live_session = await owned_live_session(
        db, payload.live_session_id, owner_user_id
    )
    game = LiveGameSession(
        live_session_id=live_session.id,
        owner_user_id=owner_user_id,
        title=payload.title,
    )
    db.add(game)
    await db.flush()
    for position, item in enumerate(payload.questions, start=1):
        db.add(
            LiveGameQuestion(
                game_session_id=game.id,
                position=position,
                prompt=item.prompt,
                options=item.options,
                correct_option=item.correct_option,
                points=item.points,
            )
        )
    await db.commit()
    await db.refresh(game)
    return game


async def owned_game(
    db: AsyncSession, game_id: uuid.UUID, owner_user_id: uuid.UUID
) -> LiveGameSession:
    game = await db.scalar(
        select(LiveGameSession).where(
            LiveGameSession.id == game_id,
            LiveGameSession.owner_user_id == owner_user_id,
        )
    )
    if game is None:
        raise APIError(
            404,
            "live_game_not_found",
            "Live game not found",
            "The live game does not exist.",
        )
    return game


async def start_game(db: AsyncSession, game: LiveGameSession) -> LiveGameSession:
    if game.state != GameState.draft:
        raise APIError(
            409,
            "live_game_state_conflict",
            "Live game state conflict",
            "Only a draft game can start.",
        )
    game.state = GameState.active
    game.started_at = utcnow()
    await db.commit()
    await db.refresh(game)
    return game


async def answer_game_question(
    db: AsyncSession,
    game: LiveGameSession,
    payload: GameAnswerRequest,
) -> GameAnswerResponse:
    if game.state != GameState.active:
        raise APIError(
            409,
            "live_game_not_active",
            "Live game is not active",
            "Answers are accepted only while the game is active.",
        )
    question = await db.scalar(
        select(LiveGameQuestion).where(
            LiveGameQuestion.id == payload.question_id,
            LiveGameQuestion.game_session_id == game.id,
        )
    )
    connection = await db.get(IntegrationConnection, payload.connection_id)
    if question is None or connection is None:
        raise APIError(
            404,
            "live_game_question_not_found",
            "Live game question not found",
            "The question or its verified platform connection does not exist.",
        )
    if payload.selected_option >= len(question.options):
        raise APIError(
            422,
            "live_game_option_invalid",
            "Live game option invalid",
            "The selected option does not exist.",
        )
    correct = payload.selected_option == question.correct_option
    awarded = question.points if correct else 0
    answer = LiveParticipantAnswer(
        question_id=question.id,
        connection_id=connection.id,
        platform_user_id=payload.platform_user_id,
        selected_option=payload.selected_option,
        correct=correct,
        awarded_points=awarded,
    )
    db.add(answer)
    score = await db.scalar(
        select(LiveGameScore).where(
            LiveGameScore.game_session_id == game.id,
            LiveGameScore.connection_id == connection.id,
            LiveGameScore.platform_user_id == payload.platform_user_id,
        )
    )
    if score is None:
        score = LiveGameScore(
            game_session_id=game.id,
            connection_id=connection.id,
            platform_user_id=payload.platform_user_id,
            display_name=payload.display_name,
            score=0,
        )
        db.add(score)
    score.score += awarded
    if payload.display_name:
        score.display_name = payload.display_name
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "live_game_answer_exists",
            "Live game answer already exists",
            "A participant can answer each question only once.",
        ) from exc
    await db.refresh(answer)
    await db.refresh(score)
    return GameAnswerResponse(
        answer_id=answer.id,
        correct=answer.correct,
        awarded_points=answer.awarded_points,
        total_score=score.score,
    )


async def end_game(db: AsyncSession, game: LiveGameSession) -> LiveGameSession:
    if game.state != GameState.active:
        raise APIError(
            409,
            "live_game_state_conflict",
            "Live game state conflict",
            "Only an active game can end.",
        )
    game.state = GameState.ended
    game.ended_at = utcnow()
    await db.commit()
    await db.refresh(game)
    return game


async def normalize_sylora_gift_event(
    db: AsyncSession, gift_event: GiftEvent
) -> list[LiveNormalizedEvent]:
    """Map a real first-party gift delivery without creating external money or credits."""
    sessions = list(
        (
            await db.scalars(
                select(LiveSession).where(
                    LiveSession.owner_user_id == gift_event.user_id,
                    LiveSession.state == LiveSessionState.live,
                )
            )
        ).all()
    )
    records: list[LiveNormalizedEvent] = []
    for live_session in sessions:
        event = await persist_normalized_event(
            db,
            live_session,
            None,
            None,
            {
                "platform_event_id": f"sylora-gift:{gift_event.id}",
                "event_type": LiveNormalizedEventType.custom.value,
                "occurred_at": gift_event.created_at.isoformat(),
                "actor_platform_id": None,
                "actor_display_name": None,
                "text": None,
                "monetary_minor": None,
                "currency": None,
                "safe_metadata": {
                    "source": "sylora_first_party_gift",
                    "gift_event_id": str(gift_event.id),
                    "gift_send_id": str(gift_event.gift_send_id)
                    if gift_event.gift_send_id
                    else None,
                    "does_not_mint_credits": True,
                },
            },
        )
        records.append(event)
        await evaluate_rules_for_event(db, live_session, event)
    await db.commit()
    return records


async def refresh_due_connections(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
) -> dict[str, int]:
    threshold = utcnow() + timedelta(minutes=10)
    records = list(
        (
            await db.scalars(
                select(IntegrationConnection).where(
                    IntegrationConnection.state.in_(
                        (IntegrationState.connected, IntegrationState.degraded)
                    ),
                    IntegrationConnection.token_expires_at.is_not(None),
                    IntegrationConnection.token_expires_at <= threshold,
                )
            )
        ).all()
    )
    refreshed = 0
    revoked = 0
    failed = 0
    for connection in records:
        try:
            result = await registry.resolve(connection.platform).refresh(
                connection_context(connection, settings)
            )
            if not result.refreshed_access_credential:
                raise AdapterError("token_refresh_invalid_response")
            connection.encrypted_access_credential = encrypt_secret(
                result.refreshed_access_credential, settings
            )
            if result.refreshed_refresh_credential:
                connection.encrypted_refresh_credential = encrypt_secret(
                    result.refreshed_refresh_credential, settings
                )
            connection.token_expires_at = result.token_expires_at
            connection.state = IntegrationState.connected
            connection.last_error_code = None
            refreshed += 1
        except AdapterError as exc:
            connection.last_error_code = exc.code
            connection.last_error_at = utcnow()
            if exc.revoked:
                connection.state = IntegrationState.revoked
                connection.encrypted_access_credential = None
                connection.encrypted_refresh_credential = None
                revoked += 1
            else:
                connection.state = IntegrationState.degraded
                failed += 1
    await db.commit()
    return {"refreshed": refreshed, "revoked": revoked, "failed": failed}


async def check_connection_health(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
) -> dict[str, int]:
    records = list(
        (
            await db.scalars(
                select(IntegrationConnection).where(
                    IntegrationConnection.state.in_(
                        (IntegrationState.connected, IntegrationState.degraded)
                    )
                )
            )
        ).all()
    )
    healthy = 0
    unhealthy = 0
    for connection in records:
        snapshot = await health_connection(
            db, registry, settings, connection
        )
        if snapshot.status == "connected":
            healthy += 1
        else:
            unhealthy += 1
    return {"healthy": healthy, "unhealthy": unhealthy}


async def reconcile_live_voice_turns(db: AsyncSession) -> dict[str, int]:
    turns = list(
        (
            await db.scalars(
                select(AILiveTurn)
                .where(
                    AILiveTurn.ai_job_id.is_not(None),
                    AILiveTurn.audio_output_reference.is_(None),
                    AILiveTurn.status.in_(
                        (
                            LiveTurnStatus.queued,
                            LiveTurnStatus.awaiting_approval,
                            LiveTurnStatus.succeeded,
                        )
                    ),
                )
                .limit(200)
            )
        ).all()
    )
    ready = 0
    failed = 0
    for turn in turns:
        job = await db.get(AIJob, turn.ai_job_id)
        if job is None:
            continue
        if job.status == AIJobStatus.failed:
            turn.status = LiveTurnStatus.failed
            turn.failure_code = job.failure_code or "live_voice_generation_failed"
            failed += 1
            continue
        if job.status != AIJobStatus.succeeded:
            continue
        audio = next(
            (
                item
                for item in job.output_refs
                if str(item.get("content_type", "")).startswith("audio/")
                and item.get("object_key")
            ),
            None,
        )
        if audio is None:
            turn.status = LiveTurnStatus.failed
            turn.failure_code = "live_voice_output_invalid"
            failed += 1
            continue
        turn.audio_output_reference = str(audio["object_key"])
        action = await db.scalar(
            select(LiveAction).where(
                LiveAction.event_id == turn.event_id,
                LiveAction.action_type == LiveActionType.respond_voice,
                LiveAction.state == LiveActionState.queued,
            )
        )
        if action is not None and (
            not action.requires_approval or action.approved_at is not None
        ):
            turn.status = LiveTurnStatus.succeeded
            action.official_response_reference_hash = hashlib.sha256(
                turn.audio_output_reference.encode()
            ).hexdigest()
            await _transition_action(db, action, LiveActionState.succeeded)
        live_session = await db.get(LiveSession, turn.session_id)
        if live_session is not None:
            _append_live_event(
                db,
                live_session,
                "turn.voice_ready",
                "turn",
                turn.id,
                {"audio_output_reference": turn.audio_output_reference},
            )
        ready += 1
    await db.commit()
    return {"ready": ready, "failed": failed}


async def scrub_live_user_records(
    db: AsyncSession, user_id: uuid.UUID, settings: Settings
) -> None:
    now = utcnow()
    connections = list(
        (
            await db.scalars(
                select(IntegrationConnection).where(
                    IntegrationConnection.owner_user_id == user_id
                )
            )
        ).all()
    )
    connection_ids = [item.id for item in connections]
    for connection in connections:
        connection.owner_user_id = None
        connection.owner_subject_hash = live_subject_hash(user_id)
        connection.state = IntegrationState.revoked
        connection.provider_status = "owner_deleted"
        connection.encrypted_access_credential = None
        connection.encrypted_refresh_credential = None
        connection.encrypted_connection_secret = None
        connection.external_account_id = None
        connection.external_channel_id = None
        connection.verified_capabilities = []
        connection.safe_configuration = {}
        connection.last_error_code = "owner_deleted"
        connection.last_error_at = now
    sessions = list(
        (
            await db.scalars(
                select(LiveSession).where(LiveSession.owner_user_id == user_id)
            )
        ).all()
    )
    for live_session in sessions:
        live_session.owner_user_id = None
        live_session.owner_subject_hash = live_subject_hash(user_id)
        live_session.title = "Deleted live session"
        live_session.ingest_key_hash = hash_token(secrets.token_urlsafe(32))
        live_session.ingest_provisioned = False
        if live_session.state not in {LiveSessionState.ended, LiveSessionState.failed}:
            live_session.state = LiveSessionState.failed
            live_session.ended_at = now
            live_session.last_error_code = "owner_deleted"
    if connection_ids:
        consent_ids = list(
            (
                await db.scalars(
                    select(LiveViewerConsent.id).where(
                        LiveViewerConsent.connection_id.in_(connection_ids)
                    )
                )
            ).all()
        )
        if consent_ids:
            await db.execute(
                delete(LiveViewerMemory).where(
                    LiveViewerMemory.consent_id.in_(consent_ids)
                )
            )
        await db.execute(
            delete(LiveViewerConsent).where(
                LiveViewerConsent.connection_id.in_(connection_ids)
            )
        )
    await db.execute(delete(AILiveRule).where(AILiveRule.owner_user_id == user_id))
    await db.execute(delete(AILivePersona).where(AILivePersona.owner_user_id == user_id))
