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
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class PrivacyLevel(str, enum.Enum):
    public = "public"
    followers = "followers"
    connections = "connections"
    business = "business"
    private = "private"
    ai_only = "ai_only"


class MemoryTier(str, enum.Enum):
    short_term = "short_term"
    long_term = "long_term"
    preference = "preference"
    context_source = "context_source"


class ActionLevel(str, enum.Enum):
    read = "READ"
    suggest = "SUGGEST"
    prepare = "PREPARE"
    request_confirmation = "REQUEST_CONFIRMATION"
    execute_allowed = "EXECUTE_ALLOWED"


class ActionState(str, enum.Enum):
    proposed = "proposed"
    awaiting_confirmation = "awaiting_confirmation"
    approved = "approved"
    rejected = "rejected"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class NodeKind(str, enum.Enum):
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


class IdentityProfile(Base):
    __tablename__ = "identity_profiles"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str | None] = mapped_column(String(64), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    bio: Mapped[str | None] = mapped_column(Text)
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel, native_enum=False), default=PrivacyLevel.private
    )
    skills: Mapped[list[Any]] = mapped_column(JSON, default=list)
    interests: Mapped[list[Any]] = mapped_column(JSON, default=list)
    portfolio: Mapped[list[Any]] = mapped_column(JSON, default=list)
    education: Mapped[list[Any]] = mapped_column(JSON, default=list)
    achievements: Mapped[list[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PersonalAIAgent(Base):
    __tablename__ = "personal_ai_agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(64), default="Sylora")
    locale: Mapped[str] = mapped_column(String(16), default="uk")
    permissions: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    tool_allowlist: Mapped[list[Any]] = mapped_column(JSON, default=list)
    context_sources: Mapped[list[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AIMemoryItem(Base):
    __tablename__ = "ai_memory_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    tier: Mapped[MemoryTier] = mapped_column(Enum(MemoryTier, native_enum=False), index=True)
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIActivity(Base):
    __tablename__ = "ai_activities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    agent_id: Mapped[str | None] = mapped_column(String(36), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    summary: Mapped[str] = mapped_column(String(500))
    rationale: Mapped[str | None] = mapped_column(String(1000))
    data_used: Mapped[list[Any]] = mapped_column(JSON, default=list)
    permission_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"
    __table_args__ = (UniqueConstraint("owner_user_id", "kind", "external_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String(64), index=True)
    kind: Mapped[NodeKind] = mapped_column(Enum(NodeKind, native_enum=False), index=True)
    external_id: Mapped[str] = mapped_column(String(128))
    label: Mapped[str] = mapped_column(String(200))
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel, native_enum=False), default=PrivacyLevel.private
    )
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String(64), index=True)
    source_node_id: Mapped[str] = mapped_column(String(36), index=True)
    target_node_id: Mapped[str] = mapped_column(String(36), index=True)
    relation: Mapped[str] = mapped_column(String(64), index=True)
    privacy_level: Mapped[PrivacyLevel] = mapped_column(
        Enum(PrivacyLevel, native_enum=False), default=PrivacyLevel.private
    )
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AgentAction(Base):
    __tablename__ = "agent_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    agent_id: Mapped[str | None] = mapped_column(String(36), index=True)
    action_type: Mapped[str] = mapped_column(String(64), index=True)
    permission_level: Mapped[ActionLevel] = mapped_column(Enum(ActionLevel, native_enum=False))
    state: Mapped[ActionState] = mapped_column(
        Enum(ActionState, native_enum=False), default=ActionState.proposed
    )
    input_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    confirmation_required: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class MarketplaceAgent(Base):
    __tablename__ = "marketplace_agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    publisher: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(64), index=True)
    pricing: Mapped[str] = mapped_column(String(32), default="free")
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    capabilities: Mapped[list[Any]] = mapped_column(JSON, default=list)
    tools: Mapped[list[Any]] = mapped_column(JSON, default=list)
    permissions_required: Mapped[list[Any]] = mapped_column(JSON, default=list)
    version: Mapped[str] = mapped_column(String(32), default="0.1.0")
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    manifest: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InstalledAgent(Base):
    __tablename__ = "installed_agents"
    __table_args__ = (UniqueConstraint("user_id", "agent_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    agent_id: Mapped[str] = mapped_column(String(36), index=True)
    granted_permissions: Mapped[list[Any]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeveloperApplication(Base):
    __tablename__ = "developer_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_user_id: Mapped[str] = mapped_column(String(64), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    scopes: Mapped[list[Any]] = mapped_column(JSON, default=list)
    api_key_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    api_key_prefix: Mapped[str] = mapped_column(String(16))
    webhook_url: Mapped[str | None] = mapped_column(String(500))
    sandbox: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
