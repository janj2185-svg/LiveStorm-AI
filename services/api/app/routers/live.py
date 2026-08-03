from __future__ import annotations

import asyncio
import hashlib
import uuid
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import (
    AuthContext,
    get_session,
    get_settings,
    has_permission,
    require_permission,
)
from app.errors import APIError
from app.live_adapters import AdapterRegistry
from app.live_models import (
    AILivePersona,
    AILiveRule,
    AILiveTurn,
    IntegrationCapabilitySnapshot,
    IntegrationConnection,
    IntegrationPlatform,
    LiveAction,
    LiveDestination,
    LiveEvent,
    LiveGameQuestion,
    LiveGameScore,
    LiveGameSession,
    LiveModerationDecision,
    LiveNormalizedEvent,
    LiveSession,
    LiveSessionState,
)
from app.live_schemas import (
    ActionPage,
    CapabilitySnapshotResponse,
    EventPage,
    GameAnswerRequest,
    GameAnswerResponse,
    GameCreate,
    GameQuestionResponse,
    GameResponse,
    GameScoreResponse,
    HumanModerationRequest,
    IntegrationConnectionResponse,
    IntegrationConnectRequest,
    LiveActionResponse,
    LiveDestinationCreate,
    LiveDestinationResponse,
    LiveMediaCapabilityResponse,
    LivePublishCredentialsResponse,
    LiveSessionCreate,
    LiveSessionCreated,
    LiveSessionPatch,
    LiveSessionResponse,
    LiveTurnCreate,
    LiveTurnResponse,
    ModerationDecisionResponse,
    ModerationPage,
    NormalizedEventResponse,
    OAuthCallbackRequest,
    OAuthStartRequest,
    OAuthStartResponse,
    PersonaCreate,
    PersonaPatch,
    PersonaResponse,
    PlatformStatusResponse,
    PreflightResponse,
    RuleCreate,
    RulePatch,
    RuleResponse,
    StreamKeyRevealResponse,
    TikTokControlPanelResponse,
    TurnPage,
    WebhookAccepted,
)
from app.live_service import (
    LiveEventHub,
    accept_webhook,
    add_destination,
    answer_game_question,
    approve_live_action,
    create_game,
    create_integration_connection,
    create_live_session,
    disconnect_integration,
    end_game,
    end_session,
    execute_live_action,
    generate_live_ai_turn,
    health_connection,
    media_capability_response,
    moderate_live_event,
    oauth_callback_connection,
    oauth_start,
    owned_connection,
    owned_game,
    owned_live_session,
    preflight_session,
    publish_credentials_response,
    reconnect_session,
    record_human_moderation_decision,
    replay_event,
    rotate_stream_key,
    session_destinations,
    start_game,
    start_session,
)
from app.push_service import PushMessage, dispatch_push_best_effort
from app.rate_limit import rate_limit
from app.routers.messaging import websocket_user
from app.schemas import MessageResponse
from app.security import decode_oauth_state, ip_hash, utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor

router = APIRouter(prefix="/live", tags=["AI Live Hub"])
admin_router = APIRouter(prefix="/admin/live", tags=["Administration"])
websocket_router = APIRouter(tags=["AI Live Hub"])

ManageAuth = Annotated[AuthContext, Depends(require_permission("live:manage"))]
IntegrationAuth = Annotated[AuthContext, Depends(require_permission("live:integrations:manage"))]
ModerateAuth = Annotated[AuthContext, Depends(require_permission("live:moderate"))]
AdminAuth = Annotated[AuthContext, Depends(require_permission("live:admin"))]


def registry(request: Request) -> AdapterRegistry:
    return request.app.state.live_adapter_registry


async def live_rate_limit(request: Request, user_id: uuid.UUID) -> None:
    settings: Settings = request.app.state.settings
    await rate_limit(
        request,
        bucket=f"live:{request.url.path}",
        subject=str(user_id),
        limit=settings.live_manage_rate_limit,
        window_seconds=settings.live_rate_window_seconds,
        unavailable_detail="Live control-plane rate limiting is temporarily unavailable.",
    )


async def consume_oauth_state_once(request: Request, state: str) -> None:
    key = "sylora:live:oauth-state:" + hashlib.sha256(state.encode()).hexdigest()
    try:
        accepted = await request.app.state.redis.set(key, "consumed", ex=600, nx=True)
    except Exception as exc:
        raise APIError(
            503,
            "live_oauth_state_store_unavailable",
            "Live OAuth unavailable",
            "The one-time OAuth state store is unavailable.",
        ) from exc
    if not accepted:
        raise APIError(
            400,
            "live_oauth_state_replayed",
            "Live OAuth state already used",
            "This authorization callback has already been consumed.",
        )


def integration_response(record: IntegrationConnection) -> IntegrationConnectionResponse:
    return IntegrationConnectionResponse(
        id=record.id,
        workspace_id=record.workspace_id,
        platform=record.platform,
        state=record.state,
        token_expires_at=record.token_expires_at,
        scopes=record.scopes,
        external_account_id=record.external_account_id,
        external_channel_id=record.external_channel_id,
        verified_capabilities=record.verified_capabilities,
        safe_configuration=record.safe_configuration,
        provider_status=record.provider_status,
        credential_configured=bool(record.encrypted_access_credential),
        refresh_credential_configured=bool(record.encrypted_refresh_credential),
        connection_secret_configured=bool(record.encrypted_connection_secret),
        last_health_at=record.last_health_at,
        last_error_code=record.last_error_code,
        last_error_at=record.last_error_at,
        last_reconnect_at=record.last_reconnect_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def session_response(db: AsyncSession, record: LiveSession) -> LiveSessionResponse:
    destinations = await session_destinations(db, record.id)
    return LiveSessionResponse(
        id=record.id,
        workspace_id=record.workspace_id,
        title=record.title,
        language=record.language,
        state=record.state,
        ingest_path=record.ingest_path,
        ingest_key_version=record.ingest_key_version,
        ingest_provisioned=record.ingest_provisioned,
        started_at=record.started_at,
        ended_at=record.ended_at,
        recording_enabled=record.recording_enabled,
        moderation_mode=record.moderation_mode,
        moderation_policy=record.moderation_policy,
        ai_mode=record.ai_mode,
        last_error_code=record.last_error_code,
        created_at=record.created_at,
        updated_at=record.updated_at,
        destinations=[LiveDestinationResponse.model_validate(item) for item in destinations],
    )


async def publish_latest(request: Request, session_id: uuid.UUID) -> None:
    async with request.app.state.session_factory() as db:
        record = await db.scalar(
            select(LiveEvent)
            .where(LiveEvent.session_id == session_id)
            .order_by(LiveEvent.created_at.desc(), LiveEvent.id.desc())
            .limit(1)
        )
        if record:
            await request.app.state.live_event_hub.publish(
                session_id, replay_event(record, request.app.state.settings)
            )


@router.get("/integrations", response_model=list[IntegrationConnectionResponse])
async def list_integrations(
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
) -> list[IntegrationConnectionResponse]:
    records = (
        await db.scalars(
            select(IntegrationConnection)
            .where(IntegrationConnection.owner_user_id == auth.user.id)
            .order_by(
                IntegrationConnection.created_at.desc(),
                IntegrationConnection.id.desc(),
            )
        )
    ).all()
    return [integration_response(item) for item in records]


@router.get("/tiktok/control-panel", response_model=TikTokControlPanelResponse)
async def tiktok_control_panel(
    request: Request,
    _: IntegrationAuth,
) -> TikTokControlPanelResponse:
    from app.live_platforms.common.cohost import PERSONALITY_PROFILES
    from app.live_platforms.common.events import NormalizedLiveEventType
    from app.live_platforms.tiktok.status import ADAPTER_LIMITATION, current_status

    adapter = registry(request).resolve(IntegrationPlatform.tiktok)
    snapshot = (
        adapter.control_panel_snapshot()
        if hasattr(adapter, "control_panel_snapshot")
        else {
            "integration_status": current_status().value,
            "adapter_status": adapter.descriptor().status,
            "limitation": ADAPTER_LIMITATION,
            "connection": {},
            "controls": {},
        }
    )
    return TikTokControlPanelResponse(
        integration_status=str(snapshot.get("integration_status") or current_status().value),
        adapter_status=str(snapshot.get("adapter_status") or adapter.descriptor().status),
        limitation=snapshot.get("limitation") or ADAPTER_LIMITATION,
        connection=dict(snapshot.get("connection") or {}),
        controls={str(k): bool(v) for k, v in dict(snapshot.get("controls") or {}).items()},
        personalities=sorted(PERSONALITY_PROFILES),
        supported_events=sorted(item.value for item in NormalizedLiveEventType),
    )


@router.post(
    "/integrations/connect",
    response_model=IntegrationConnectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def connect_integration(
    payload: IntegrationConnectRequest,
    request: Request,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectionResponse:
    await live_rate_limit(request, auth.user.id)
    record = await create_integration_connection(
        db, registry(request), settings, auth.user.id, payload
    )
    return integration_response(record)


@router.get(
    "/integrations/{connection_id}",
    response_model=IntegrationConnectionResponse,
)
async def get_integration(
    connection_id: uuid.UUID,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
) -> IntegrationConnectionResponse:
    return integration_response(await owned_connection(db, connection_id, auth.user.id))


@router.post(
    "/integrations/{connection_id}/health",
    response_model=CapabilitySnapshotResponse,
)
async def integration_health(
    connection_id: uuid.UUID,
    request: Request,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> IntegrationCapabilitySnapshot:
    connection = await owned_connection(db, connection_id, auth.user.id)
    return await health_connection(db, registry(request), settings, connection)


@router.get(
    "/integrations/{connection_id}/capabilities",
    response_model=list[CapabilitySnapshotResponse],
)
async def integration_capabilities(
    connection_id: uuid.UUID,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
) -> list[IntegrationCapabilitySnapshot]:
    await owned_connection(db, connection_id, auth.user.id)
    return list(
        (
            await db.scalars(
                select(IntegrationCapabilitySnapshot)
                .where(IntegrationCapabilitySnapshot.connection_id == connection_id)
                .order_by(
                    IntegrationCapabilitySnapshot.fetched_at.desc(),
                    IntegrationCapabilitySnapshot.id.desc(),
                )
                .limit(100)
            )
        ).all()
    )


@router.post(
    "/integrations/{connection_id}/disconnect",
    response_model=MessageResponse,
)
async def disconnect_connection(
    connection_id: uuid.UUID,
    request: Request,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    connection = await owned_connection(db, connection_id, auth.user.id)
    await disconnect_integration(db, registry(request), settings, connection)
    return MessageResponse(status="disconnected")


@router.post("/integrations/oauth/{platform}/start", response_model=OAuthStartResponse)
async def start_integration_oauth(
    platform: IntegrationPlatform,
    payload: OAuthStartRequest,
    request: Request,
    auth: IntegrationAuth,
    settings: Settings = Depends(get_settings),
) -> OAuthStartResponse:
    await live_rate_limit(request, auth.user.id)
    return OAuthStartResponse(
        authorization_url=oauth_start(
            registry(request),
            settings,
            auth.user.id,
            platform,
            payload.scopes,
            payload.external_channel_id,
        )
    )


@router.post(
    "/integrations/oauth/callback",
    response_model=IntegrationConnectionResponse,
)
async def integration_oauth_callback(
    payload: OAuthCallbackRequest,
    request: Request,
    auth: IntegrationAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectionResponse:
    await consume_oauth_state_once(request, payload.state)
    record = await oauth_callback_connection(
        db,
        registry(request),
        settings,
        auth.user.id,
        payload.code.get_secret_value(),
        payload.state,
    )
    return integration_response(record)


@router.get(
    "/integrations/oauth/callback",
    response_model=IntegrationConnectionResponse,
)
async def integration_oauth_browser_callback(
    request: Request,
    code: str = Query(min_length=1, max_length=4096),
    state: str = Query(min_length=20, max_length=8192),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> IntegrationConnectionResponse:
    decoded = decode_oauth_state(state, settings)
    try:
        owner_user_id = uuid.UUID(str(decoded["owner_user_id"]))
    except (KeyError, ValueError) as exc:
        raise APIError(
            400,
            "invalid_live_oauth_state",
            "Invalid live OAuth state",
            "The authorization state has no valid account owner.",
        ) from exc
    await consume_oauth_state_once(request, state)
    record = await oauth_callback_connection(
        db,
        registry(request),
        settings,
        owner_user_id,
        code,
        state,
    )
    return integration_response(record)


@router.get("/sessions", response_model=list[LiveSessionResponse])
async def list_sessions(
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> list[LiveSessionResponse]:
    records = (
        await db.scalars(
            select(LiveSession)
            .where(LiveSession.owner_user_id == auth.user.id)
            .order_by(LiveSession.created_at.desc(), LiveSession.id.desc())
            .limit(200)
        )
    ).all()
    return [await session_response(db, item) for item in records]


@router.post(
    "/sessions",
    response_model=LiveSessionCreated,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_endpoint(
    payload: LiveSessionCreate,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveSessionCreated:
    await live_rate_limit(request, auth.user.id)
    record, raw_key = await create_live_session(db, registry(request), auth.user.id, payload)
    response = await session_response(db, record)
    return LiveSessionCreated(**response.model_dump(), stream_key_once=raw_key)


@router.get("/sessions/{session_id}", response_model=LiveSessionResponse)
async def get_session_endpoint(
    session_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveSessionResponse:
    return await session_response(db, await owned_live_session(db, session_id, auth.user.id))


@router.get(
    "/sessions/{session_id}/media-capability",
    response_model=LiveMediaCapabilityResponse,
)
async def get_session_media_capability(
    session_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveMediaCapabilityResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    return media_capability_response(settings, record)


@router.post(
    "/sessions/{session_id}/media-capability",
    response_model=LiveMediaCapabilityResponse,
)
async def refresh_session_media_capability(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveMediaCapabilityResponse:
    await live_rate_limit(request, auth.user.id)
    record = await owned_live_session(db, session_id, auth.user.id)
    return media_capability_response(settings, record)


@router.post(
    "/sessions/{session_id}/publish-credentials",
    response_model=LivePublishCredentialsResponse,
)
async def publish_credentials_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LivePublishCredentialsResponse:
    await live_rate_limit(request, auth.user.id)
    record = await owned_live_session(db, session_id, auth.user.id)
    return publish_credentials_response(settings, record)


@router.patch("/sessions/{session_id}", response_model=LiveSessionResponse)
async def patch_session_endpoint(
    session_id: uuid.UUID,
    payload: LiveSessionPatch,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveSessionResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    if record.state not in {
        LiveSessionState.draft,
        LiveSessionState.preflight,
    }:
        raise APIError(
            409,
            "live_session_state_conflict",
            "Live session state conflict",
            "Session configuration is immutable after start.",
        )
    for key, value in payload.model_dump(exclude_unset=True, mode="json").items():
        if key == "moderation_policy":
            setattr(record, key, value)
        else:
            setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return await session_response(db, record)


@router.post(
    "/sessions/{session_id}/destinations",
    response_model=LiveDestinationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_destination_endpoint(
    session_id: uuid.UUID,
    payload: LiveDestinationCreate,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveDestination:
    record = await owned_live_session(db, session_id, auth.user.id)
    destination = await add_destination(db, record, auth.user.id, payload)
    await publish_latest(request, session_id)
    return destination


@router.delete(
    "/sessions/{session_id}/destinations/{destination_id}",
    response_model=MessageResponse,
)
async def delete_destination_endpoint(
    session_id: uuid.UUID,
    destination_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    if record.state not in {
        LiveSessionState.draft,
        LiveSessionState.preflight,
    }:
        raise APIError(
            409,
            "live_destination_state_conflict",
            "Destination cannot be changed",
            "Destinations can be changed only before a session starts.",
        )
    destination = await db.scalar(
        select(LiveDestination).where(
            LiveDestination.id == destination_id,
            LiveDestination.session_id == record.id,
        )
    )
    if destination is None:
        raise APIError(
            404,
            "live_destination_not_found",
            "Live destination not found",
            "The destination does not exist.",
        )
    await db.delete(destination)
    await db.commit()
    return MessageResponse(status="deleted")


@router.post("/sessions/{session_id}/preflight", response_model=PreflightResponse)
async def preflight_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PreflightResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    result = await preflight_session(db, registry(request), settings, record)
    await publish_latest(request, session_id)
    return result


@router.post("/sessions/{session_id}/start", response_model=LiveSessionResponse)
async def start_session_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveSessionResponse:
    await live_rate_limit(request, auth.user.id)
    record = await owned_live_session(db, session_id, auth.user.id)
    record = await start_session(db, registry(request), settings, record)
    await publish_latest(request, session_id)
    if record.owner_user_id is not None:
        await dispatch_push_best_effort(
            db,
            request.app.state.push_dispatcher,
            user_ids={record.owner_user_id},
            message=PushMessage(
                title="SYLORA live session started",
                body=f"{record.title} is live.",
                data={"type": "live_session_started", "session_id": str(record.id)},
            ),
            action="push.live_start_dispatch_failed",
            actor_user_id=auth.user.id,
            metadata={"session_id": record.id},
        )
    return await session_response(db, record)


@router.post("/sessions/{session_id}/reconnect", response_model=LiveSessionResponse)
async def reconnect_session_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveSessionResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    record = await reconnect_session(db, registry(request), settings, record)
    await publish_latest(request, session_id)
    return await session_response(db, record)


@router.post("/sessions/{session_id}/end", response_model=LiveSessionResponse)
async def end_session_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveSessionResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    record = await end_session(db, registry(request), settings, record)
    await publish_latest(request, session_id)
    return await session_response(db, record)


@router.get(
    "/sessions/{session_id}/stream-key",
    response_model=StreamKeyRevealResponse,
)
async def reveal_stream_key_unavailable(
    session_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> StreamKeyRevealResponse:
    await owned_live_session(db, session_id, auth.user.id)
    raise APIError(
        410,
        "live_stream_key_not_recoverable",
        "Stream key not recoverable",
        "A stream key is returned only at creation or rotation and is never persisted raw.",
    )


@router.post(
    "/sessions/{session_id}/stream-key/rotate",
    response_model=StreamKeyRevealResponse,
)
async def rotate_stream_key_endpoint(
    session_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> StreamKeyRevealResponse:
    record = await owned_live_session(db, session_id, auth.user.id)
    raw_key = await rotate_stream_key(db, registry(request), record)
    await publish_latest(request, session_id)
    return StreamKeyRevealResponse(
        session_id=record.id,
        ingest_path=record.ingest_path,
        stream_key_once=raw_key,
        key_version=record.ingest_key_version,
        ingest_provisioned=record.ingest_provisioned,
    )


@router.get("/personas", response_model=list[PersonaResponse])
async def list_personas(
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> list[AILivePersona]:
    return list(
        (
            await db.scalars(
                select(AILivePersona)
                .where(AILivePersona.owner_user_id == auth.user.id)
                .order_by(AILivePersona.created_at.desc())
            )
        ).all()
    )


@router.post(
    "/personas",
    response_model=PersonaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_persona(
    payload: PersonaCreate,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILivePersona:
    record = AILivePersona(
        owner_user_id=auth.user.id,
        **payload.model_dump(mode="json"),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def owned_persona(
    db: AsyncSession, persona_id: uuid.UUID, owner_user_id: uuid.UUID
) -> AILivePersona:
    record = await db.scalar(
        select(AILivePersona).where(
            AILivePersona.id == persona_id,
            AILivePersona.owner_user_id == owner_user_id,
        )
    )
    if record is None:
        raise APIError(
            404,
            "live_persona_not_found",
            "Live persona not found",
            "The persona does not exist.",
        )
    return record


@router.get("/personas/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    persona_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILivePersona:
    return await owned_persona(db, persona_id, auth.user.id)


@router.patch("/personas/{persona_id}", response_model=PersonaResponse)
async def patch_persona(
    persona_id: uuid.UUID,
    payload: PersonaPatch,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILivePersona:
    record = await owned_persona(db, persona_id, auth.user.id)
    for key, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(record, key, value)
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/personas/{persona_id}", response_model=MessageResponse)
async def delete_persona(
    persona_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    record = await owned_persona(db, persona_id, auth.user.id)
    await db.delete(record)
    await db.commit()
    return MessageResponse(status="deleted")


@router.get("/rules", response_model=list[RuleResponse])
async def list_rules(
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> list[AILiveRule]:
    return list(
        (
            await db.scalars(
                select(AILiveRule)
                .where(AILiveRule.owner_user_id == auth.user.id)
                .order_by(AILiveRule.created_at.desc())
            )
        ).all()
    )


@router.post(
    "/rules",
    response_model=RuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_rule(
    payload: RuleCreate,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILiveRule:
    if payload.persona_id:
        await owned_persona(db, payload.persona_id, auth.user.id)
    record = AILiveRule(
        owner_user_id=auth.user.id,
        **payload.model_dump(mode="json"),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def owned_rule(db: AsyncSession, rule_id: uuid.UUID, owner_user_id: uuid.UUID) -> AILiveRule:
    record = await db.scalar(
        select(AILiveRule).where(
            AILiveRule.id == rule_id,
            AILiveRule.owner_user_id == owner_user_id,
        )
    )
    if record is None:
        raise APIError(
            404,
            "live_rule_not_found",
            "Live rule not found",
            "The live rule does not exist.",
        )
    return record


@router.get("/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    rule_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILiveRule:
    return await owned_rule(db, rule_id, auth.user.id)


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
async def patch_rule(
    rule_id: uuid.UUID,
    payload: RulePatch,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> AILiveRule:
    record = await owned_rule(db, rule_id, auth.user.id)
    if payload.persona_id:
        await owned_persona(db, payload.persona_id, auth.user.id)
    values = payload.model_dump(exclude_unset=True, mode="json")
    for key, value in values.items():
        setattr(record, key, value)
    if record.risk.value != "low":
        record.requires_approval = True
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/rules/{rule_id}", response_model=MessageResponse)
async def delete_rule(
    rule_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    record = await owned_rule(db, rule_id, auth.user.id)
    await db.delete(record)
    await db.commit()
    return MessageResponse(status="deleted")


def _page_cursor(
    settings: Settings,
    scope: str,
    records: list[Any],
    limit: int,
) -> str | None:
    visible = records[:limit]
    return (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(records) > limit and visible
        else None
    )


@router.get("/sessions/{session_id}/events", response_model=EventPage)
async def list_live_events(
    session_id: uuid.UUID,
    auth: ManageAuth,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> EventPage:
    await owned_live_session(db, session_id, auth.user.id)
    scope = f"live-events:{session_id}"
    statement = select(LiveNormalizedEvent).where(LiveNormalizedEvent.session_id == session_id)
    statement = apply_cursor(
        statement,
        LiveNormalizedEvent.created_at,
        LiveNormalizedEvent.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    LiveNormalizedEvent.created_at.desc(),
                    LiveNormalizedEvent.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    return EventPage(
        items=[NormalizedEventResponse.model_validate(item) for item in records[:limit]],
        next_cursor=_page_cursor(settings, scope, records, limit),
    )


async def owned_action(
    db: AsyncSession, action_id: uuid.UUID, owner_user_id: uuid.UUID
) -> LiveAction:
    action = await db.scalar(
        select(LiveAction)
        .join(LiveSession, LiveSession.id == LiveAction.session_id)
        .where(
            LiveAction.id == action_id,
            LiveSession.owner_user_id == owner_user_id,
        )
    )
    if action is None:
        raise APIError(
            404,
            "live_action_not_found",
            "Live action not found",
            "The live action does not exist.",
        )
    return action


@router.get("/sessions/{session_id}/actions", response_model=ActionPage)
async def list_live_actions(
    session_id: uuid.UUID,
    auth: ManageAuth,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ActionPage:
    await owned_live_session(db, session_id, auth.user.id)
    scope = f"live-actions:{session_id}"
    statement = select(LiveAction).where(LiveAction.session_id == session_id)
    statement = apply_cursor(
        statement,
        LiveAction.created_at,
        LiveAction.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(LiveAction.created_at.desc(), LiveAction.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    return ActionPage(
        items=[LiveActionResponse.model_validate(item) for item in records[:limit]],
        next_cursor=_page_cursor(settings, scope, records, limit),
    )


@router.post("/actions/{action_id}/approve", response_model=LiveActionResponse)
async def approve_action_endpoint(
    action_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveAction:
    action = await owned_action(db, action_id, auth.user.id)
    return await approve_live_action(db, action, auth.user.id)


@router.post("/actions/{action_id}/execute", response_model=LiveActionResponse)
async def execute_action_endpoint(
    action_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LiveAction:
    action = await owned_action(db, action_id, auth.user.id)
    result = await execute_live_action(db, registry(request), settings, action)
    await publish_latest(request, result.session_id)
    return result


@router.get("/sessions/{session_id}/moderation", response_model=ModerationPage)
async def list_moderation_decisions(
    session_id: uuid.UUID,
    auth: ManageAuth,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ModerationPage:
    await owned_live_session(db, session_id, auth.user.id)
    scope = f"live-moderation:{session_id}"
    statement = select(LiveModerationDecision).where(
        LiveModerationDecision.session_id == session_id
    )
    statement = apply_cursor(
        statement,
        LiveModerationDecision.created_at,
        LiveModerationDecision.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    LiveModerationDecision.created_at.desc(),
                    LiveModerationDecision.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    return ModerationPage(
        items=[ModerationDecisionResponse.model_validate(item) for item in records[:limit]],
        next_cursor=_page_cursor(settings, scope, records, limit),
    )


@router.post(
    "/sessions/{session_id}/events/{event_id}/moderate",
    response_model=ModerationDecisionResponse,
)
async def ai_moderate_event(
    session_id: uuid.UUID,
    event_id: uuid.UUID,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveModerationDecision:
    live_session = await owned_live_session(db, session_id, auth.user.id)
    event = await db.scalar(
        select(LiveNormalizedEvent).where(
            LiveNormalizedEvent.id == event_id,
            LiveNormalizedEvent.session_id == session_id,
        )
    )
    if event is None:
        raise APIError(
            404,
            "live_event_not_found",
            "Live event not found",
            "The live event does not exist.",
        )
    return await moderate_live_event(
        db,
        request.app.state.ai_provider_registry,
        live_session,
        event,
    )


@router.post(
    "/sessions/{session_id}/events/{event_id}/moderation-decision",
    response_model=ModerationDecisionResponse,
)
async def human_moderate_event(
    session_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: HumanModerationRequest,
    auth: ModerateAuth,
    db: AsyncSession = Depends(get_session),
) -> LiveModerationDecision:
    live_session = await db.get(LiveSession, session_id)
    event = await db.scalar(
        select(LiveNormalizedEvent).where(
            LiveNormalizedEvent.id == event_id,
            LiveNormalizedEvent.session_id == session_id,
        )
    )
    if live_session is None or event is None:
        raise APIError(
            404,
            "live_event_not_found",
            "Live event not found",
            "The live event does not exist.",
        )
    return await record_human_moderation_decision(
        db,
        live_session,
        event,
        payload.disposition,
        auth.user.id,
    )


@router.get("/sessions/{session_id}/turns", response_model=TurnPage)
async def list_live_turns(
    session_id: uuid.UUID,
    auth: ManageAuth,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TurnPage:
    await owned_live_session(db, session_id, auth.user.id)
    scope = f"live-turns:{session_id}"
    statement = select(AILiveTurn).where(AILiveTurn.session_id == session_id)
    statement = apply_cursor(
        statement,
        AILiveTurn.created_at,
        AILiveTurn.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(AILiveTurn.created_at.desc(), AILiveTurn.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    return TurnPage(
        items=[LiveTurnResponse.model_validate(item) for item in records[:limit]],
        next_cursor=_page_cursor(settings, scope, records, limit),
    )


@router.post(
    "/sessions/{session_id}/events/{event_id}/turns",
    response_model=LiveTurnResponse,
)
async def create_live_turn(
    session_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: LiveTurnCreate,
    request: Request,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AILiveTurn:
    live_session = await owned_live_session(db, session_id, auth.user.id)
    event = await db.scalar(
        select(LiveNormalizedEvent).where(
            LiveNormalizedEvent.id == event_id,
            LiveNormalizedEvent.session_id == session_id,
        )
    )
    if event is None:
        raise APIError(
            404,
            "live_event_not_found",
            "Live event not found",
            "The live event does not exist.",
        )
    persona = await owned_persona(db, payload.persona_id, auth.user.id)
    return await generate_live_ai_turn(
        db,
        request,
        settings,
        event,
        persona,
        live_session,
        payload.action_type,
        destination_id=payload.destination_id,
        allow_text_fallback=payload.allow_text_fallback,
    )


async def game_response(db: AsyncSession, game: LiveGameSession) -> GameResponse:
    questions = (
        await db.scalars(
            select(LiveGameQuestion)
            .where(LiveGameQuestion.game_session_id == game.id)
            .order_by(LiveGameQuestion.position)
        )
    ).all()
    return GameResponse(
        id=game.id,
        live_session_id=game.live_session_id,
        title=game.title,
        state=game.state,
        started_at=game.started_at,
        ended_at=game.ended_at,
        created_at=game.created_at,
        questions=[GameQuestionResponse.model_validate(item) for item in questions],
    )


@router.post(
    "/games",
    response_model=GameResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_game_endpoint(
    payload: GameCreate,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> GameResponse:
    return await game_response(db, await create_game(db, auth.user.id, payload))


@router.get("/games/{game_id}", response_model=GameResponse)
async def get_game_endpoint(
    game_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> GameResponse:
    return await game_response(db, await owned_game(db, game_id, auth.user.id))


@router.post("/games/{game_id}/start", response_model=GameResponse)
async def start_game_endpoint(
    game_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> GameResponse:
    game = await owned_game(db, game_id, auth.user.id)
    return await game_response(db, await start_game(db, game))


@router.post("/games/{game_id}/answers", response_model=GameAnswerResponse)
async def answer_game_endpoint(
    game_id: uuid.UUID,
    payload: GameAnswerRequest,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> GameAnswerResponse:
    game = await owned_game(db, game_id, auth.user.id)
    return await answer_game_question(db, game, payload)


@router.get("/games/{game_id}/scores", response_model=list[GameScoreResponse])
async def game_scores_endpoint(
    game_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> list[LiveGameScore]:
    game = await owned_game(db, game_id, auth.user.id)
    return list(
        (
            await db.scalars(
                select(LiveGameScore)
                .where(LiveGameScore.game_session_id == game.id)
                .order_by(
                    LiveGameScore.score.desc(),
                    LiveGameScore.updated_at.asc(),
                )
            )
        ).all()
    )


@router.post("/games/{game_id}/end", response_model=GameResponse)
async def end_game_endpoint(
    game_id: uuid.UUID,
    auth: ManageAuth,
    db: AsyncSession = Depends(get_session),
) -> GameResponse:
    game = await owned_game(db, game_id, auth.user.id)
    return await game_response(db, await end_game(db, game))


@router.post(
    "/webhooks/{platform}/{connection_id}",
    response_model=WebhookAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
async def integration_webhook(
    platform: IntegrationPlatform,
    connection_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> WebhookAccepted:
    connection = await db.get(IntegrationConnection, connection_id)
    if connection is None or connection.platform != platform:
        raise APIError(
            404,
            "live_webhook_connection_not_found",
            "Live webhook connection not found",
            "The webhook connection does not exist.",
        )
    settings: Settings = request.app.state.settings
    client_ip = request.client.host if request.client else None
    await rate_limit(
        request,
        bucket=f"live:webhook:{platform.value}",
        subject=f"{connection_id}:{ip_hash(client_ip, settings)}",
        limit=settings.live_webhook_rate_limit,
        window_seconds=settings.live_rate_window_seconds,
        unavailable_detail="Live webhook abuse controls are unavailable.",
    )
    body = await request.body()
    delivery, duplicate = await accept_webhook(
        db,
        registry(request),
        settings,
        connection,
        request.headers,
        body,
        request.app.state.live_webhook_dispatcher,
    )
    return WebhookAccepted(
        status="duplicate" if duplicate else "accepted",
        delivery_id=delivery.id,
    )


@admin_router.get("/platforms", response_model=list[PlatformStatusResponse])
async def admin_platform_status(request: Request, _: AdminAuth) -> list[PlatformStatusResponse]:
    return [
        PlatformStatusResponse(
            platform=item.platform,
            available=item.available,
            status=item.status,
            capabilities=sorted(
                item.potential_capabilities, key=lambda capability: capability.value
            ),
            limitation=item.limitation,
        )
        for item in registry(request).descriptors()
    ]


@admin_router.get("/integrations", response_model=list[IntegrationConnectionResponse])
async def admin_integrations(
    _: AdminAuth,
    db: AsyncSession = Depends(get_session),
) -> list[IntegrationConnectionResponse]:
    records = (
        await db.scalars(
            select(IntegrationConnection)
            .order_by(
                IntegrationConnection.created_at.desc(),
                IntegrationConnection.id.desc(),
            )
            .limit(500)
        )
    ).all()
    return [integration_response(item) for item in records]


@websocket_router.websocket("/ws/live/{session_id}")
async def live_websocket(websocket: WebSocket, session_id: uuid.UUID) -> None:
    try:
        user_id = await websocket_user(websocket)
        settings: Settings = websocket.app.state.settings
        since = decode_cursor(
            settings,
            f"live-replay:{session_id}",
            websocket.query_params.get("since"),
        )
        async with websocket.app.state.session_factory() as db:
            live_session = await db.get(LiveSession, session_id)
            if live_session is None or (
                live_session.owner_user_id != user_id
                and not await has_permission(db, user_id, "live:admin")
            ):
                raise APIError(
                    404,
                    "live_session_not_found",
                    "Live session not found",
                    "The live session does not exist.",
                )
    except APIError:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    hub: LiveEventHub = websocket.app.state.live_event_hub
    queue = await hub.subscribe(session_id)
    try:
        if since is not None:
            since_at, since_id = since
            async with websocket.app.state.session_factory() as db:
                records = (
                    await db.scalars(
                        select(LiveEvent)
                        .where(
                            LiveEvent.session_id == session_id,
                            or_(
                                LiveEvent.created_at > since_at,
                                and_(
                                    LiveEvent.created_at == since_at,
                                    LiveEvent.id > since_id,
                                ),
                            ),
                        )
                        .order_by(LiveEvent.created_at.asc(), LiveEvent.id.asc())
                        .limit(500)
                    )
                ).all()
                for record in records:
                    await websocket.send_json(
                        replay_event(record, settings).model_dump(mode="json")
                    )
        while True:
            outgoing = asyncio.create_task(queue.get())
            incoming = asyncio.create_task(websocket.receive_text())
            done, pending = await asyncio.wait(
                {outgoing, incoming},
                timeout=25,
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            if not done:
                await websocket.send_json(
                    {
                        "event": "heartbeat",
                        "occurred_at": utcnow().isoformat(),
                    }
                )
            elif outgoing in done:
                await websocket.send_json(outgoing.result().model_dump(mode="json"))
            elif incoming in done and incoming.result() == "ping":
                await websocket.send_json(
                    {
                        "event": "heartbeat",
                        "occurred_at": utcnow().isoformat(),
                    }
                )
    except (WebSocketDisconnect, RuntimeError):
        return
    finally:
        await hub.unsubscribe(session_id, queue)
