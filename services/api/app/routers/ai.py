from __future__ import annotations

import asyncio
import json
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AICapability,
    AIConversation,
    AIEvent,
    AIJob,
    AIMemory,
    AIMessage,
    AIToolProposal,
    AIUsageRecord,
)
from app.ai_schemas import (
    AIConversationCreate,
    AIConversationPage,
    AIConversationPatch,
    AIConversationResponse,
    AIJobCreate,
    AIJobPage,
    AIJobResponse,
    AIMemoryCreate,
    AIMemoryExport,
    AIMemoryPatch,
    AIMemoryResponse,
    AIMessagePage,
    AIMessageResponse,
    AISendMessageRequest,
    AISettingsPatch,
    AISettingsResponse,
    AIToolProposalResponse,
    AIUsagePage,
    AIUsageResponse,
    AIUsageSummary,
    ModerationRequest,
    ModerationResponse,
    ProviderStatusItem,
    ProviderStatusResponse,
    ToolActionResponse,
    TranslationRequest,
    TranslationResponse,
)
from app.ai_service import (
    AIEventHub,
    approve_proposal,
    cancel_generation_job,
    create_generation_job,
    create_memory,
    delete_memories,
    event_response,
    execute_proposal,
    invoke_moderation,
    invoke_translation,
    memory_response,
    message_response,
    owned_conversation,
    patch_memory,
    provider_or_503,
    reject_proposal,
    retry_generation_job,
    send_chat_message,
    settings_for,
)
from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.rate_limit import rate_limit
from app.schemas import MessageResponse
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor

router = APIRouter(prefix="/ai", tags=["AI Brain"])


def _registry(request: Request) -> Any:
    return request.app.state.ai_provider_registry


async def _publish_committed_event(
    request: Request,
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    event_type: str,
    aggregate_id: uuid.UUID,
) -> None:
    record = await db.scalar(
        select(AIEvent)
        .where(
            AIEvent.user_id == user_id,
            AIEvent.event_type == event_type,
            AIEvent.aggregate_id == aggregate_id,
        )
        .order_by(AIEvent.created_at.desc(), AIEvent.id.desc())
        .limit(1)
    )
    if record is not None:
        await request.app.state.ai_event_hub.publish(
            user_id,
            event_response(request.app.state.settings, record),
        )


async def _chat_rate_limit(request: Request, user_id: uuid.UUID) -> None:
    settings = request.app.state.settings
    await rate_limit(
        request,
        bucket="ai:chat",
        subject=str(user_id),
        limit=settings.ai_chat_rate_limit,
        window_seconds=settings.ai_rate_window_seconds,
        unavailable_detail="AI safety rate limiting is temporarily unavailable.",
    )


async def _generation_rate_limit(request: Request, user_id: uuid.UUID) -> None:
    settings = request.app.state.settings
    await rate_limit(
        request,
        bucket="ai:generation",
        subject=str(user_id),
        limit=settings.ai_generation_rate_limit,
        window_seconds=settings.ai_rate_window_seconds,
        unavailable_detail="AI generation rate limiting is temporarily unavailable.",
    )


@router.get("/providers/status", response_model=ProviderStatusResponse)
async def provider_status(
    request: Request,
    _: AuthContext = Depends(current_auth),
) -> ProviderStatusResponse:
    registry = _registry(request)
    return ProviderStatusResponse(
        capabilities=registry.capability_status(),
        providers=[
            ProviderStatusItem(
                name=provider.name,
                available_capabilities=sorted(provider.capabilities, key=lambda item: item.value),
            )
            for provider in registry.providers()
        ],
    )


@router.get("/settings", response_model=AISettingsResponse)
async def get_ai_settings(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AISettingsResponse:
    record = await settings_for(db, auth.user.id)
    await db.commit()
    await db.refresh(record)
    return AISettingsResponse.model_validate(record)


@router.patch("/settings", response_model=AISettingsResponse)
async def patch_ai_settings(
    payload: AISettingsPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AISettingsResponse:
    record = await settings_for(db, auth.user.id)
    values = payload.model_dump(exclude_unset=True)
    if payload.memory_enabled is True and not (
        payload.consent_granted is True or record.consent_granted
    ):
        raise APIError(
            422,
            "ai_consent_required",
            "AI consent required",
            "AI memory cannot be enabled before explicit AI consent.",
        )
    consent_changed = (
        "consent_granted" in values and payload.consent_granted != record.consent_granted
    )
    memory_changed = "memory_enabled" in values and payload.memory_enabled != record.memory_enabled
    for key, value in values.items():
        if key == "capability_flags" and value is not None:
            value = {
                (
                    capability.value if isinstance(capability, AICapability) else str(capability)
                ): flag
                for capability, flag in value.items()
            }
        setattr(record, key, value)
    if payload.consent_granted is True and record.consented_at is None:
        record.consented_at = utcnow()
    if payload.consent_granted is False:
        record.consented_at = None
        record.memory_enabled = False
        await delete_memories(db, auth.user.id, settings)
    elif payload.memory_enabled is False:
        await delete_memories(db, auth.user.id, settings)
    if consent_changed or memory_changed:
        add_audit_event(
            db,
            request,
            settings,
            "ai.privacy_settings_changed",
            actor_user_id=auth.user.id,
            target_user_id=auth.user.id,
            metadata={
                "consent_granted": record.consent_granted,
                "memory_enabled": record.memory_enabled,
            },
        )
    await db.commit()
    await db.refresh(record)
    return AISettingsResponse.model_validate(record)


@router.post(
    "/conversations",
    response_model=AIConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: AIConversationCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIConversation:
    user_settings = await settings_for(db, auth.user.id)
    if not user_settings.consent_granted:
        raise APIError(
            403,
            "ai_consent_required",
            "AI consent required",
            "Grant explicit AI consent before creating a conversation.",
        )
    conversation = AIConversation(
        user_id=auth.user.id,
        title=payload.title,
        mode=payload.mode,
        locale=payload.locale or user_settings.preferred_locale,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.get("/conversations", response_model=AIConversationPage)
async def list_conversations(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIConversationPage:
    cursor_value = decode_cursor(settings, "ai-conversations", cursor)
    statement = select(AIConversation).where(
        AIConversation.user_id == auth.user.id,
        AIConversation.deleted_at.is_(None),
    )
    statement = apply_cursor(statement, AIConversation.updated_at, AIConversation.id, cursor_value)
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    AIConversation.updated_at.desc(), AIConversation.id.desc()
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    next_cursor = (
        encode_cursor(
            settings,
            "ai-conversations",
            visible[-1].updated_at,
            visible[-1].id,
        )
        if len(records) > limit and visible
        else None
    )
    return AIConversationPage(
        items=[AIConversationResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


@router.get("/conversations/{conversation_id}", response_model=AIConversationResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIConversation:
    return await owned_conversation(db, conversation_id, auth.user.id)


@router.patch("/conversations/{conversation_id}", response_model=AIConversationResponse)
async def patch_conversation(
    conversation_id: uuid.UUID,
    payload: AIConversationPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIConversation:
    conversation = await owned_conversation(db, conversation_id, auth.user.id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(conversation, key, value)
    conversation.updated_at = utcnow()
    await db.commit()
    await db.refresh(conversation)
    return conversation


@router.delete("/conversations/{conversation_id}", response_model=MessageResponse)
async def delete_conversation(
    conversation_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    conversation = await owned_conversation(db, conversation_id, auth.user.id)
    await db.delete(conversation)
    await db.commit()
    return MessageResponse(status="deleted")


@router.get("/conversations/{conversation_id}/messages", response_model=AIMessagePage)
async def conversation_history(
    conversation_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIMessagePage:
    await owned_conversation(db, conversation_id, auth.user.id)
    scope = f"ai-messages:{conversation_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    statement = select(AIMessage).where(AIMessage.conversation_id == conversation_id)
    statement = apply_cursor(statement, AIMessage.created_at, AIMessage.id, cursor_value)
    records = list(
        (
            await db.scalars(
                statement.order_by(AIMessage.created_at.desc(), AIMessage.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(records) > limit and visible
        else None
    )
    return AIMessagePage(
        items=[await message_response(db, item) for item in visible],
        next_cursor=next_cursor,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=AIMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/conversations/{conversation_id}/send",
    response_model=AIMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: AISendMessageRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIMessageResponse:
    await _chat_rate_limit(request, auth.user.id)
    response, _ = await send_chat_message(
        db,
        _registry(request),
        settings,
        request,
        user_id=auth.user.id,
        conversation_id=conversation_id,
        payload=payload,
    )
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="message.completed",
        aggregate_id=response.id,
    )
    return response


@router.post("/conversations/{conversation_id}/stream")
async def stream_message(
    conversation_id: uuid.UUID,
    payload: AISendMessageRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    await _chat_rate_limit(request, auth.user.id)
    response, deltas = await send_chat_message(
        db,
        _registry(request),
        settings,
        request,
        user_id=auth.user.id,
        conversation_id=conversation_id,
        payload=payload,
        stream=True,
    )
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="message.completed",
        aggregate_id=response.id,
    )

    async def events() -> Any:
        for delta in deltas:
            yield f"event: delta\ndata: {json.dumps({'text': delta})}\n\n"
        yield ("event: completed\ndata: " + response.model_dump_json() + "\n\n")

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


@router.get(
    "/conversations/{conversation_id}/proposals",
    response_model=list[AIToolProposalResponse],
)
async def list_proposals(
    conversation_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[AIToolProposalResponse]:
    await owned_conversation(db, conversation_id, auth.user.id)
    records = (
        await db.scalars(
            select(AIToolProposal)
            .where(
                AIToolProposal.conversation_id == conversation_id,
                AIToolProposal.user_id == auth.user.id,
            )
            .order_by(AIToolProposal.created_at.desc())
        )
    ).all()
    return [AIToolProposalResponse.model_validate(item) for item in records]


@router.post(
    "/conversations/{conversation_id}/proposals/{proposal_id}/approve",
    response_model=AIToolProposalResponse,
)
async def approve_tool(
    conversation_id: uuid.UUID,
    proposal_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIToolProposal:
    await rate_limit(
        request,
        bucket="ai:tool",
        subject=str(auth.user.id),
        limit=settings.ai_tool_rate_limit,
        window_seconds=settings.ai_rate_window_seconds,
    )
    proposal = await approve_proposal(db, proposal_id, conversation_id, auth.user.id)
    add_audit_event(
        db,
        request,
        settings,
        "ai.tool_approved",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={
            "proposal_id": str(proposal.id),
            "tool_name": proposal.tool_name,
            "risk": proposal.risk.value,
        },
    )
    await db.commit()
    return proposal


@router.post(
    "/conversations/{conversation_id}/proposals/{proposal_id}/reject",
    response_model=AIToolProposalResponse,
)
async def reject_tool(
    conversation_id: uuid.UUID,
    proposal_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIToolProposal:
    proposal = await reject_proposal(db, proposal_id, conversation_id, auth.user.id)
    add_audit_event(
        db,
        request,
        settings,
        "ai.tool_rejected",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"proposal_id": str(proposal.id), "tool_name": proposal.tool_name},
    )
    await db.commit()
    return proposal


@router.post(
    "/conversations/{conversation_id}/proposals/{proposal_id}/execute",
    response_model=ToolActionResponse,
)
async def execute_tool(
    conversation_id: uuid.UUID,
    proposal_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ToolActionResponse:
    await rate_limit(
        request,
        bucket="ai:tool",
        subject=str(auth.user.id),
        limit=settings.ai_tool_rate_limit,
        window_seconds=settings.ai_rate_window_seconds,
    )
    proposal, execution, output = await execute_proposal(
        db, proposal_id, conversation_id, auth.user.id, request, settings
    )
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="tool.succeeded",
        aggregate_id=proposal.id,
    )
    return ToolActionResponse(
        proposal=AIToolProposalResponse.model_validate(proposal),
        execution_id=execution.id,
        output=output,
    )


@router.get("/memory", response_model=list[AIMemoryResponse])
async def list_memory(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> list[AIMemoryResponse]:
    records = (
        await db.scalars(
            select(AIMemory)
            .where(
                AIMemory.user_id == auth.user.id,
                AIMemory.deleted_at.is_(None),
                (AIMemory.expires_at.is_(None) | (AIMemory.expires_at > utcnow())),
            )
            .order_by(AIMemory.created_at.desc())
        )
    ).all()
    return [memory_response(item, settings) for item in records]


@router.post("/memory", response_model=AIMemoryResponse, status_code=status.HTTP_201_CREATED)
async def add_memory(
    payload: AIMemoryCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIMemoryResponse:
    record = await create_memory(db, auth.user.id, payload, settings)
    add_audit_event(
        db,
        request,
        settings,
        "ai.memory_created",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"memory_id": str(record.id), "kind": record.kind.value},
    )
    await db.commit()
    return memory_response(record, settings)


@router.patch("/memory/{memory_id}", response_model=AIMemoryResponse)
async def edit_memory(
    memory_id: uuid.UUID,
    payload: AIMemoryPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIMemoryResponse:
    record = await patch_memory(db, auth.user.id, memory_id, payload, settings)
    return memory_response(record, settings)


@router.delete("/memory/{memory_id}", response_model=MessageResponse)
async def delete_memory(
    memory_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await delete_memories(db, auth.user.id, settings, memory_id)
    add_audit_event(
        db,
        request,
        settings,
        "ai.memory_deleted",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"memory_id": str(memory_id)},
    )
    await db.commit()
    return MessageResponse(status="deleted")


@router.delete("/memory", response_model=MessageResponse)
async def delete_all_memory(
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    count = await delete_memories(db, auth.user.id, settings)
    add_audit_event(
        db,
        request,
        settings,
        "ai.memory_deleted_all",
        actor_user_id=auth.user.id,
        target_user_id=auth.user.id,
        metadata={"count": count},
    )
    await db.commit()
    return MessageResponse(status="deleted")


@router.get("/memory/export", response_model=AIMemoryExport)
async def export_memory(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIMemoryExport:
    records = (
        await db.scalars(
            select(AIMemory)
            .where(AIMemory.user_id == auth.user.id, AIMemory.deleted_at.is_(None))
            .order_by(AIMemory.created_at)
        )
    ).all()
    return AIMemoryExport(
        exported_at=utcnow(),
        items=[memory_response(item, settings) for item in records],
    )


@router.post("/translate", response_model=TranslationResponse)
async def translate(
    payload: TranslationRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> TranslationResponse:
    await _chat_rate_limit(request, auth.user.id)
    provider_name, result = await invoke_translation(
        db,
        _registry(request),
        auth.user.id,
        text=payload.text,
        source_language=payload.source_language,
        target_language=payload.target_language,
    )
    return TranslationResponse(
        text=result.text,
        source_language=result.source_language,
        target_language=result.target_language,
        provider=provider_name,
        model=result.model,
        prompt_units=result.usage.prompt_units,
        completion_units=result.usage.completion_units,
        cost_micros=result.usage.cost_micros,
    )


@router.post("/moderate", response_model=ModerationResponse)
async def moderate(
    payload: ModerationRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ModerationResponse:
    await _chat_rate_limit(request, auth.user.id)
    provider_name, result = await invoke_moderation(
        db, _registry(request), auth.user.id, payload.text
    )
    return ModerationResponse(
        recommendation=result.recommendation,
        confidence=result.confidence,
        categories=dict(result.categories),
        provider=provider_name,
        model=result.model,
        non_binding=True,
    )


@router.post("/jobs", response_model=AIJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_job(
    request: Request,
    payload: Annotated[AIJobCreate, Body(discriminator="capability")],
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIJob:
    await _generation_rate_limit(request, auth.user.id)
    provider_or_503(_registry(request), payload.capability)
    storage = request.app.state.object_storage
    if hasattr(storage, "require_configured"):
        storage.require_configured()
    typed = payload.model_dump(mode="json")
    job = await create_generation_job(
        db,
        _registry(request),
        request.app.state.ai_job_dispatcher,
        auth.user.id,
        payload.capability,
        typed,
    )
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="job.queued",
        aggregate_id=job.id,
    )
    return job


@router.get("/jobs", response_model=AIJobPage)
async def list_jobs(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIJobPage:
    cursor_value = decode_cursor(settings, "ai-jobs", cursor)
    statement = select(AIJob).where(AIJob.user_id == auth.user.id)
    statement = apply_cursor(statement, AIJob.created_at, AIJob.id, cursor_value)
    records = list(
        (
            await db.scalars(
                statement.order_by(AIJob.created_at.desc(), AIJob.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    next_cursor = (
        encode_cursor(settings, "ai-jobs", visible[-1].created_at, visible[-1].id)
        if len(records) > limit and visible
        else None
    )
    return AIJobPage(
        items=[AIJobResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


@router.get("/jobs/{job_id}", response_model=AIJobResponse)
async def get_job(
    job_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIJob:
    job = await db.scalar(select(AIJob).where(AIJob.id == job_id, AIJob.user_id == auth.user.id))
    if job is None:
        raise APIError(404, "ai_job_not_found", "AI job not found", "The job does not exist.")
    return job


@router.post("/jobs/{job_id}/cancel", response_model=AIJobResponse)
async def cancel_job(
    job_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIJob:
    job = await cancel_generation_job(db, _registry(request), auth.user.id, job_id)
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="job.cancelled",
        aggregate_id=job.id,
    )
    return job


@router.post("/jobs/{job_id}/retry", response_model=AIJobResponse)
async def retry_job(
    job_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIJob:
    storage = request.app.state.object_storage
    if hasattr(storage, "require_configured"):
        storage.require_configured()
    job = await retry_generation_job(
        db,
        _registry(request),
        request.app.state.ai_job_dispatcher,
        auth.user.id,
        job_id,
    )
    await _publish_committed_event(
        request,
        db,
        auth.user.id,
        event_type="job.retried",
        aggregate_id=job.id,
    )
    return job


@router.get("/usage/summary", response_model=AIUsageSummary)
async def usage_summary(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AIUsageSummary:
    now = utcnow()
    period_start = datetime(now.year, now.month, 1, tzinfo=UTC)
    totals = (
        await db.execute(
            select(
                func.coalesce(func.sum(AIUsageRecord.prompt_units), 0),
                func.coalesce(func.sum(AIUsageRecord.completion_units), 0),
                func.coalesce(func.sum(AIUsageRecord.cost_micros), 0),
            ).where(
                AIUsageRecord.user_id == auth.user.id,
                AIUsageRecord.created_at >= period_start,
            )
        )
    ).one()
    user_settings = await settings_for(db, auth.user.id)
    return AIUsageSummary(
        period_start=period_start,
        prompt_units=int(totals[0]),
        completion_units=int(totals[1]),
        total_units=int(totals[0]) + int(totals[1]),
        cost_micros=int(totals[2]),
        monthly_token_limit=user_settings.monthly_token_limit,
        monthly_spend_limit_micros=user_settings.monthly_spend_limit_micros,
    )


@router.get("/usage", response_model=AIUsagePage)
async def usage_history(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AIUsagePage:
    cursor_value = decode_cursor(settings, "ai-usage", cursor)
    statement = select(AIUsageRecord).where(AIUsageRecord.user_id == auth.user.id)
    statement = apply_cursor(statement, AIUsageRecord.created_at, AIUsageRecord.id, cursor_value)
    records = list(
        (
            await db.scalars(
                statement.order_by(AIUsageRecord.created_at.desc(), AIUsageRecord.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    next_cursor = (
        encode_cursor(settings, "ai-usage", visible[-1].created_at, visible[-1].id)
        if len(records) > limit and visible
        else None
    )
    return AIUsagePage(
        items=[AIUsageResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


@router.get("/events")
async def events(
    request: Request,
    since: str | None = None,
    follow: bool = False,
    limit: int = Query(default=100, ge=1, le=500),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> StreamingResponse:
    cursor_value = decode_cursor(settings, "ai-events", since)
    statement = select(AIEvent).where(AIEvent.user_id == auth.user.id)
    if cursor_value is not None:
        created_at, event_id = cursor_value
        statement = statement.where(
            (AIEvent.created_at > created_at)
            | ((AIEvent.created_at == created_at) & (AIEvent.id > event_id))
        )
    records = (
        await db.scalars(statement.order_by(AIEvent.created_at, AIEvent.id).limit(limit))
    ).all()
    replay = [event_response(settings, item) for item in records]
    hub: AIEventHub = request.app.state.ai_event_hub

    async def stream() -> Any:
        for item in replay:
            yield f"id: {item.cursor}\nevent: {item.event}\ndata: {item.model_dump_json()}\n\n"
        if not follow:
            return
        queue = await hub.subscribe(auth.user.id)
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                    yield (
                        f"id: {item.cursor}\nevent: {item.event}\n"
                        f"data: {item.model_dump_json()}\n\n"
                    )
                except TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            await hub.unsubscribe(auth.user.id, queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
