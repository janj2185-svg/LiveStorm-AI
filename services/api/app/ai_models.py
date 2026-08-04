from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class AICapability(enum.StrEnum):
    chat = "chat"
    image = "image"
    video = "video"
    music = "music"
    voice = "voice"
    avatar = "avatar"
    translation = "translation"
    moderation = "moderation"
    embeddings = "embeddings"


class AIConversationMode(enum.StrEnum):
    copilot = "copilot"
    autopilot = "autopilot"
    manual = "manual"


class AIConversationPurpose(enum.StrEnum):
    general = "general"
    business_copilot = "business_copilot"
    learning_tutor = "learning_tutor"


class AIMessageRole(enum.StrEnum):
    user = "user"
    assistant = "assistant"
    system = "system"
    tool = "tool"


class AIMessageStatus(enum.StrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class AIToolRisk(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AIToolState(enum.StrEnum):
    proposed = "proposed"
    approved = "approved"
    rejected = "rejected"
    executing = "executing"
    succeeded = "succeeded"
    failed = "failed"


class AIMemoryKind(enum.StrEnum):
    preference = "preference"
    fact = "fact"
    summary = "summary"


class AIEmbeddingState(enum.StrEnum):
    disabled = "disabled"
    pending = "pending"
    ready = "ready"
    failed = "failed"
    deleted = "deleted"


class AIJobStatus(enum.StrEnum):
    queued = "queued"
    running = "running"
    requires_input = "requires_input"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class PromptTemplateState(enum.StrEnum):
    draft = "draft"
    published = "published"


class AIProviderConfiguration(Base):
    __tablename__ = "ai_provider_configurations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    base_url: Mapped[str] = mapped_column(String(2048))
    encrypted_api_credential: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    model_mapping: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    pricing_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIUserSettings(Base):
    __tablename__ = "ai_user_settings"
    __table_args__ = (
        CheckConstraint(
            "monthly_spend_limit_micros IS NULL OR monthly_spend_limit_micros >= 0",
            name="ck_ai_settings_nonnegative_spend_limit",
        ),
        CheckConstraint(
            "monthly_token_limit IS NULL OR monthly_token_limit >= 0",
            name="ck_ai_settings_nonnegative_token_limit",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    consent_granted: Mapped[bool] = mapped_column(Boolean, default=False)
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    analytics_context_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    personalization_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    preferred_locale: Mapped[str] = mapped_column(String(16), default="en")
    monthly_spend_limit_micros: Mapped[int | None] = mapped_column(BigInteger)
    monthly_token_limit: Mapped[int | None] = mapped_column(BigInteger)
    capability_flags: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    autopilot_low_risk_tools: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str | None] = mapped_column(String(200))
    mode: Mapped[AIConversationMode] = mapped_column(
        Enum(AIConversationMode, native_enum=False, length=16),
        default=AIConversationMode.copilot,
        index=True,
    )
    purpose: Mapped[AIConversationPurpose] = mapped_column(
        Enum(AIConversationPurpose, native_enum=False, length=32),
        default=AIConversationPurpose.general,
        index=True,
    )
    locale: Mapped[str] = mapped_column(String(16), default="en")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), index=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class AIMessage(Base):
    __tablename__ = "ai_messages"
    __table_args__ = (
        CheckConstraint(
            "prompt_units >= 0 AND completion_units >= 0 AND cost_micros >= 0",
            name="ck_ai_message_nonnegative_usage",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[AIMessageRole] = mapped_column(
        Enum(AIMessageRole, native_enum=False, length=16), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    structured_content_refs: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    provider: Mapped[str | None] = mapped_column(String(64))
    model: Mapped[str | None] = mapped_column(String(128))
    status: Mapped[AIMessageStatus] = mapped_column(
        Enum(AIMessageStatus, native_enum=False, length=16),
        default=AIMessageStatus.completed,
        index=True,
    )
    prompt_units: Mapped[int] = mapped_column(BigInteger, default=0)
    completion_units: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_micros: Mapped[int] = mapped_column(BigInteger, default=0)
    parent_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="SET NULL"), index=True
    )
    retry_of_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AICitation(Base):
    __tablename__ = "ai_citations"
    __table_args__ = (
        UniqueConstraint(
            "message_id", "source_type", "source_id", name="uq_ai_citation_message_source"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    message_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="CASCADE"), index=True
    )
    source_type: Mapped[str] = mapped_column(String(64))
    source_id: Mapped[str] = mapped_column(String(255))
    safe_excerpt: Mapped[str | None] = mapped_column(String(500))
    source_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIToolDefinition(Base):
    __tablename__ = "ai_tool_definitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(500))
    input_schema: Mapped[dict[str, Any]] = mapped_column(JSON)
    output_schema: Mapped[dict[str, Any]] = mapped_column(JSON)
    risk: Mapped[AIToolRisk] = mapped_column(
        Enum(AIToolRisk, native_enum=False, length=16), index=True
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    allows_autopilot: Mapped[bool] = mapped_column(Boolean, default=False)
    handler_key: Mapped[str] = mapped_column(String(96), unique=True)
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIToolProposal(Base):
    __tablename__ = "ai_tool_proposals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="SET NULL"), index=True
    )
    message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="SET NULL"), index=True
    )
    tool_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_tool_definitions.id", ondelete="RESTRICT"), index=True
    )
    tool_name: Mapped[str] = mapped_column(String(96), index=True)
    risk: Mapped[AIToolRisk] = mapped_column(
        Enum(AIToolRisk, native_enum=False, length=16), index=True
    )
    typed_input: Mapped[dict[str, Any]] = mapped_column(JSON)
    state: Mapped[AIToolState] = mapped_column(
        Enum(AIToolState, native_enum=False, length=16),
        default=AIToolState.proposed,
        index=True,
    )
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class AIToolExecution(Base):
    __tablename__ = "ai_tool_executions"
    __table_args__ = (
        CheckConstraint("state IN ('succeeded', 'failed')", name="ck_ai_execution_terminal_state"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    proposal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_tool_proposals.id", ondelete="RESTRICT"), unique=True, index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    pseudonymous_subject_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    tool_name: Mapped[str] = mapped_column(String(96), index=True)
    risk: Mapped[AIToolRisk] = mapped_column(Enum(AIToolRisk, native_enum=False, length=16))
    typed_input: Mapped[dict[str, Any]] = mapped_column(JSON)
    typed_output: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    state: Mapped[AIToolState] = mapped_column(
        Enum(AIToolState, native_enum=False, length=16), index=True
    )
    failure_code: Mapped[str | None] = mapped_column(String(96))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class AIMemory(Base):
    __tablename__ = "ai_memories"
    __table_args__ = (
        CheckConstraint(
            "encrypted_content IS NOT NULL OR structured_value IS NOT NULL",
            name="ck_ai_memory_has_value",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[AIMemoryKind] = mapped_column(
        Enum(AIMemoryKind, native_enum=False, length=16), index=True
    )
    encrypted_content: Mapped[str | None] = mapped_column(Text)
    structured_value: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    source_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="SET NULL"), index=True
    )
    consented_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    embedding_state: Mapped[AIEmbeddingState] = mapped_column(
        Enum(AIEmbeddingState, native_enum=False, length=16),
        default=AIEmbeddingState.disabled,
        index=True,
    )
    embedding_ref: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIMemoryEmbedding(Base):
    __tablename__ = "ai_memory_embeddings"
    __table_args__ = (
        CheckConstraint("dimension > 0", name="ck_ai_memory_embedding_positive_dimension"),
    )

    memory_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_memories.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    provider: Mapped[str] = mapped_column(String(64))
    model: Mapped[str] = mapped_column(String(128))
    dimension: Mapped[int] = mapped_column(Integer)
    vector_json: Mapped[list[float]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIUsageRecord(Base):
    __tablename__ = "ai_usage_records"
    __table_args__ = (
        CheckConstraint(
            "prompt_units >= 0 AND completion_units >= 0 AND cost_micros >= 0 AND latency_ms >= 0",
            name="ck_ai_usage_nonnegative_metrics",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    pseudonymous_subject_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    provider: Mapped[str] = mapped_column(String(64), index=True)
    model: Mapped[str] = mapped_column(String(128), index=True)
    capability: Mapped[AICapability] = mapped_column(
        Enum(AICapability, native_enum=False, length=24), index=True
    )
    prompt_units: Mapped[int] = mapped_column(BigInteger, default=0)
    completion_units: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_micros: Mapped[int] = mapped_column(BigInteger, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(24), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(96), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class AIJob(Base):
    __tablename__ = "ai_jobs"
    __table_args__ = (
        CheckConstraint("progress >= 0 AND progress <= 100", name="ck_ai_job_progress"),
        CheckConstraint(
            "retry_count >= 0 AND max_retries >= 0", name="ck_ai_job_nonnegative_retries"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    capability: Mapped[AICapability] = mapped_column(
        Enum(AICapability, native_enum=False, length=24), index=True
    )
    status: Mapped[AIJobStatus] = mapped_column(
        Enum(AIJobStatus, native_enum=False, length=24),
        default=AIJobStatus.queued,
        index=True,
    )
    typed_request: Mapped[dict[str, Any]] = mapped_column(JSON)
    output_refs: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    provider: Mapped[str] = mapped_column(String(64), index=True)
    model: Mapped[str] = mapped_column(String(128))
    provider_operation_id: Mapped[str | None] = mapped_column(String(255), index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=3)
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AIEvent(Base):
    __tablename__ = "ai_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(32))
    aggregate_id: Mapped[uuid.UUID] = mapped_column(index=True)
    event_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class PromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"
    __table_args__ = (
        UniqueConstraint(
            "template_key",
            "version",
            "locale",
            "capability",
            name="uq_ai_prompt_template_version",
        ),
        CheckConstraint("version > 0", name="ck_ai_prompt_template_positive_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    template_key: Mapped[str] = mapped_column(String(96), index=True)
    version: Mapped[int] = mapped_column(Integer)
    locale: Mapped[str] = mapped_column(String(16), index=True)
    capability: Mapped[AICapability] = mapped_column(
        Enum(AICapability, native_enum=False, length=24), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    policy_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    state: Mapped[PromptTemplateState] = mapped_column(
        Enum(PromptTemplateState, native_enum=False, length=16),
        default=PromptTemplateState.draft,
        index=True,
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    published_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AIExportRequest(Base):
    __tablename__ = "ai_export_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    scope: Mapped[str] = mapped_column(String(32), index=True)
    status: Mapped[str] = mapped_column(String(24), default="queued", index=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


@event.listens_for(AIUsageRecord, "before_update")
@event.listens_for(AIUsageRecord, "before_delete")
@event.listens_for(AIToolExecution, "before_update")
@event.listens_for(AIToolExecution, "before_delete")
def reject_ai_audit_mutation(*_: object) -> None:
    raise ValueError("AI usage and tool execution records are append-only")


@event.listens_for(PromptTemplate, "before_update")
@event.listens_for(PromptTemplate, "before_delete")
def reject_published_prompt_mutation(_: object, __: object, target: PromptTemplate) -> None:
    state_history = inspect(target).attrs.state.history
    prior_state = state_history.deleted[0] if state_history.deleted else target.state
    if prior_state == PromptTemplateState.published:
        raise ValueError("published prompt template versions are immutable")


Index(
    "ix_ai_conversations_user_updated",
    AIConversation.user_id,
    AIConversation.updated_at,
    AIConversation.id,
)
Index(
    "ix_ai_messages_conversation_created",
    AIMessage.conversation_id,
    AIMessage.created_at,
    AIMessage.id,
)
Index("ix_ai_memories_user_created", AIMemory.user_id, AIMemory.created_at, AIMemory.id)
Index(
    "ix_ai_memory_embeddings_user_updated",
    AIMemoryEmbedding.user_id,
    AIMemoryEmbedding.updated_at,
    AIMemoryEmbedding.memory_id,
)
Index(
    "ix_ai_usage_user_created",
    AIUsageRecord.user_id,
    AIUsageRecord.created_at,
    AIUsageRecord.id,
)
Index("ix_ai_jobs_user_created", AIJob.user_id, AIJob.created_at, AIJob.id)
Index("ix_ai_events_user_created", AIEvent.user_id, AIEvent.created_at, AIEvent.id)
