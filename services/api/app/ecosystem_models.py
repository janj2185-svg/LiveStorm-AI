"""Phase 1 ecosystem foundation: Personal AI agent, Knowledge Graph, Action Engine."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class IdentityPrivacyLevel(enum.StrEnum):
    public = "public"
    followers = "followers"
    connections = "connections"
    business = "business"
    private = "private"
    ai_only = "ai_only"


class KnowledgeNodeKind(enum.StrEnum):
    user = "user"
    person = "person"
    company = "company"
    project = "project"
    post = "post"
    video = "video"
    live = "live"
    message = "message"
    document = "document"
    course = "course"
    skill = "skill"
    product = "product"
    service = "service"
    community = "community"
    event = "event"
    agent = "agent"
    knowledge = "knowledge"
    action = "action"


class ActionPermissionLevel(enum.StrEnum):
    read = "READ"
    suggest = "SUGGEST"
    prepare = "PREPARE"
    request_confirmation = "REQUEST_CONFIRMATION"
    execute_allowed = "EXECUTE_ALLOWED"


class ActionState(enum.StrEnum):
    proposed = "proposed"
    awaiting_confirmation = "awaiting_confirmation"
    approved = "approved"
    rejected = "rejected"
    executing = "executing"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class MemoryTier(enum.StrEnum):
    short_term = "short_term"
    long_term = "long_term"
    preference = "preference"
    context_source = "context_source"


class PersonalAIAgent(Base):
    """One Personal AI identity per user — Command Center binding surface."""

    __tablename__ = "personal_ai_agents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    display_name: Mapped[str] = mapped_column(String(64), default="Sylora")
    locale: Mapped[str] = mapped_column(String(16), default="uk")
    status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    permissions: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    tool_allowlist: Mapped[list[str]] = mapped_column(JSON, default=list)
    context_sources: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PersonalAIActivity(Base):
    """Append-oriented activity log: what the AI did, why, with which data."""

    __tablename__ = "personal_ai_activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    agent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("personal_ai_agents.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(String(500))
    rationale: Mapped[str | None] = mapped_column(String(1000))
    data_used: Mapped[list[str]] = mapped_column(JSON, default=list)
    permission_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    action_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "kind", "external_id", name="uq_knowledge_node_ref"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[KnowledgeNodeKind] = mapped_column(
        Enum(KnowledgeNodeKind, native_enum=False, length=32), index=True
    )
    external_id: Mapped[str] = mapped_column(String(128))
    label: Mapped[str] = mapped_column(String(200))
    privacy_level: Mapped[IdentityPrivacyLevel] = mapped_column(
        Enum(IdentityPrivacyLevel, native_enum=False, length=24),
        default=IdentityPrivacyLevel.private,
        index=True,
    )
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    consent_required: Mapped[bool] = mapped_column(Boolean, default=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    source_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True
    )
    target_node_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), index=True
    )
    relation: Mapped[str] = mapped_column(String(64), index=True)
    privacy_level: Mapped[IdentityPrivacyLevel] = mapped_column(
        Enum(IdentityPrivacyLevel, native_enum=False, length=24),
        default=IdentityPrivacyLevel.private,
        index=True,
    )
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentAction(Base):
    """Universal Action Engine record with permission level + audit fields."""

    __tablename__ = "agent_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("personal_ai_agents.id", ondelete="SET NULL"), index=True
    )
    action_type: Mapped[str] = mapped_column(String(64), index=True)
    permission_level: Mapped[ActionPermissionLevel] = mapped_column(
        Enum(ActionPermissionLevel, native_enum=False, length=32), index=True
    )
    state: Mapped[ActionState] = mapped_column(
        Enum(ActionState, native_enum=False, length=32),
        default=ActionState.proposed,
        index=True,
    )
    input_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    confirmation_required: Mapped[bool] = mapped_column(Boolean, default=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


Index("ix_knowledge_nodes_owner_kind", KnowledgeNode.owner_user_id, KnowledgeNode.kind)
Index("ix_agent_actions_user_created", AgentAction.user_id, AgentAction.created_at)
Index(
    "ix_personal_ai_activities_user_created",
    PersonalAIActivity.user_id,
    PersonalAIActivity.created_at,
)
