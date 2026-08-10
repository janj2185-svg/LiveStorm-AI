from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models import ActionLevel, ActionState, MemoryTier, NodeKind, PrivacyLevel


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IdentityPatch(BaseModel):
    username: str | None = Field(default=None, max_length=64)
    display_name: str | None = Field(default=None, max_length=120)
    bio: str | None = None
    privacy_level: PrivacyLevel | None = None
    skills: list[str] | None = None
    interests: list[str] | None = None
    portfolio: list[dict[str, Any]] | None = None
    education: list[dict[str, Any]] | None = None
    achievements: list[dict[str, Any]] | None = None


class IdentityResponse(ORMModel):
    user_id: str
    username: str | None
    display_name: str | None
    bio: str | None
    privacy_level: PrivacyLevel
    skills: list[Any]
    interests: list[Any]
    portfolio: list[Any]
    education: list[Any]
    achievements: list[Any]
    updated_at: datetime | None = None


class AgentPatch(BaseModel):
    display_name: str | None = Field(default=None, max_length=64)
    locale: str | None = None
    permissions: dict[str, bool] | None = None
    tool_allowlist: list[str] | None = None
    context_sources: list[str] | None = None


class AgentResponse(ORMModel):
    id: str
    user_id: str
    display_name: str
    locale: str
    permissions: dict[str, Any]
    tool_allowlist: list[Any]
    context_sources: list[Any]


class MemoryCreate(BaseModel):
    tier: MemoryTier
    content: str = Field(min_length=1, max_length=4000)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class MemoryResponse(ORMModel):
    id: str
    tier: MemoryTier
    content: str
    metadata_json: dict[str, Any]
    created_at: datetime


class ActivityResponse(ORMModel):
    id: str
    event_type: str
    summary: str
    rationale: str | None
    data_used: list[Any]
    permission_snapshot: dict[str, Any]
    created_at: datetime


class ChatRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    locale: str | None = "uk"


class ChatResponse(BaseModel):
    reply: str
    emotion: dict[str, Any]
    provider: str
    message_id: str


class DashboardResponse(BaseModel):
    agent: AgentResponse
    what_ai_knows: list[str]
    access_scopes: dict[str, Any]
    recent_activity: list[ActivityResponse]
    memory_counts: dict[str, int]
    emotion: dict[str, Any]


class NodeCreate(BaseModel):
    kind: NodeKind
    external_id: str = Field(min_length=1, max_length=128)
    label: str = Field(min_length=1, max_length=200)
    privacy_level: PrivacyLevel = PrivacyLevel.private
    properties: dict[str, Any] = Field(default_factory=dict)


class NodeResponse(ORMModel):
    id: str
    kind: NodeKind
    external_id: str
    label: str
    privacy_level: PrivacyLevel
    properties: dict[str, Any]
    created_at: datetime


class EdgeCreate(BaseModel):
    source_node_id: str
    target_node_id: str
    relation: str = Field(min_length=1, max_length=64)
    privacy_level: PrivacyLevel = PrivacyLevel.private
    properties: dict[str, Any] = Field(default_factory=dict)


class EdgeResponse(ORMModel):
    id: str
    source_node_id: str
    target_node_id: str
    relation: str
    privacy_level: PrivacyLevel
    properties: dict[str, Any]
    created_at: datetime


class ActionCreate(BaseModel):
    action_type: str = Field(min_length=2, max_length=64)
    permission_level: ActionLevel = ActionLevel.suggest
    input_payload: dict[str, Any] = Field(default_factory=dict)


class ActionResponse(ORMModel):
    id: str
    action_type: str
    permission_level: ActionLevel
    state: ActionState
    input_payload: dict[str, Any]
    output_payload: dict[str, Any]
    confirmation_required: bool
    created_at: datetime
    completed_at: datetime | None


class MarketplaceAgentResponse(ORMModel):
    id: str
    slug: str
    name: str
    description: str
    publisher: str
    category: str
    pricing: str
    price_cents: int
    capabilities: list[Any]
    tools: list[Any]
    permissions_required: list[Any]
    version: str
    verified: bool


class InstallAgentRequest(BaseModel):
    granted_permissions: list[str] = Field(default_factory=list)


class InstalledAgentResponse(ORMModel):
    id: str
    agent_id: str
    granted_permissions: list[Any]
    created_at: datetime | None = None


class DeveloperAppCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ""
    scopes: list[str] = Field(default_factory=lambda: ["identity:read"])
    webhook_url: str | None = None
    sandbox: bool = True


class DeveloperAppResponse(BaseModel):
    id: str
    name: str
    description: str
    scopes: list[Any]
    api_key_prefix: str
    api_key: str | None = None
    webhook_url: str | None
    sandbox: bool
    created_at: datetime
