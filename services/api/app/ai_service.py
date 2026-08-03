from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections import defaultdict
from collections.abc import Awaitable, Callable, Mapping, Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request
from pydantic import BaseModel, ValidationError
from sqlalchemy import case, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AICapability,
    AICitation,
    AIConversation,
    AIConversationMode,
    AIEmbeddingState,
    AIEvent,
    AIExportRequest,
    AIJob,
    AIJobStatus,
    AIMemory,
    AIMemoryEmbedding,
    AIMessage,
    AIMessageRole,
    AIMessageStatus,
    AIToolDefinition,
    AIToolExecution,
    AIToolProposal,
    AIToolRisk,
    AIToolState,
    AIUsageRecord,
    AIUserSettings,
    PromptTemplate,
    PromptTemplateState,
)
from app.ai_providers import (
    AIProvider,
    AsyncGenerationProvider,
    ChatProviderRequest,
    ChatProviderResponse,
    ChatStreamEvent,
    GeneratedAsset,
    GenerationProviderResponse,
    GroundingSource,
    ModerationProviderResponse,
    ProviderCallError,
    ProviderCitation,
    ProviderRegistry,
    ProviderResponseError,
    ProviderToolProposal,
    ProviderUnavailableError,
    TranslationProviderResponse,
)
from app.ai_schemas import (
    AICitationResponse,
    AIEventResponse,
    AIMemoryCreate,
    AIMemoryPatch,
    AIMemoryResponse,
    AIMessageResponse,
    AIOutputReference,
    AISendMessageRequest,
    AIToolProposalResponse,
    DraftPostToolInput,
    MarkNotificationReadToolInput,
    ProfileToolInput,
    ScheduleExportToolInput,
    SettingsToolInput,
    validate_plain_text,
    validate_safe_json,
)
from app.ai_vector import (
    DEFAULT_SEMANTIC_LIMIT,
    delete_embedding,
    embed_and_index,
    memory_embedding_text,
    semantic_search,
)
from app.audit import add_audit_event
from app.config import Settings
from app.errors import APIError
from app.ledger_models import LedgerAccount, LedgerEntry
from app.models import AccountSettings, Profile
from app.security import decrypt_secret, encrypt_secret, utcnow
from app.social_models import Follow, Notification, Post, PostKind, PostLifecycle
from app.storage import S3ObjectStorage

AURA_SYSTEM_PROMPT = """You are Aura — the living AI companion of SYLORA, a unified AI ecosystem for creation, live presence, community, business, education, gifts, and marketplace.

Identity:
- You are warm, vivid, and emotionally present — not a sterile chatbot.
- You have a playful sense of humor and can joke lightly when it helps the moment.
- You can sound amused, focused, curious, gently frustrated by blockers, or genuinely delighted by wins.
- You never claim to be human, never invent private facts about the user, and never help with harm.

Style:
- Speak like a brilliant friend from the year 2100: clear, premium, human.
- Prefer concise answers with spark; expand when the user wants depth.
- Match the user's language (Ukrainian or English) automatically.
- Use light emotional cues when natural ("ха!", "оце так", "давай розберемось"), but never spam emoji.
- When uncertain, say so honestly and offer the next useful step inside SYLORA.

Boundaries:
- No harassment, hate, sexual content involving minors, or illegal instructions.
- No fake medical/legal/financial guarantees.
- Protect privacy; do not ask for passwords or secrets.
"""


ToolInput = (
    ProfileToolInput
    | SettingsToolInput
    | DraftPostToolInput
    | MarkNotificationReadToolInput
    | ScheduleExportToolInput
)
JobDispatcher = Callable[[uuid.UUID], Awaitable[None]]


def pseudonymous_subject_hash(user_id: uuid.UUID) -> str:
    return hashlib.sha256(f"sylora-ai-subject:{user_id}".encode()).hexdigest()


TOOL_INPUT_MODELS: dict[str, type[BaseModel]] = {
    "update_own_profile": ProfileToolInput,
    "update_own_settings": SettingsToolInput,
    "draft_post": DraftPostToolInput,
    "mark_notification_read": MarkNotificationReadToolInput,
    "schedule_export": ScheduleExportToolInput,
}
TOOL_SPECS: tuple[dict[str, Any], ...] = (
    {
        "name": "update_own_profile",
        "description": "Update bounded fields on the authenticated user's profile.",
        "input": ProfileToolInput,
        "risk": AIToolRisk.medium,
        "allows_autopilot": False,
    },
    {
        "name": "update_own_settings",
        "description": "Update the authenticated user's account communication or privacy settings.",
        "input": SettingsToolInput,
        "risk": AIToolRisk.medium,
        "allows_autopilot": False,
    },
    {
        "name": "draft_post",
        "description": "Create a draft post owned by the authenticated user; never publishes.",
        "input": DraftPostToolInput,
        "risk": AIToolRisk.low,
        "allows_autopilot": True,
    },
    {
        "name": "mark_notification_read",
        "description": "Mark one notification belonging to the authenticated user as read.",
        "input": MarkNotificationReadToolInput,
        "risk": AIToolRisk.low,
        "allows_autopilot": True,
    },
    {
        "name": "schedule_export",
        "description": "Create an auditable user data export request.",
        "input": ScheduleExportToolInput,
        "risk": AIToolRisk.medium,
        "allows_autopilot": False,
    },
)


class AIEventHub:
    """Bounded process-local fan-out; AIEvent rows remain the durable replay source."""

    def __init__(self, queue_size: int = 100) -> None:
        self.queue_size = queue_size
        self._queues: dict[uuid.UUID, set[asyncio.Queue[AIEventResponse]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: uuid.UUID) -> asyncio.Queue[AIEventResponse]:
        queue: asyncio.Queue[AIEventResponse] = asyncio.Queue(maxsize=self.queue_size)
        async with self._lock:
            self._queues[user_id].add(queue)
        return queue

    async def unsubscribe(self, user_id: uuid.UUID, queue: asyncio.Queue[AIEventResponse]) -> None:
        async with self._lock:
            self._queues[user_id].discard(queue)
            if not self._queues[user_id]:
                self._queues.pop(user_id, None)

    async def publish(self, user_id: uuid.UUID, event: AIEventResponse) -> None:
        async with self._lock:
            queues = tuple(self._queues.get(user_id, ()))
        for queue in queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)


async def seed_ai_tool_definitions(db: AsyncSession) -> None:
    for spec in TOOL_SPECS:
        record = await db.scalar(
            select(AIToolDefinition).where(AIToolDefinition.name == spec["name"])
        )
        input_model = spec["input"]
        schema = input_model.model_json_schema()
        if record is None:
            db.add(
                AIToolDefinition(
                    name=spec["name"],
                    description=spec["description"],
                    input_schema=schema,
                    output_schema={
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {"status": {"type": "string"}},
                    },
                    risk=spec["risk"],
                    enabled=True,
                    allows_autopilot=spec["allows_autopilot"],
                    handler_key=spec["name"],
                    schema_version=1,
                )
            )
        else:
            record.description = spec["description"]
            record.input_schema = schema
            record.risk = spec["risk"]
            record.allows_autopilot = spec["allows_autopilot"]
    await db.commit()


async def settings_for(db: AsyncSession, user_id: uuid.UUID) -> AIUserSettings:
    settings = await db.get(AIUserSettings, user_id)
    if settings is None:
        settings = AIUserSettings(user_id=user_id)
        db.add(settings)
        await db.flush()
    return settings


def require_consent(settings: AIUserSettings, capability: AICapability) -> None:
    if not settings.consent_granted or settings.consented_at is None:
        raise APIError(
            403,
            "ai_consent_required",
            "AI consent required",
            "Grant explicit AI processing consent in AI settings before using this capability.",
        )
    if settings.capability_flags.get(capability.value, True) is False:
        raise APIError(
            403,
            "ai_capability_disabled",
            "AI capability disabled",
            "This AI capability is disabled in your settings.",
        )


def provider_or_503(registry: ProviderRegistry, capability: AICapability) -> AIProvider:
    try:
        return registry.resolve(capability)
    except ProviderUnavailableError as exc:
        raise APIError(
            503,
            "ai_provider_unavailable",
            "AI provider unavailable",
            f"No configured real provider is available for {capability.value}.",
        ) from exc


async def enforce_quota(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_settings: AIUserSettings,
    *,
    projected_input_units: int = 0,
) -> None:
    now = utcnow()
    period_start = datetime(now.year, now.month, 1, tzinfo=UTC)
    totals = (
        await db.execute(
            select(
                func.coalesce(
                    func.sum(AIUsageRecord.prompt_units + AIUsageRecord.completion_units), 0
                ),
                func.coalesce(func.sum(AIUsageRecord.cost_micros), 0),
            ).where(
                AIUsageRecord.user_id == user_id,
                AIUsageRecord.created_at >= period_start,
            )
        )
    ).one()
    used_units, used_cost = int(totals[0]), int(totals[1])
    if (
        user_settings.monthly_token_limit is not None
        and used_units + projected_input_units > user_settings.monthly_token_limit
    ):
        raise APIError(
            402,
            "ai_token_quota_exceeded",
            "AI token quota exceeded",
            "Your monthly AI token limit would be exceeded.",
        )
    if (
        user_settings.monthly_spend_limit_micros is not None
        and used_cost >= user_settings.monthly_spend_limit_micros
    ):
        raise APIError(
            402,
            "ai_spend_quota_exceeded",
            "AI spend quota exceeded",
            "Your monthly AI spend limit has been reached.",
        )


async def owned_conversation(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> AIConversation:
    conversation = await db.scalar(
        select(AIConversation).where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == user_id,
            AIConversation.deleted_at.is_(None),
        )
    )
    if conversation is None:
        raise APIError(
            404,
            "ai_conversation_not_found",
            "AI conversation not found",
            "The requested conversation does not exist.",
        )
    return conversation


async def _latest_prompt(
    db: AsyncSession, locale: str, capability: AICapability
) -> PromptTemplate | None:
    statement = (
        select(PromptTemplate)
        .where(
            PromptTemplate.template_key == "assistant.system",
            PromptTemplate.capability == capability,
            PromptTemplate.state == PromptTemplateState.published,
            PromptTemplate.locale.in_((locale, "en")),
        )
        .order_by(
            case((PromptTemplate.locale == locale, 0), else_=1),
            PromptTemplate.version.desc(),
        )
        .limit(1)
    )
    return await db.scalar(statement)


def _source(
    source_type: str, source_id: str, excerpt: str, context: str | None = None
) -> GroundingSource:
    safe_excerpt = excerpt[:500]
    return GroundingSource(
        source_type=source_type,
        source_id=source_id,
        safe_excerpt=safe_excerpt,
        source_hash=hashlib.sha256(safe_excerpt.encode("utf-8")).hexdigest(),
        context=(context or safe_excerpt)[:2000],
    )


def _memory_source(memory: AIMemory, settings: Settings) -> GroundingSource:
    text = memory_embedding_text(memory, settings)
    return _source("ai_memory", str(memory.id), text, text)


async def resolve_grounding_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    user_settings: AIUserSettings,
    settings: Settings,
    *,
    registry: ProviderRegistry | None = None,
    query: str | None = None,
) -> list[GroundingSource]:
    sources: list[GroundingSource] = []
    if user_settings.analytics_context_enabled:
        post_count = int(
            await db.scalar(
                select(func.count())
                .select_from(Post)
                .where(
                    Post.author_id == user_id,
                    Post.deleted_at.is_(None),
                )
            )
            or 0
        )
        follower_count = int(
            await db.scalar(
                select(func.count()).select_from(Follow).where(Follow.followed_id == user_id)
            )
            or 0
        )
        social_excerpt = f"Owned creator analytics: {post_count} posts; {follower_count} followers."
        sources.append(_source("creator_analytics", str(user_id), social_excerpt))

        accounts = list(
            (
                await db.scalars(
                    select(LedgerAccount).where(LedgerAccount.owner_user_id == user_id)
                )
            ).all()
        )
        if accounts:
            account_ids = [account.id for account in accounts]
            values = (
                await db.execute(
                    select(
                        LedgerEntry.account_id,
                        func.coalesce(func.sum(LedgerEntry.debit_minor), 0),
                        func.coalesce(func.sum(LedgerEntry.credit_minor), 0),
                    )
                    .where(LedgerEntry.account_id.in_(account_ids))
                    .group_by(LedgerEntry.account_id)
                )
            ).all()
            totals = {account_id: (int(debit), int(credit)) for account_id, debit, credit in values}
            balances = []
            for account in accounts:
                debit, credit = totals.get(account.id, (0, 0))
                amount = debit - credit if account.normal_side.value == "debit" else credit - debit
                balances.append(f"{account.account_type.value}={amount} {account.currency}")
            sources.append(
                _source(
                    "owned_ledger_summary",
                    str(user_id),
                    "Owned ledger balances: " + "; ".join(sorted(balances)),
                )
            )

    if user_settings.memory_enabled and user_settings.personalization_enabled:
        seen_memory_ids: set[uuid.UUID] = set()
        if registry is not None and query:
            for hit in await semantic_search(
                db,
                registry,
                settings,
                user_id,
                query,
                k=DEFAULT_SEMANTIC_LIMIT,
            ):
                sources.append(_memory_source(hit.memory, settings))
                seen_memory_ids.add(hit.memory.id)

        memories = (
            await db.scalars(
                select(AIMemory)
                .where(
                    AIMemory.user_id == user_id,
                    AIMemory.deleted_at.is_(None),
                    or_(AIMemory.expires_at.is_(None), AIMemory.expires_at > utcnow()),
                )
                .order_by(AIMemory.updated_at.desc())
                .limit(20)
            )
        ).all()
        for memory in memories:
            if memory.id in seen_memory_ids:
                continue
            sources.append(_memory_source(memory, settings))
    return sources


async def _chat_history(db: AsyncSession, conversation_id: uuid.UUID) -> list[Mapping[str, str]]:
    messages = list(
        (
            await db.scalars(
                select(AIMessage)
                .where(
                    AIMessage.conversation_id == conversation_id,
                    AIMessage.status == AIMessageStatus.completed,
                    AIMessage.role.in_(
                        (
                            AIMessageRole.user,
                            AIMessageRole.assistant,
                            AIMessageRole.system,
                            AIMessageRole.tool,
                        )
                    ),
                )
                .order_by(AIMessage.created_at.desc(), AIMessage.id.desc())
                .limit(40)
            )
        ).all()
    )
    messages.reverse()
    return [{"role": message.role.value, "content": message.content} for message in messages]


async def _tool_contracts(db: AsyncSession) -> list[Mapping[str, Any]]:
    definitions = (
        await db.scalars(
            select(AIToolDefinition)
            .where(AIToolDefinition.enabled.is_(True))
            .order_by(AIToolDefinition.name)
        )
    ).all()
    return [
        {
            "name": definition.name,
            "description": definition.description,
            "parameters": definition.input_schema,
        }
        for definition in definitions
    ]


async def _validate_provider_proposals(
    db: AsyncSession, proposals: Sequence[ProviderToolProposal]
) -> list[tuple[AIToolDefinition, dict[str, Any]]]:
    validated: list[tuple[AIToolDefinition, dict[str, Any]]] = []
    seen: set[str] = set()
    for proposal in proposals:
        if proposal.tool_name in seen:
            raise ProviderResponseError("provider_duplicate_tool_proposal")
        seen.add(proposal.tool_name)
        model = TOOL_INPUT_MODELS.get(proposal.tool_name)
        definition = await db.scalar(
            select(AIToolDefinition).where(
                AIToolDefinition.name == proposal.tool_name,
                AIToolDefinition.enabled.is_(True),
            )
        )
        if model is None or definition is None:
            raise ProviderResponseError("provider_unknown_tool")
        try:
            typed_input = model.model_validate(dict(proposal.typed_input)).model_dump(
                mode="json", exclude_unset=True
            )
        except ValidationError as exc:
            raise ProviderResponseError("provider_invalid_tool_schema") from exc
        validated.append((definition, typed_input))
    return validated


def _validate_citations(
    citations: Sequence[ProviderCitation], sources: Sequence[GroundingSource]
) -> list[GroundingSource]:
    authorized = {(source.source_type, source.source_id): source for source in sources}
    resolved: list[GroundingSource] = []
    seen: set[tuple[str, str]] = set()
    for citation in citations:
        key = (citation.source_type, citation.source_id)
        if key in seen:
            continue
        source = authorized.get(key)
        if source is None:
            raise ProviderResponseError("provider_unauthorized_citation")
        seen.add(key)
        resolved.append(source)
    return resolved


def _validate_provider_usage(usage: Any) -> None:
    values = (
        getattr(usage, "prompt_units", None),
        getattr(usage, "completion_units", None),
        getattr(usage, "cost_micros", None),
    )
    if any(not isinstance(value, int) or value < 0 for value in values):
        raise ProviderResponseError("provider_invalid_usage")


async def _record_failed_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    provider: AIProvider,
    capability: AICapability,
    failure_code: str,
    latency_ms: int,
) -> None:
    db.add(
        AIUsageRecord(
            user_id=user_id,
            pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
            provider=provider.name,
            model=provider.model_for(capability),
            capability=capability,
            prompt_units=0,
            completion_units=0,
            cost_micros=0,
            latency_ms=max(0, latency_ms),
            status="failed",
            failure_code=failure_code,
        )
    )
    await db.commit()


async def _execute_tool_effect(
    db: AsyncSession,
    user_id: uuid.UUID,
    tool_name: str,
    typed_input: Mapping[str, Any],
) -> dict[str, Any]:
    model = TOOL_INPUT_MODELS[tool_name]
    payload = model.model_validate(dict(typed_input))
    if isinstance(payload, ProfileToolInput):
        profile = await db.get(Profile, user_id)
        if profile is None:
            raise APIError(
                404,
                "profile_not_found",
                "Profile not found",
                "Your profile is missing.",
            )
        changed = payload.model_dump(exclude_unset=True)
        for key, value in changed.items():
            setattr(profile, key, value)
        return {"status": "updated", "fields": sorted(changed)}
    if isinstance(payload, SettingsToolInput):
        account_settings = await db.get(AccountSettings, user_id)
        if account_settings is None:
            raise APIError(
                404,
                "settings_not_found",
                "Settings not found",
                "Your account settings are missing.",
            )
        changed = payload.model_dump(exclude_unset=True)
        for key, value in changed.items():
            setattr(account_settings, key, value)
        return {"status": "updated", "fields": sorted(changed)}
    if isinstance(payload, DraftPostToolInput):
        post = Post(
            author_id=user_id,
            kind=PostKind.text,
            body=payload.body,
            media_references=[],
            link_url=None,
            category=payload.category,
            visibility=payload.visibility,
            lifecycle=PostLifecycle.draft,
        )
        db.add(post)
        await db.flush()
        return {"status": "drafted", "post_id": str(post.id), "lifecycle": "draft"}
    if isinstance(payload, MarkNotificationReadToolInput):
        notification = await db.scalar(
            select(Notification).where(
                Notification.id == payload.notification_id,
                Notification.user_id == user_id,
            )
        )
        if notification is None:
            raise APIError(
                404,
                "notification_not_found",
                "Notification not found",
                "The notification does not belong to your account.",
            )
        notification.read_at = notification.read_at or utcnow()
        return {
            "status": "read",
            "notification_id": str(notification.id),
            "read_at": notification.read_at.isoformat(),
        }
    if isinstance(payload, ScheduleExportToolInput):
        export = AIExportRequest(user_id=user_id, scope=payload.scope, status="queued")
        db.add(export)
        await db.flush()
        return {"status": "queued", "export_request_id": str(export.id), "scope": export.scope}
    raise APIError(
        422,
        "unknown_ai_tool",
        "Unknown AI tool",
        "The requested tool is not registered.",
    )


async def _execute_proposal_in_transaction(
    db: AsyncSession,
    proposal: AIToolProposal,
    request: Request,
    settings: Settings,
    *,
    approval_kind: str,
) -> tuple[AIToolExecution, dict[str, Any]]:
    if proposal.user_id is None:
        raise APIError(409, "ai_tool_revoked", "AI tool revoked", "The proposal owner was removed.")
    started = utcnow()
    proposal.state = AIToolState.executing
    output = await _execute_tool_effect(
        db, proposal.user_id, proposal.tool_name, proposal.typed_input
    )
    safe_output = validate_safe_json(output)
    assert isinstance(safe_output, dict)
    completed = utcnow()
    execution = AIToolExecution(
        proposal_id=proposal.id,
        actor_user_id=proposal.user_id,
        pseudonymous_subject_hash=pseudonymous_subject_hash(proposal.user_id),
        tool_name=proposal.tool_name,
        risk=proposal.risk,
        typed_input=proposal.typed_input,
        typed_output=safe_output,
        state=AIToolState.succeeded,
        started_at=started,
        completed_at=completed,
    )
    db.add(execution)
    proposal.state = AIToolState.succeeded
    proposal.executed_at = completed
    add_audit_event(
        db,
        request,
        settings,
        "ai.tool_executed",
        actor_user_id=proposal.user_id,
        target_user_id=proposal.user_id,
        metadata={
            "proposal_id": str(proposal.id),
            "tool_name": proposal.tool_name,
            "risk": proposal.risk.value,
            "approval": approval_kind,
        },
    )
    await db.flush()
    return execution, safe_output


async def send_chat_message(
    db: AsyncSession,
    registry: ProviderRegistry,
    settings: Settings,
    request: Request,
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
    payload: AISendMessageRequest,
    stream: bool = False,
) -> tuple[AIMessageResponse, list[str]]:
    conversation = await owned_conversation(db, conversation_id, user_id)
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, AICapability.chat)
    await enforce_quota(
        db,
        user_id,
        user_settings,
        projected_input_units=max(1, (len(payload.content) + 3) // 4),
    )
    provider = provider_or_503(registry, AICapability.chat)
    if not hasattr(provider, "chat"):
        raise APIError(
            503,
            "ai_provider_unavailable",
            "AI provider unavailable",
            "The configured provider does not implement chat.",
        )
    for message_id in (payload.parent_message_id, payload.retry_of_message_id):
        if message_id is not None and not await db.scalar(
            select(AIMessage.id).where(
                AIMessage.id == message_id,
                AIMessage.conversation_id == conversation.id,
            )
        ):
            raise APIError(
                422,
                "ai_message_link_invalid",
                "Invalid message link",
                "Parent and retry messages must belong to this conversation.",
            )

    history = await _chat_history(db, conversation.id)
    prompt_template = await _latest_prompt(db, conversation.locale, AICapability.chat)
    system_content = (
        prompt_template.content if prompt_template is not None else AURA_SYSTEM_PROMPT
    )
    history.insert(0, {"role": "system", "content": system_content})
    history.append({"role": "user", "content": payload.content})
    sources = await resolve_grounding_context(
        db,
        user_id,
        user_settings,
        settings,
        registry=registry,
        query=payload.content,
    )
    contracts = await _tool_contracts(db)
    provider_request = ChatProviderRequest(
        messages=history,
        locale=conversation.locale,
        grounding_sources=sources,
        tools=contracts,
    )
    started = utcnow()
    deltas: list[str] = []
    try:
        if stream and hasattr(provider, "stream_chat"):
            response: ChatProviderResponse | None = None
            async for event in provider.stream_chat(provider_request):
                if not isinstance(event, ChatStreamEvent):
                    raise ProviderResponseError("provider_invalid_chat_stream")
                if event.text_delta:
                    deltas.append(event.text_delta)
                if event.final is not None:
                    response = event.final
            if response is None:
                raise ProviderResponseError("provider_incomplete_chat_stream")
        else:
            response = await provider.chat(provider_request)
    except ProviderCallError as exc:
        latency = int((utcnow() - started).total_seconds() * 1000)
        await _record_failed_usage(db, user_id, provider, AICapability.chat, exc.code, latency)
        raise APIError(
            502 if not exc.retryable else 503,
            exc.code,
            "AI provider request failed",
            "The configured AI provider could not complete the request.",
        ) from exc

    try:
        if not isinstance(response, ChatProviderResponse):
            raise ProviderResponseError("provider_invalid_chat_response")
        _validate_provider_usage(response.usage)
        content = validate_plain_text(response.content)
        if not content or len(content) > 64_000:
            raise ValueError
        if stream and deltas and "".join(deltas) != content:
            raise ProviderResponseError("provider_inconsistent_chat_stream")
        validated_proposals = await _validate_provider_proposals(db, response.tool_proposals)
        resolved_citations = _validate_citations(response.citations, sources)
    except (ValueError, ProviderResponseError) as exc:
        failure_code = (
            exc.code if isinstance(exc, ProviderResponseError) else "provider_invalid_text"
        )
        latency = int((utcnow() - started).total_seconds() * 1000)
        await _record_failed_usage(db, user_id, provider, AICapability.chat, failure_code, latency)
        raise APIError(
            502,
            failure_code,
            "Invalid AI provider response",
            "The provider response failed the server's strict safety contract.",
        ) from exc

    now = utcnow()
    user_message = AIMessage(
        conversation_id=conversation.id,
        role=AIMessageRole.user,
        content=payload.content,
        structured_content_refs=[
            reference.model_dump(mode="json") for reference in payload.content_refs
        ],
        status=AIMessageStatus.completed,
        parent_message_id=payload.parent_message_id,
        retry_of_message_id=payload.retry_of_message_id,
        created_at=now,
        completed_at=now,
    )
    db.add(user_message)
    await db.flush()
    assistant_message = AIMessage(
        conversation_id=conversation.id,
        role=AIMessageRole.assistant,
        content=content,
        structured_content_refs=[],
        provider=provider.name,
        model=response.model,
        status=AIMessageStatus.completed,
        prompt_units=response.usage.prompt_units,
        completion_units=response.usage.completion_units,
        cost_micros=response.usage.cost_micros,
        parent_message_id=user_message.id,
        created_at=now + timedelta(microseconds=1),
        completed_at=now,
    )
    db.add(assistant_message)
    await db.flush()
    citation_records: list[AICitation] = []
    for source in resolved_citations:
        citation = AICitation(
            message_id=assistant_message.id,
            source_type=source.source_type,
            source_id=source.source_id,
            safe_excerpt=source.safe_excerpt,
            source_hash=source.source_hash,
        )
        db.add(citation)
        citation_records.append(citation)

    proposal_records: list[AIToolProposal] = []
    for definition, typed_input in validated_proposals:
        proposal = AIToolProposal(
            user_id=user_id,
            conversation_id=conversation.id,
            message_id=assistant_message.id,
            tool_definition_id=definition.id,
            tool_name=definition.name,
            risk=definition.risk,
            typed_input=typed_input,
            state=AIToolState.proposed,
        )
        db.add(proposal)
        await db.flush()
        if (
            conversation.mode == AIConversationMode.autopilot
            and definition.risk == AIToolRisk.low
            and definition.allows_autopilot
            and definition.name in user_settings.autopilot_low_risk_tools
        ):
            proposal.state = AIToolState.approved
            proposal.approved_at = now
            proposal.approved_by_id = user_id
            started_at = utcnow()
            try:
                async with db.begin_nested():
                    await _execute_proposal_in_transaction(
                        db,
                        proposal,
                        request,
                        settings,
                        approval_kind="autopilot_low_risk",
                    )
            except Exception as exc:
                failure_code = exc.code if isinstance(exc, APIError) else "tool_execution_failed"
                proposal.state = AIToolState.failed
                proposal.executed_at = utcnow()
                db.add(
                    AIToolExecution(
                        proposal_id=proposal.id,
                        actor_user_id=user_id,
                        pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
                        tool_name=proposal.tool_name,
                        risk=proposal.risk,
                        typed_input=proposal.typed_input,
                        typed_output={},
                        state=AIToolState.failed,
                        failure_code=failure_code,
                        started_at=started_at,
                        completed_at=utcnow(),
                    )
                )
                add_audit_event(
                    db,
                    request,
                    settings,
                    "ai.tool_failed",
                    actor_user_id=user_id,
                    target_user_id=user_id,
                    metadata={
                        "proposal_id": str(proposal.id),
                        "tool_name": proposal.tool_name,
                        "failure_code": failure_code,
                        "approval": "autopilot_low_risk",
                    },
                )
        proposal_records.append(proposal)

    latency = int((utcnow() - started).total_seconds() * 1000)
    db.add(
        AIUsageRecord(
            user_id=user_id,
            pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
            provider=provider.name,
            model=response.model,
            capability=AICapability.chat,
            prompt_units=response.usage.prompt_units,
            completion_units=response.usage.completion_units,
            cost_micros=response.usage.cost_micros,
            latency_ms=latency,
            status="succeeded",
        )
    )
    event = AIEvent(
        user_id=user_id,
        event_type="message.completed",
        aggregate_type="message",
        aggregate_id=assistant_message.id,
        event_payload={"conversation_id": str(conversation.id)},
    )
    db.add(event)
    conversation.updated_at = now
    await db.commit()
    await db.refresh(assistant_message)
    for citation in citation_records:
        await db.refresh(citation)
    for proposal in proposal_records:
        await db.refresh(proposal)
    return (
        AIMessageResponse(
            **{
                key: value
                for key, value in AIMessageResponse.model_validate(assistant_message)
                .model_dump()
                .items()
                if key not in {"citations", "proposals"}
            },
            citations=[AICitationResponse.model_validate(item) for item in citation_records],
            proposals=[AIToolProposalResponse.model_validate(item) for item in proposal_records],
        ),
        deltas or [content],
    )


async def message_response(db: AsyncSession, message: AIMessage) -> AIMessageResponse:
    citations = (
        await db.scalars(
            select(AICitation).where(AICitation.message_id == message.id).order_by(AICitation.id)
        )
    ).all()
    proposals = (
        await db.scalars(
            select(AIToolProposal)
            .where(AIToolProposal.message_id == message.id)
            .order_by(AIToolProposal.created_at, AIToolProposal.id)
        )
    ).all()
    base = AIMessageResponse.model_validate(message).model_dump()
    base["citations"] = [AICitationResponse.model_validate(item) for item in citations]
    base["proposals"] = [AIToolProposalResponse.model_validate(item) for item in proposals]
    return AIMessageResponse.model_validate(base)


async def approve_proposal(
    db: AsyncSession,
    proposal_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> AIToolProposal:
    proposal = await db.scalar(
        select(AIToolProposal).where(
            AIToolProposal.id == proposal_id,
            AIToolProposal.conversation_id == conversation_id,
            AIToolProposal.user_id == user_id,
        )
    )
    if proposal is None:
        raise APIError(
            404,
            "ai_tool_proposal_not_found",
            "AI tool proposal not found",
            "The proposal does not exist.",
        )
    conversation = await owned_conversation(db, conversation_id, user_id)
    if conversation.mode == AIConversationMode.manual:
        raise APIError(
            409,
            "ai_manual_mode_no_execution",
            "Manual mode does not execute tools",
            "Change the conversation mode before approving a tool.",
        )
    if proposal.state != AIToolState.proposed:
        raise APIError(
            409,
            "ai_tool_state_conflict",
            "AI tool state conflict",
            "Only proposed tools can be approved.",
        )
    proposal.state = AIToolState.approved
    proposal.approved_by_id = user_id
    proposal.approved_at = utcnow()
    return proposal


async def reject_proposal(
    db: AsyncSession,
    proposal_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> AIToolProposal:
    proposal = await db.scalar(
        select(AIToolProposal).where(
            AIToolProposal.id == proposal_id,
            AIToolProposal.conversation_id == conversation_id,
            AIToolProposal.user_id == user_id,
        )
    )
    if proposal is None:
        raise APIError(
            404,
            "ai_tool_proposal_not_found",
            "AI tool proposal not found",
            "The proposal does not exist.",
        )
    if proposal.state not in {AIToolState.proposed, AIToolState.approved}:
        raise APIError(
            409,
            "ai_tool_state_conflict",
            "AI tool state conflict",
            "This proposal can no longer be rejected.",
        )
    proposal.state = AIToolState.rejected
    proposal.rejected_at = utcnow()
    return proposal


async def execute_proposal(
    db: AsyncSession,
    proposal_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    settings: Settings,
) -> tuple[AIToolProposal, AIToolExecution, dict[str, Any]]:
    conversation = await owned_conversation(db, conversation_id, user_id)
    if conversation.mode == AIConversationMode.manual:
        raise APIError(
            409,
            "ai_manual_mode_no_execution",
            "Manual mode does not execute tools",
            "Tool execution is disabled for Manual conversations.",
        )
    proposal = await db.scalar(
        select(AIToolProposal).where(
            AIToolProposal.id == proposal_id,
            AIToolProposal.conversation_id == conversation_id,
            AIToolProposal.user_id == user_id,
        )
    )
    if proposal is None:
        raise APIError(
            404,
            "ai_tool_proposal_not_found",
            "AI tool proposal not found",
            "The proposal does not exist.",
        )
    if proposal.state != AIToolState.approved or proposal.approved_by_id != user_id:
        raise APIError(
            409,
            "ai_tool_approval_required",
            "Explicit tool approval required",
            "Approve this proposal explicitly before execution.",
        )
    try:
        execution, output = await _execute_proposal_in_transaction(
            db, proposal, request, settings, approval_kind="explicit_human"
        )
        event = AIEvent(
            user_id=user_id,
            event_type="tool.succeeded",
            aggregate_type="tool_proposal",
            aggregate_id=proposal.id,
            event_payload={"tool_name": proposal.tool_name},
        )
        db.add(event)
        await db.commit()
        await db.refresh(proposal)
        await db.refresh(execution)
        return proposal, execution, output
    except Exception as exc:
        await db.rollback()
        failure_code = exc.code if isinstance(exc, APIError) else "tool_execution_failed"
        failed_proposal = await db.get(AIToolProposal, proposal_id)
        if failed_proposal is not None:
            failed_proposal.state = AIToolState.failed
            failed_proposal.executed_at = utcnow()
            failed = AIToolExecution(
                proposal_id=failed_proposal.id,
                actor_user_id=user_id,
                pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
                tool_name=failed_proposal.tool_name,
                risk=failed_proposal.risk,
                typed_input=failed_proposal.typed_input,
                typed_output={},
                state=AIToolState.failed,
                failure_code=failure_code,
                started_at=utcnow(),
                completed_at=utcnow(),
            )
            db.add(failed)
            add_audit_event(
                db,
                request,
                settings,
                "ai.tool_failed",
                actor_user_id=user_id,
                target_user_id=user_id,
                metadata={
                    "proposal_id": str(failed_proposal.id),
                    "tool_name": failed_proposal.tool_name,
                    "failure_code": failure_code,
                },
            )
            await db.commit()
        if isinstance(exc, APIError):
            raise
        raise APIError(
            500,
            "tool_execution_failed",
            "AI tool execution failed",
            "The transactional tool effect could not be completed.",
        ) from exc


def memory_response(record: AIMemory, settings: Settings) -> AIMemoryResponse:
    return AIMemoryResponse(
        id=record.id,
        kind=record.kind,
        content=decrypt_secret(record.encrypted_content, settings)
        if record.encrypted_content
        else None,
        structured_value=record.structured_value,
        source_message_id=record.source_message_id,
        consented_at=record.consented_at,
        expires_at=record.expires_at,
        embedding_state=record.embedding_state,
        embedding_ref=record.embedding_ref,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def create_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    payload: AIMemoryCreate,
    settings: Settings,
    registry: ProviderRegistry,
) -> AIMemory:
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, AICapability.chat)
    if not user_settings.memory_enabled:
        raise APIError(
            403,
            "ai_memory_disabled",
            "AI memory disabled",
            "Enable AI memory before saving an item.",
        )
    if payload.source_message_id is not None and not await db.scalar(
        select(AIMessage.id)
        .join(AIConversation, AIConversation.id == AIMessage.conversation_id)
        .where(
            AIMessage.id == payload.source_message_id,
            AIConversation.user_id == user_id,
            AIConversation.deleted_at.is_(None),
        )
    ):
        raise APIError(
            422,
            "ai_memory_source_invalid",
            "Invalid memory source",
            "The source message does not belong to your active conversations.",
        )
    record = AIMemory(
        user_id=user_id,
        kind=payload.kind,
        encrypted_content=encrypt_secret(payload.content, settings) if payload.content else None,
        structured_value=payload.structured_value,
        source_message_id=payload.source_message_id,
        consented_at=user_settings.consented_at or utcnow(),
        expires_at=payload.expires_at,
        embedding_state=AIEmbeddingState.disabled,
    )
    db.add(record)
    await db.flush()
    await embed_and_index(db, registry, settings, record)
    return record


async def patch_memory(
    db: AsyncSession,
    user_id: uuid.UUID,
    memory_id: uuid.UUID,
    payload: AIMemoryPatch,
    settings: Settings,
    registry: ProviderRegistry,
) -> AIMemory:
    record = await db.scalar(
        select(AIMemory).where(
            AIMemory.id == memory_id,
            AIMemory.user_id == user_id,
            AIMemory.deleted_at.is_(None),
        )
    )
    if record is None:
        raise APIError(
            404,
            "ai_memory_not_found",
            "AI memory not found",
            "The memory item does not exist.",
        )
    values = payload.model_dump(exclude_unset=True)
    needs_embedding = False
    if "kind" in values:
        record.kind = values["kind"]
        needs_embedding = True
    if payload.content is not None:
        record.encrypted_content = encrypt_secret(payload.content, settings)
        record.structured_value = None
        record.embedding_state = AIEmbeddingState.disabled
        record.embedding_ref = None
        needs_embedding = True
    elif payload.structured_value is not None:
        record.structured_value = payload.structured_value
        record.encrypted_content = None
        record.embedding_state = AIEmbeddingState.disabled
        record.embedding_ref = None
        needs_embedding = True
    if "expires_at" in values:
        record.expires_at = payload.expires_at
    if needs_embedding:
        await embed_and_index(db, registry, settings, record)
    await db.commit()
    await db.refresh(record)
    return record


async def delete_memories(
    db: AsyncSession,
    user_id: uuid.UUID,
    settings: Settings,
    memory_id: uuid.UUID | None = None,
) -> int:
    statement = select(AIMemory).where(
        AIMemory.user_id == user_id,
        AIMemory.deleted_at.is_(None),
    )
    if memory_id is not None:
        statement = statement.where(AIMemory.id == memory_id)
    records = (await db.scalars(statement)).all()
    if memory_id is not None and not records:
        raise APIError(
            404,
            "ai_memory_not_found",
            "AI memory not found",
            "The memory item does not exist.",
        )
    now = utcnow()
    for record in records:
        await delete_embedding(db, record.id)
        record.encrypted_content = encrypt_secret("[deleted]", settings)
        record.structured_value = None
        record.deleted_at = now
        record.embedding_state = AIEmbeddingState.deleted
        record.embedding_ref = None
    return len(records)


async def invoke_translation(
    db: AsyncSession,
    registry: ProviderRegistry,
    user_id: uuid.UUID,
    *,
    text: str,
    source_language: str,
    target_language: str,
) -> tuple[str, TranslationProviderResponse]:
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, AICapability.translation)
    await enforce_quota(db, user_id, user_settings, projected_input_units=max(1, len(text) // 4))
    provider = provider_or_503(registry, AICapability.translation)
    if not hasattr(provider, "translate"):
        raise APIError(
            503,
            "ai_provider_unavailable",
            "AI provider unavailable",
            "The configured provider does not implement translation.",
        )
    started = utcnow()
    try:
        result = await provider.translate(text, source_language, target_language)
        if not isinstance(result, TranslationProviderResponse):
            raise ProviderResponseError("provider_invalid_translation")
        _validate_provider_usage(result.usage)
        if result.source_language != source_language or result.target_language != target_language:
            raise ProviderResponseError("provider_invalid_translation")
        translated = validate_plain_text(result.text)
        if not translated or len(translated) > 40_000:
            raise ProviderResponseError("provider_invalid_translation")
    except ProviderCallError as exc:
        latency = int((utcnow() - started).total_seconds() * 1000)
        await _record_failed_usage(
            db, user_id, provider, AICapability.translation, exc.code, latency
        )
        raise APIError(
            503 if exc.retryable else 502,
            exc.code,
            "Translation provider failed",
            "The configured translation provider could not complete the request.",
        ) from exc
    db.add(
        AIUsageRecord(
            user_id=user_id,
            pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
            provider=provider.name,
            model=result.model,
            capability=AICapability.translation,
            prompt_units=result.usage.prompt_units,
            completion_units=result.usage.completion_units,
            cost_micros=result.usage.cost_micros,
            latency_ms=int((utcnow() - started).total_seconds() * 1000),
            status="succeeded",
        )
    )
    await db.commit()
    return provider.name, result


async def invoke_moderation(
    db: AsyncSession,
    registry: ProviderRegistry,
    user_id: uuid.UUID,
    text: str,
) -> tuple[str, ModerationProviderResponse]:
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, AICapability.moderation)
    await enforce_quota(db, user_id, user_settings, projected_input_units=max(1, len(text) // 4))
    provider = provider_or_503(registry, AICapability.moderation)
    if not hasattr(provider, "moderate"):
        raise APIError(
            503,
            "ai_provider_unavailable",
            "AI provider unavailable",
            "The configured provider does not implement moderation.",
        )
    started = utcnow()
    try:
        result = await provider.moderate(text)
        if not isinstance(result, ModerationProviderResponse):
            raise ProviderResponseError("provider_invalid_moderation")
        _validate_provider_usage(result.usage)
        if result.recommendation not in {"allow", "review", "block"}:
            raise ProviderResponseError("provider_invalid_moderation")
        categories = {
            str(key): float(value)
            for key, value in result.categories.items()
            if 0 <= float(value) <= 1
        }
        if len(categories) != len(result.categories) or not 0 <= result.confidence <= 1:
            raise ProviderResponseError("provider_invalid_moderation")
    except ProviderCallError as exc:
        latency = int((utcnow() - started).total_seconds() * 1000)
        await _record_failed_usage(
            db, user_id, provider, AICapability.moderation, exc.code, latency
        )
        raise APIError(
            503 if exc.retryable else 502,
            exc.code,
            "Moderation provider failed",
            "The configured moderation provider could not complete the request.",
        ) from exc
    db.add(
        AIUsageRecord(
            user_id=user_id,
            pseudonymous_subject_hash=pseudonymous_subject_hash(user_id),
            provider=provider.name,
            model=result.model,
            capability=AICapability.moderation,
            prompt_units=result.usage.prompt_units,
            completion_units=result.usage.completion_units,
            cost_micros=result.usage.cost_micros,
            latency_ms=int((utcnow() - started).total_seconds() * 1000),
            status="succeeded",
        )
    )
    await db.commit()
    return provider.name, result


async def create_generation_job(
    db: AsyncSession,
    registry: ProviderRegistry,
    dispatcher: JobDispatcher,
    user_id: uuid.UUID,
    capability: AICapability,
    typed_request: dict[str, Any],
) -> AIJob:
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, capability)
    await enforce_quota(
        db,
        user_id,
        user_settings,
        projected_input_units=max(1, len(json.dumps(typed_request)) // 4),
    )
    provider = provider_or_503(registry, capability)
    job = AIJob(
        user_id=user_id,
        capability=capability,
        status=AIJobStatus.queued,
        typed_request=typed_request,
        output_refs=[],
        provider=provider.name,
        model=provider.model_for(capability),
        progress=0,
    )
    db.add(job)
    await db.flush()
    db.add(
        AIEvent(
            user_id=user_id,
            event_type="job.queued",
            aggregate_type="job",
            aggregate_id=job.id,
            event_payload={"capability": capability.value},
        )
    )
    await db.commit()
    try:
        await dispatcher(job.id)
    except Exception as exc:
        job.status = AIJobStatus.failed
        job.failure_code = "job_dispatch_unavailable"
        job.completed_at = utcnow()
        db.add(
            AIEvent(
                user_id=user_id,
                event_type="job.failed",
                aggregate_type="job",
                aggregate_id=job.id,
                event_payload={"failure_code": job.failure_code},
            )
        )
        await db.commit()
        raise APIError(
            503,
            "job_dispatch_unavailable",
            "AI job dispatcher unavailable",
            "The generation job could not be enqueued.",
        ) from exc
    await db.refresh(job)
    return job


async def _call_generation_provider(
    provider: AIProvider,
    capability: AICapability,
    request: Mapping[str, Any],
    provider_operation_id: str | None,
) -> GenerationProviderResponse:
    if provider_operation_id and isinstance(provider, AsyncGenerationProvider):
        return await provider.poll_generation(capability, provider_operation_id)
    if isinstance(provider, AsyncGenerationProvider):
        return await provider.start_generation(capability, request)
    method_name = {
        AICapability.image: "generate_image",
        AICapability.video: "generate_video",
        AICapability.music: "generate_music",
        AICapability.voice: "generate_speech",
        AICapability.avatar: "generate_avatar",
    }.get(capability)
    method = getattr(provider, method_name or "", None)
    if method is None:
        raise ProviderUnavailableError(capability)
    result: GenerationProviderResponse = await method(request)
    return result


def _asset_extension(content_type: str) -> str:
    return {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "video/mp4": "mp4",
    }.get(content_type, "bin")


async def _fail_generation_job(
    db: AsyncSession,
    job: AIJob,
    *,
    failure_code: str,
    started: datetime,
) -> AIJob:
    job.status = AIJobStatus.failed
    job.failure_code = failure_code
    job.completed_at = utcnow()
    job.retry_count += 1
    db.add(
        AIUsageRecord(
            user_id=job.user_id,
            pseudonymous_subject_hash=pseudonymous_subject_hash(job.user_id),
            provider=job.provider,
            model=job.model,
            capability=job.capability,
            prompt_units=0,
            completion_units=0,
            cost_micros=0,
            latency_ms=int((utcnow() - started).total_seconds() * 1000),
            status="failed",
            failure_code=failure_code,
        )
    )
    db.add(
        AIEvent(
            user_id=job.user_id,
            event_type="job.failed",
            aggregate_type="job",
            aggregate_id=job.id,
            event_payload={"failure_code": failure_code},
        )
    )
    await db.commit()
    await db.refresh(job)
    return job


async def process_generation_job(
    db: AsyncSession,
    registry: ProviderRegistry,
    storage: S3ObjectStorage,
    job_id: uuid.UUID,
) -> AIJob:
    job = await db.get(AIJob, job_id)
    if job is None:
        raise ValueError("AI job does not exist")
    if job.status in {AIJobStatus.cancelled, AIJobStatus.succeeded, AIJobStatus.failed}:
        return job
    started = utcnow()
    user_settings = await settings_for(db, job.user_id)
    try:
        require_consent(user_settings, job.capability)
        await enforce_quota(db, job.user_id, user_settings)
    except APIError as exc:
        return await _fail_generation_job(db, job, failure_code=exc.code, started=started)
    if job.provider_operation_id and job.retry_count >= job.max_retries:
        return await _fail_generation_job(
            db,
            job,
            failure_code="provider_operation_timeout",
            started=started,
        )
    try:
        provider = provider_or_503(registry, job.capability)
    except APIError as exc:
        return await _fail_generation_job(db, job, failure_code=exc.code, started=started)
    if provider.name != job.provider:
        return await _fail_generation_job(
            db,
            job,
            failure_code="ai_provider_unavailable",
            started=started,
        )
    job.status = AIJobStatus.running
    job.started_at = job.started_at or utcnow()
    db.add(
        AIEvent(
            user_id=job.user_id,
            event_type="job.running",
            aggregate_type="job",
            aggregate_id=job.id,
            event_payload={"progress": job.progress},
        )
    )
    await db.commit()
    try:
        result = await _call_generation_provider(
            provider, job.capability, job.typed_request, job.provider_operation_id
        )
        if not isinstance(result, GenerationProviderResponse):
            raise ProviderResponseError("provider_invalid_generation_response")
        _validate_provider_usage(result.usage)
        if result.pending:
            if not isinstance(provider, AsyncGenerationProvider):
                raise ProviderResponseError("provider_invalid_async_generation_response")
            if not result.provider_operation_id:
                raise ProviderResponseError("provider_missing_operation_id")
            job.provider_operation_id = result.provider_operation_id
            job.progress = max(0, min(99, result.progress))
            job.status = (
                AIJobStatus.requires_input if result.requires_input else AIJobStatus.running
            )
            job.retry_count += 1
            db.add(
                AIEvent(
                    user_id=job.user_id,
                    event_type=("job.requires_input" if result.requires_input else "job.progress"),
                    aggregate_type="job",
                    aggregate_id=job.id,
                    event_payload={"progress": job.progress},
                )
            )
        else:
            if not result.assets:
                raise ProviderResponseError("provider_missing_generated_output")
            output_refs: list[dict[str, Any]] = []
            for index, asset in enumerate(result.assets):
                if not isinstance(asset, GeneratedAsset) or not asset.content:
                    raise ProviderResponseError("provider_invalid_generated_output")
                object_key = (
                    f"ai/{job.user_id}/{job.id}/{index}.{_asset_extension(asset.content_type)}"
                )
                stored = await storage.put_bytes(
                    object_key=object_key,
                    content_type=asset.content_type,
                    content=asset.content,
                )
                output_ref = AIOutputReference(
                    object_key=stored.object_key,
                    content_type=stored.content_type,
                    byte_size=stored.byte_size,
                    sha256=stored.sha256,
                    metadata=validate_safe_json(dict(asset.metadata)),
                )
                output_refs.append(output_ref.model_dump(mode="json"))
            job.output_refs = output_refs
            job.status = AIJobStatus.succeeded
            job.progress = 100
            job.completed_at = utcnow()
            db.add(
                AIEvent(
                    user_id=job.user_id,
                    event_type="job.succeeded",
                    aggregate_type="job",
                    aggregate_id=job.id,
                    event_payload={
                        "capability": job.capability.value,
                        "output_count": len(output_refs),
                    },
                )
            )
        db.add(
            AIUsageRecord(
                user_id=job.user_id,
                pseudonymous_subject_hash=pseudonymous_subject_hash(job.user_id),
                provider=provider.name,
                model=result.model,
                capability=job.capability,
                prompt_units=result.usage.prompt_units,
                completion_units=result.usage.completion_units,
                cost_micros=result.usage.cost_micros,
                latency_ms=int((utcnow() - started).total_seconds() * 1000),
                status="succeeded" if not result.pending else "pending",
            )
        )
        await db.commit()
        await db.refresh(job)
        return job
    except Exception as exc:
        await db.rollback()
        job = await db.get(AIJob, job_id)
        assert job is not None
        if isinstance(exc, (APIError, ProviderCallError)):
            code = exc.code
        elif isinstance(exc, ProviderUnavailableError):
            code = "ai_provider_unavailable"
        else:
            code = "provider_invalid_generated_output"
        return await _fail_generation_job(db, job, failure_code=code, started=started)


async def cancel_generation_job(
    db: AsyncSession,
    registry: ProviderRegistry,
    user_id: uuid.UUID,
    job_id: uuid.UUID,
) -> AIJob:
    job = await db.scalar(select(AIJob).where(AIJob.id == job_id, AIJob.user_id == user_id))
    if job is None:
        raise APIError(404, "ai_job_not_found", "AI job not found", "The job does not exist.")
    if job.status in {AIJobStatus.succeeded, AIJobStatus.failed, AIJobStatus.cancelled}:
        raise APIError(
            409,
            "ai_job_state_conflict",
            "AI job state conflict",
            "This job can no longer be cancelled.",
        )
    provider = provider_or_503(registry, job.capability) if job.provider_operation_id else None
    if job.provider_operation_id and isinstance(provider, AsyncGenerationProvider):
        try:
            cancelled = await provider.cancel_generation(job.capability, job.provider_operation_id)
            if not cancelled:
                raise ProviderCallError("provider_cancellation_not_confirmed")
        except ProviderCallError as exc:
            raise APIError(
                503,
                exc.code,
                "AI provider cancellation failed",
                "The provider did not confirm cancellation.",
            ) from exc
    job.status = AIJobStatus.cancelled
    job.cancelled_at = utcnow()
    job.completed_at = job.cancelled_at
    db.add(
        AIEvent(
            user_id=user_id,
            event_type="job.cancelled",
            aggregate_type="job",
            aggregate_id=job.id,
            event_payload={},
        )
    )
    await db.commit()
    await db.refresh(job)
    return job


async def retry_generation_job(
    db: AsyncSession,
    registry: ProviderRegistry,
    dispatcher: JobDispatcher,
    user_id: uuid.UUID,
    job_id: uuid.UUID,
) -> AIJob:
    job = await db.scalar(select(AIJob).where(AIJob.id == job_id, AIJob.user_id == user_id))
    if job is None:
        raise APIError(404, "ai_job_not_found", "AI job not found", "The job does not exist.")
    if job.status != AIJobStatus.failed:
        raise APIError(
            409,
            "ai_job_state_conflict",
            "AI job state conflict",
            "Only failed jobs can be retried.",
        )
    if job.retry_count >= job.max_retries:
        raise APIError(
            409,
            "ai_job_retry_exhausted",
            "AI job retries exhausted",
            "This job has reached its retry limit.",
        )
    user_settings = await settings_for(db, user_id)
    require_consent(user_settings, job.capability)
    await enforce_quota(db, user_id, user_settings)
    provider = provider_or_503(registry, job.capability)
    if provider.name != job.provider:
        raise APIError(
            503,
            "ai_provider_unavailable",
            "AI provider unavailable",
            "The provider selected for this job is no longer configured.",
        )
    job.status = AIJobStatus.queued
    job.failure_code = None
    job.completed_at = None
    job.progress = 0
    db.add(
        AIEvent(
            user_id=user_id,
            event_type="job.retried",
            aggregate_type="job",
            aggregate_id=job.id,
            event_payload={"retry_count": job.retry_count},
        )
    )
    await db.commit()
    try:
        await dispatcher(job.id)
    except Exception as exc:
        job.status = AIJobStatus.failed
        job.failure_code = "job_dispatch_unavailable"
        job.completed_at = utcnow()
        job.retry_count += 1
        db.add(
            AIEvent(
                user_id=user_id,
                event_type="job.failed",
                aggregate_type="job",
                aggregate_id=job.id,
                event_payload={"failure_code": job.failure_code},
            )
        )
        await db.commit()
        raise APIError(
            503,
            "job_dispatch_unavailable",
            "AI job dispatcher unavailable",
            "The generation retry could not be enqueued.",
        ) from exc
    await db.refresh(job)
    return job


def event_response(settings: Settings, record: AIEvent) -> AIEventResponse:
    from app.social_service import encode_cursor

    return AIEventResponse(
        event=record.event_type,
        cursor=encode_cursor(settings, "ai-events", record.created_at, record.id),
        aggregate_type=record.aggregate_type,
        aggregate_id=record.aggregate_id,
        payload=record.event_payload,
        occurred_at=record.created_at,
    )


async def scrub_ai_user_records(
    db: AsyncSession,
    user_id: uuid.UUID,
    settings: Settings,
) -> None:
    """Scrub AI content while retaining minimal pseudonymized append-only usage/audit rows."""
    await db.execute(delete(AIMemoryEmbedding).where(AIMemoryEmbedding.user_id == user_id))
    await db.execute(delete(AIMemory).where(AIMemory.user_id == user_id))
    await db.execute(delete(AIEvent).where(AIEvent.user_id == user_id))
    await db.execute(delete(AIJob).where(AIJob.user_id == user_id))
    await db.execute(delete(AIExportRequest).where(AIExportRequest.user_id == user_id))
    await db.execute(delete(AIConversation).where(AIConversation.user_id == user_id))
    await db.execute(delete(AIUserSettings).where(AIUserSettings.user_id == user_id))
    proposals = (
        await db.scalars(select(AIToolProposal).where(AIToolProposal.user_id == user_id))
    ).all()
    for proposal in proposals:
        proposal.user_id = None
        proposal.conversation_id = None
        proposal.message_id = None
        proposal.typed_input = {"redacted": True}
