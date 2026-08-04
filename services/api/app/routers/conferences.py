from __future__ import annotations

import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AIConversation,
    AIConversationMode,
    AIMessage,
    AIMessageRole,
    AIMessageStatus,
)
from app.ai_schemas import AISendMessageRequest
from app.ai_service import send_chat_message
from app.conference_models import (
    ConferenceStatus,
    LiveConference,
    LiveConferenceParticipant,
)
from app.conference_schemas import (
    ConferenceAuraAskRequest,
    ConferenceAuraAskResponse,
    ConferenceCreate,
    ConferenceIceServerResponse,
    ConferenceJoinByCodeRequest,
    ConferenceJoinResponse,
    ConferenceMediaCredentialsResponse,
    ConferenceParticipantResponse,
    ConferenceResponse,
)
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.live_adapters import AdapterRegistry
from app.live_media import (
    media_playback_url,
    media_whep_url,
    publish_credentials,
    subscribe_credentials,
)
from app.live_service import provision_ingest_path
from app.security import utcnow

router = APIRouter(prefix="/conferences", tags=["Video Conferences"])
Authenticated = Annotated[AuthContext, Depends(current_auth)]


def _registry(request: Request) -> AdapterRegistry:
    return request.app.state.live_adapter_registry


def _participant_contribution_path(record: LiveConference, user_id: uuid.UUID) -> str:
    return f"{record.ingest_path.rstrip('/')}/participants/{user_id}"


async def _active_participant_count(db: AsyncSession, conference_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(LiveConferenceParticipant)
            .where(
                LiveConferenceParticipant.conference_id == conference_id,
                LiveConferenceParticipant.left_at.is_(None),
            )
        )
        or 0
    )


async def _active_participant(
    db: AsyncSession,
    conference_id: uuid.UUID,
    user_id: uuid.UUID,
) -> LiveConferenceParticipant | None:
    return await db.scalar(
        select(LiveConferenceParticipant).where(
            LiveConferenceParticipant.conference_id == conference_id,
            LiveConferenceParticipant.user_id == user_id,
            LiveConferenceParticipant.left_at.is_(None),
        )
    )


async def _conference_response(
    db: AsyncSession,
    record: LiveConference,
    user_id: uuid.UUID,
) -> ConferenceResponse:
    joined = (
        record.host_id == user_id or await _active_participant(db, record.id, user_id) is not None
    )
    return ConferenceResponse(
        id=record.id,
        host_id=record.host_id,
        title=record.title,
        purpose=record.purpose,
        status=record.status,
        join_code=record.join_code,
        created_at=record.created_at,
        active_participant_count=await _active_participant_count(db, record.id),
        is_host=record.host_id == user_id,
        joined=joined,
    )


async def _owned_or_joined_conference(
    db: AsyncSession,
    conference_id: uuid.UUID,
    user_id: uuid.UUID,
) -> LiveConference:
    record = await db.get(LiveConference, conference_id)
    if record is None:
        raise APIError(
            404,
            "conference_not_found",
            "Conference not found",
            "The conference room does not exist.",
        )
    if record.host_id == user_id or await _active_participant(db, record.id, user_id) is not None:
        return record
    raise APIError(
        404,
        "conference_not_found",
        "Conference not found",
        "Join the conference before opening this room.",
    )


def _media_plane_configured(settings: Settings) -> bool:
    return bool(settings.mediamtx_control_url and settings.mediamtx_whip_base_url)


def _conference_ingest_path(host_id: uuid.UUID) -> str:
    return f"conferences/{host_id}/{secrets.token_urlsafe(12)}"


def _join_code() -> str:
    return secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:10].upper()


@router.post("", response_model=ConferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_conference(
    payload: ConferenceCreate,
    request: Request,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ConferenceResponse:
    registry = _registry(request)
    for _ in range(8):
        ingest_path = _conference_ingest_path(auth.user.id)
        provisioned = False
        if _media_plane_configured(settings):
            provisioned = await provision_ingest_path(
                registry,
                ingest_path,
                secrets.token_urlsafe(32),
            )
        record = LiveConference(
            host_id=auth.user.id,
            title=payload.title,
            purpose=payload.purpose,
            status=ConferenceStatus.scheduled,
            join_code=_join_code(),
            ingest_path=ingest_path,
            ingest_provisioned=provisioned,
        )
        db.add(record)
        try:
            await db.commit()
            await db.refresh(record)
            return await _conference_response(db, record, auth.user.id)
        except IntegrityError:
            await db.rollback()
    raise APIError(
        503,
        "conference_join_code_unavailable",
        "Conference unavailable",
        "Could not allocate a unique conference join code.",
    )


@router.get("", response_model=list[ConferenceResponse])
async def list_my_conferences(
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> list[ConferenceResponse]:
    records = (
        (
            await db.scalars(
                select(LiveConference)
                .outerjoin(
                    LiveConferenceParticipant,
                    LiveConferenceParticipant.conference_id == LiveConference.id,
                )
                .where(
                    or_(
                        LiveConference.host_id == auth.user.id,
                        (
                            (LiveConferenceParticipant.user_id == auth.user.id)
                            & LiveConferenceParticipant.left_at.is_(None)
                        ),
                    )
                )
                .order_by(LiveConference.created_at.desc(), LiveConference.id.desc())
                .limit(200)
            )
        )
        .unique()
        .all()
    )
    return [await _conference_response(db, item, auth.user.id) for item in records]


@router.get("/{conference_id}", response_model=ConferenceResponse)
async def get_conference(
    conference_id: uuid.UUID,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> ConferenceResponse:
    record = await _owned_or_joined_conference(db, conference_id, auth.user.id)
    return await _conference_response(db, record, auth.user.id)


async def _ensure_participant_contribution(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    record: LiveConference,
    user_id: uuid.UUID,
) -> LiveConferenceParticipant:
    participant = await db.scalar(
        select(LiveConferenceParticipant).where(
            LiveConferenceParticipant.conference_id == record.id,
            LiveConferenceParticipant.user_id == user_id,
        )
    )
    if participant is None:
        participant = LiveConferenceParticipant(
            conference_id=record.id,
            user_id=user_id,
            contribution_ingest_path=_participant_contribution_path(record, user_id),
        )
        db.add(participant)
        await db.flush()
    else:
        participant.left_at = None
    if not participant.contribution_ingest_path:
        participant.contribution_ingest_path = _participant_contribution_path(record, user_id)
    if _media_plane_configured(settings) and not participant.contribution_provisioned:
        participant.contribution_provisioned = await provision_ingest_path(
            registry,
            participant.contribution_ingest_path,
            secrets.token_urlsafe(32),
        )
    return participant


@router.post("/join-by-code", response_model=ConferenceJoinResponse)
async def join_conference_by_code(
    payload: ConferenceJoinByCodeRequest,
    request: Request,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ConferenceJoinResponse:
    record = await db.scalar(
        select(LiveConference).where(LiveConference.join_code == payload.join_code)
    )
    if record is None or record.status == ConferenceStatus.ended:
        raise APIError(
            404,
            "conference_not_found",
            "Conference not found",
            "No active conference matches that join code.",
        )
    return await _join_conference_record(
        db,
        _registry(request),
        settings,
        record,
        auth.user.id,
    )


@router.post("/{conference_id}/join", response_model=ConferenceJoinResponse)
async def join_conference(
    conference_id: uuid.UUID,
    request: Request,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ConferenceJoinResponse:
    record = await db.get(LiveConference, conference_id)
    if record is None or record.status == ConferenceStatus.ended:
        raise APIError(
            404,
            "conference_not_found",
            "Conference not found",
            "The conference room is unavailable.",
        )
    return await _join_conference_record(
        db,
        _registry(request),
        settings,
        record,
        auth.user.id,
    )


async def _join_conference_record(
    db: AsyncSession,
    registry: AdapterRegistry,
    settings: Settings,
    record: LiveConference,
    user_id: uuid.UUID,
) -> ConferenceJoinResponse:
    if record.status == ConferenceStatus.scheduled:
        record.status = ConferenceStatus.live
    if record.host_id != user_id:
        await _ensure_participant_contribution(db, registry, settings, record, user_id)
    elif _media_plane_configured(settings) and not record.ingest_provisioned:
        record.ingest_provisioned = await provision_ingest_path(
            registry,
            record.ingest_path,
            secrets.token_urlsafe(32),
        )
    await db.commit()
    await db.refresh(record)
    return ConferenceJoinResponse(
        conference=await _conference_response(db, record, user_id),
        joined=True,
    )


@router.post("/{conference_id}/leave", response_model=ConferenceJoinResponse)
async def leave_conference(
    conference_id: uuid.UUID,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> ConferenceJoinResponse:
    record = await _owned_or_joined_conference(db, conference_id, auth.user.id)
    participant = await _active_participant(db, record.id, auth.user.id)
    if participant is not None:
        participant.left_at = utcnow()
    await db.commit()
    await db.refresh(record)
    return ConferenceJoinResponse(
        conference=await _conference_response(db, record, auth.user.id),
        joined=False,
    )


@router.get(
    "/{conference_id}/participants",
    response_model=list[ConferenceParticipantResponse],
)
async def list_conference_participants(
    conference_id: uuid.UUID,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> list[ConferenceParticipantResponse]:
    record = await _owned_or_joined_conference(db, conference_id, auth.user.id)
    participants = (
        await db.scalars(
            select(LiveConferenceParticipant).where(
                LiveConferenceParticipant.conference_id == record.id,
                LiveConferenceParticipant.left_at.is_(None),
            )
        )
    ).all()
    items: list[ConferenceParticipantResponse] = [
        ConferenceParticipantResponse(
            user_id=record.host_id,
            role="host",
            contribution_ingest_path=record.ingest_path,
            contribution_provisioned=record.ingest_provisioned,
            playback_url=media_playback_url(settings, record.ingest_path),
            whep_url=media_whep_url(settings, record.ingest_path),
            **_participant_subscribe_fields(
                settings,
                record,
                ingest_path=record.ingest_path,
                provisioned=record.ingest_provisioned,
                subject_user_id=auth.user.id,
            ),
            is_self=record.host_id == auth.user.id,
            joined_at=record.created_at,
        )
    ]
    for participant in participants:
        if participant.user_id == record.host_id:
            continue
        path = participant.contribution_ingest_path
        items.append(
            ConferenceParticipantResponse(
                user_id=participant.user_id,
                role="participant",
                contribution_ingest_path=path,
                contribution_provisioned=participant.contribution_provisioned,
                playback_url=media_playback_url(settings, path) if path else None,
                whep_url=media_whep_url(settings, path) if path else None,
                **(
                    _participant_subscribe_fields(
                        settings,
                        record,
                        ingest_path=path,
                        provisioned=participant.contribution_provisioned,
                        subject_user_id=auth.user.id,
                    )
                    if path
                    else {}
                ),
                is_self=participant.user_id == auth.user.id,
                joined_at=participant.joined_at,
            )
        )
    return items


def _participant_subscribe_fields(
    settings: Settings,
    record: LiveConference,
    *,
    ingest_path: str,
    provisioned: bool,
    subject_user_id: uuid.UUID,
) -> dict[str, object]:
    credentials = subscribe_credentials(
        settings,
        record,
        ingest_path=ingest_path,
        ingest_provisioned=provisioned,
        subject_user_id=subject_user_id,
        token_type="conference_whep_subscribe",
    )
    if credentials.capability.status != "available" or not credentials.bearer_token:
        return {
            "subscribe_bearer_token": None,
            "token_expires_at": None,
        }
    return {
        "subscribe_bearer_token": credentials.bearer_token,
        "token_expires_at": credentials.token_expires_at,
    }


@router.get("/{conference_id}/media-credentials", response_model=ConferenceMediaCredentialsResponse)
async def get_media_credentials(
    conference_id: uuid.UUID,
    request: Request,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ConferenceMediaCredentialsResponse:
    record = await _owned_or_joined_conference(db, conference_id, auth.user.id)
    registry = _registry(request)
    is_host = record.host_id == auth.user.id
    if is_host:
        if _media_plane_configured(settings) and not record.ingest_provisioned:
            record.ingest_provisioned = await provision_ingest_path(
                registry,
                record.ingest_path,
                secrets.token_urlsafe(32),
            )
            await db.commit()
            await db.refresh(record)
        contribution_path = record.ingest_path
        provisioned = record.ingest_provisioned
        role: str = "host"
    else:
        participant = await _ensure_participant_contribution(
            db,
            registry,
            settings,
            record,
            auth.user.id,
        )
        await db.commit()
        contribution_path = participant.contribution_ingest_path or record.ingest_path
        provisioned = participant.contribution_provisioned
        role = "participant"

    credentials = publish_credentials(
        settings,
        record,
        ingest_path=contribution_path,
        ingest_provisioned=provisioned,
        subject_user_id=auth.user.id,
        token_type="conference_whip_publish",
    )
    capability = credentials.capability
    available = capability.status == "available"
    whep_available = bool(credentials.whep_url) and available
    return ConferenceMediaCredentialsResponse(
        conference_id=record.id,
        status="available" if available else "awaiting_media_plane",
        reason=None if available else capability.reason or "awaiting_media_plane",
        whip_available=capability.whip_available,
        playback_available=capability.playback_available,
        whep_available=whep_available,
        role=role,  # type: ignore[arg-type]
        ingest_path=contribution_path,
        whip_url=credentials.whip_url,
        whep_url=credentials.whep_url,
        playback_url=credentials.playback_url,
        bearer_token=credentials.bearer_token,
        subscribe_bearer_token=credentials.subscribe_bearer_token,
        token_expires_at=credentials.token_expires_at,
        token_expires_in_seconds=credentials.token_expires_in_seconds,
        ice_servers=[
            ConferenceIceServerResponse(
                urls=list(server.urls),
                username=server.username,
                credential=server.credential,
            )
            for server in credentials.ice_servers
        ],
    )


@router.post("/{conference_id}/aura/ask", response_model=ConferenceAuraAskResponse)
async def ask_aura(
    conference_id: uuid.UUID,
    payload: ConferenceAuraAskRequest,
    request: Request,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ConferenceAuraAskResponse:
    record = await _owned_or_joined_conference(db, conference_id, auth.user.id)
    conversation = None
    if payload.conversation_id is not None:
        conversation = await db.scalar(
            select(AIConversation).where(
                AIConversation.id == payload.conversation_id,
                AIConversation.user_id == auth.user.id,
                AIConversation.deleted_at.is_(None),
            )
        )
        if conversation is None:
            raise APIError(
                404,
                "conference_aura_conversation_not_found",
                "Aura conversation not found",
                "The requested Aura conversation does not exist.",
            )
    if conversation is None:
        conversation = AIConversation(
            user_id=auth.user.id,
            title=f"conference:{record.id}",
            mode=AIConversationMode.copilot,
            locale="en",
        )
        db.add(conversation)
        await db.flush()
        db.add(
            AIMessage(
                conversation_id=conversation.id,
                role=AIMessageRole.system,
                content=_conference_system_hint(record),
                structured_content_refs=[],
                status=AIMessageStatus.completed,
                completed_at=utcnow(),
            )
        )
        record.ai_conversation_id = (
            conversation.id if record.host_id == auth.user.id else record.ai_conversation_id
        )
        await db.commit()
    response, _ = await send_chat_message(
        db,
        request.app.state.ai_provider_registry,
        settings,
        request,
        user_id=auth.user.id,
        conversation_id=conversation.id,
        payload=AISendMessageRequest(content=payload.message),
    )
    return ConferenceAuraAskResponse(conversation_id=conversation.id, message=response)


def _conference_system_hint(record: LiveConference) -> str:
    purpose_hint = {
        "business": (
            "Keep replies crisp, practical, and suitable for meetings, strategy, "
            "and operating decisions."
        ),
        "education": (
            "Act like a patient teaching assistant: explain concepts, surface examples, "
            "and support learning outcomes."
        ),
        "social": (
            "Keep the room warm, inclusive, and conversational without pretending to see "
            "or hear unprovided media."
        ),
    }[record.purpose.value]
    return (
        "You are Aura inside a SYLORA video conference. "
        f"Room title: {record.title}. Purpose: {record.purpose.value}. "
        f"{purpose_hint} Never claim a media plane is available unless the room reports it."
    )
