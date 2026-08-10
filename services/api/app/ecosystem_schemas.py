from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.ai_schemas import StrictSchema, ORMStrictSchema, valid_locale
from app.ecosystem_models import (
    ActionPermissionLevel,
    ActionState,
    IdentityPrivacyLevel,
    KnowledgeNodeKind,
)
from pydantic import field_validator


class PersonalAIAgentResponse(ORMStrictSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    locale: str
    status: str
    permissions: dict[str, bool]
    tool_allowlist: list[str]
    context_sources: list[str]
    updated_at: datetime


class PersonalAIAgentPatch(StrictSchema):
    display_name: str | None = Field(default=None, min_length=1, max_length=64)
    locale: str | None = None
    permissions: dict[str, bool] | None = None
    tool_allowlist: list[str] | None = Field(default=None, max_length=64)
    context_sources: list[str] | None = Field(default=None, max_length=64)

    _locale = field_validator("locale")(lambda value: valid_locale(value) if value else value)


class PersonalAIActivityResponse(ORMStrictSchema):
    id: uuid.UUID
    event_type: str
    summary: str
    rationale: str | None
    data_used: list[str]
    permission_snapshot: dict[str, Any]
    conversation_id: uuid.UUID | None
    action_id: uuid.UUID | None
    created_at: datetime


class PersonalAIDashboardResponse(StrictSchema):
    agent: PersonalAIAgentResponse
    what_ai_knows: list[str]
    access_scopes: dict[str, bool]
    recent_activity: list[PersonalAIActivityResponse]
    memory_enabled: bool
    personalization_enabled: bool
    emotion: dict[str, Any] | None = None


class KnowledgeNodeCreate(StrictSchema):
    kind: KnowledgeNodeKind
    external_id: str = Field(min_length=1, max_length=128)
    label: str = Field(min_length=1, max_length=200)
    privacy_level: IdentityPrivacyLevel = IdentityPrivacyLevel.private
    properties: dict[str, Any] = Field(default_factory=dict)


class KnowledgeNodeResponse(ORMStrictSchema):
    id: uuid.UUID
    kind: KnowledgeNodeKind
    external_id: str
    label: str
    privacy_level: IdentityPrivacyLevel
    properties: dict[str, Any]
    created_at: datetime


class KnowledgeEdgeCreate(StrictSchema):
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    relation: str = Field(min_length=1, max_length=64)
    privacy_level: IdentityPrivacyLevel = IdentityPrivacyLevel.private
    properties: dict[str, Any] = Field(default_factory=dict)


class KnowledgeEdgeResponse(ORMStrictSchema):
    id: uuid.UUID
    source_node_id: uuid.UUID
    target_node_id: uuid.UUID
    relation: str
    privacy_level: IdentityPrivacyLevel
    properties: dict[str, Any]
    created_at: datetime


class AgentActionCreate(StrictSchema):
    action_type: str = Field(min_length=2, max_length=64)
    permission_level: ActionPermissionLevel = ActionPermissionLevel.suggest
    input_payload: dict[str, Any] = Field(default_factory=dict)


class AgentActionResponse(ORMStrictSchema):
    id: uuid.UUID
    action_type: str
    permission_level: ActionPermissionLevel
    state: ActionState
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    confirmation_required: bool
    confirmed_at: datetime | None
    error_code: str | None
    created_at: datetime
    completed_at: datetime | None


class IdentityPrivacyResponse(StrictSchema):
    profile_visibility: str
    identity_privacy_level: IdentityPrivacyLevel
    levels: list[str]


class IdentityPrivacyPatch(StrictSchema):
    identity_privacy_level: IdentityPrivacyLevel
