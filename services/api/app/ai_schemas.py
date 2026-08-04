from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Any, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.ai_models import (
    AICapability,
    AIConversationMode,
    AIConversationPurpose,
    AIEmbeddingState,
    AIJobStatus,
    AIMemoryKind,
    AIMessageRole,
    AIMessageStatus,
    AIToolRisk,
    AIToolState,
    PromptTemplateState,
)
from app.social_models import PostVisibility
from app.social_schemas import validate_plain_text

LOCALE_PATTERN = re.compile(r"^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$")
OBJECT_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$")
PROVIDER_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{1,63}$")
TOOL_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{1,95}$")


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


def valid_locale(value: str) -> str:
    if not LOCALE_PATTERN.fullmatch(value):
        raise ValueError("locale must be a valid bounded BCP-47 language tag")
    return value


def valid_object_key(value: str) -> str:
    if (
        not OBJECT_KEY_PATTERN.fullmatch(value)
        or value.startswith("/")
        or ".." in value.split("/")
        or "//" in value
    ):
        raise ValueError("object_key must be a safe relative S3 object key")
    return value


def validate_safe_json(value: Any, depth: int = 0) -> Any:
    if depth > 5:
        raise ValueError("JSON nesting is too deep")
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        if len(value) > 4000:
            raise ValueError("JSON string is too long")
        return validate_plain_text(value)
    if isinstance(value, list):
        if len(value) > 100:
            raise ValueError("JSON list is too long")
        return [validate_safe_json(item, depth + 1) for item in value]
    if isinstance(value, dict):
        if len(value) > 100:
            raise ValueError("JSON object has too many keys")
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            normalized = str(key)
            if not normalized or len(normalized) > 96:
                raise ValueError("JSON object key is invalid")
            cleaned[normalized] = validate_safe_json(item, depth + 1)
        return cleaned
    raise ValueError("value must contain only bounded JSON data")


class AISettingsResponse(ORMStrictSchema):
    user_id: uuid.UUID
    consent_granted: bool
    consented_at: datetime | None
    memory_enabled: bool
    analytics_context_enabled: bool
    personalization_enabled: bool
    preferred_locale: str
    monthly_spend_limit_micros: int | None
    monthly_token_limit: int | None
    capability_flags: dict[str, bool]
    autopilot_low_risk_tools: list[str]
    updated_at: datetime


class AISettingsPatch(StrictSchema):
    consent_granted: bool | None = None
    memory_enabled: bool | None = None
    analytics_context_enabled: bool | None = None
    personalization_enabled: bool | None = None
    preferred_locale: str | None = None
    monthly_spend_limit_micros: int | None = Field(default=None, ge=0)
    monthly_token_limit: int | None = Field(default=None, ge=0)
    capability_flags: dict[AICapability, bool] | None = Field(default=None, max_length=16)
    autopilot_low_risk_tools: list[str] | None = Field(default=None, max_length=32)

    _locale = field_validator("preferred_locale")(
        lambda value: valid_locale(value) if value is not None else value
    )

    @field_validator("autopilot_low_risk_tools")
    @classmethod
    def valid_tool_names(cls, value: list[str] | None) -> list[str] | None:
        if value is not None and any(not TOOL_NAME_PATTERN.fullmatch(item) for item in value):
            raise ValueError("autopilot tool names are invalid")
        return sorted(set(value)) if value is not None else value

    @model_validator(mode="after")
    def required_settings_cannot_be_null(self) -> AISettingsPatch:
        nullable_limits = {"monthly_spend_limit_micros", "monthly_token_limit"}
        for field_name in self.model_fields_set - nullable_limits:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class AIConversationCreate(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    mode: AIConversationMode = AIConversationMode.copilot
    purpose: AIConversationPurpose = AIConversationPurpose.general
    locale: str | None = None

    _plain_title = field_validator("title")(
        lambda value: validate_plain_text(value) if value else value
    )
    _locale = field_validator("locale")(lambda value: valid_locale(value) if value else value)


class AIConversationPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    mode: AIConversationMode | None = None
    purpose: AIConversationPurpose | None = None
    locale: str | None = None

    _plain_title = field_validator("title")(
        lambda value: validate_plain_text(value) if value else value
    )
    _locale = field_validator("locale")(lambda value: valid_locale(value) if value else value)

    @model_validator(mode="after")
    def mode_and_locale_cannot_be_null(self) -> AIConversationPatch:
        for field_name in self.model_fields_set & {"mode", "purpose", "locale"}:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class AIConversationResponse(ORMStrictSchema):
    id: uuid.UUID
    title: str | None
    mode: AIConversationMode
    purpose: AIConversationPurpose
    locale: str
    created_at: datetime
    updated_at: datetime


class CursorPage(StrictSchema):
    next_cursor: str | None


class AIConversationPage(CursorPage):
    items: list[AIConversationResponse]


class AICitationResponse(ORMStrictSchema):
    id: uuid.UUID
    source_type: str
    source_id: str
    safe_excerpt: str | None
    source_hash: str


class AIToolProposalResponse(ORMStrictSchema):
    id: uuid.UUID
    conversation_id: uuid.UUID | None
    message_id: uuid.UUID | None
    tool_name: str
    risk: AIToolRisk
    typed_input: dict[str, Any]
    state: AIToolState
    approved_at: datetime | None
    rejected_at: datetime | None
    executed_at: datetime | None
    created_at: datetime


class AIMessageResponse(ORMStrictSchema):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: AIMessageRole
    content: str
    structured_content_refs: list[dict[str, Any]]
    provider: str | None
    model: str | None
    status: AIMessageStatus
    prompt_units: int
    completion_units: int
    cost_micros: int
    parent_message_id: uuid.UUID | None
    retry_of_message_id: uuid.UUID | None
    created_at: datetime
    completed_at: datetime | None
    citations: list[AICitationResponse] = Field(default_factory=list)
    proposals: list[AIToolProposalResponse] = Field(default_factory=list)


class AIMessagePage(CursorPage):
    items: list[AIMessageResponse]


class AIContentReference(StrictSchema):
    object_key: str
    content_type: Literal["image/png", "image/jpeg", "image/webp", "audio/mpeg", "audio/wav"]
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    byte_size: int = Field(gt=0, le=50_000_000)

    _object_key = field_validator("object_key")(valid_object_key)


class AISendMessageRequest(StrictSchema):
    content: str = Field(min_length=1, max_length=32_000)
    content_refs: list[AIContentReference] = Field(default_factory=list, max_length=8)
    parent_message_id: uuid.UUID | None = None
    retry_of_message_id: uuid.UUID | None = None

    _plain_content = field_validator("content")(validate_plain_text)


class AIMemoryCreate(StrictSchema):
    kind: AIMemoryKind
    content: str | None = Field(default=None, min_length=1, max_length=8000)
    structured_value: dict[str, Any] | None = None
    source_message_id: uuid.UUID | None = None
    expires_at: datetime | None = None

    _plain_content = field_validator("content")(
        lambda value: validate_plain_text(value) if value else value
    )
    _safe_structured = field_validator("structured_value")(
        lambda value: validate_safe_json(value) if value is not None else value
    )

    @model_validator(mode="after")
    def exactly_one_value(self) -> AIMemoryCreate:
        if (self.content is None) == (self.structured_value is None):
            raise ValueError("provide exactly one of content or structured_value")
        if self.expires_at is not None and self.expires_at.tzinfo is None:
            raise ValueError("expires_at must include a timezone")
        return self


class AIMemoryPatch(StrictSchema):
    kind: AIMemoryKind | None = None
    content: str | None = Field(default=None, min_length=1, max_length=8000)
    structured_value: dict[str, Any] | None = None
    expires_at: datetime | None = None

    _plain_content = field_validator("content")(
        lambda value: validate_plain_text(value) if value else value
    )
    _safe_structured = field_validator("structured_value")(
        lambda value: validate_safe_json(value) if value is not None else value
    )

    @model_validator(mode="after")
    def valid_patch(self) -> AIMemoryPatch:
        if "kind" in self.model_fields_set and self.kind is None:
            raise ValueError("kind cannot be null")
        if self.content is not None and self.structured_value is not None:
            raise ValueError("content and structured_value cannot both be set")
        if self.expires_at is not None and self.expires_at.tzinfo is None:
            raise ValueError("expires_at must include a timezone")
        return self


class AIMemoryResponse(StrictSchema):
    id: uuid.UUID
    kind: AIMemoryKind
    content: str | None
    structured_value: dict[str, Any] | None
    source_message_id: uuid.UUID | None
    consented_at: datetime
    expires_at: datetime | None
    embedding_state: AIEmbeddingState
    embedding_ref: str | None
    created_at: datetime
    updated_at: datetime


class AIMemoryExport(StrictSchema):
    exported_at: datetime
    items: list[AIMemoryResponse]


class TranslationRequest(StrictSchema):
    text: str = Field(min_length=1, max_length=20_000)
    source_language: str = Field(min_length=2, max_length=16)
    target_language: str = Field(min_length=2, max_length=16)

    _plain_text = field_validator("text")(validate_plain_text)
    _source = field_validator("source_language")(valid_locale)
    _target = field_validator("target_language")(valid_locale)

    @model_validator(mode="after")
    def languages_differ(self) -> TranslationRequest:
        if self.source_language.casefold() == self.target_language.casefold():
            raise ValueError("source and target language must differ")
        return self


class TranslationResponse(StrictSchema):
    text: str
    source_language: str
    target_language: str
    provider: str
    model: str
    prompt_units: int
    completion_units: int
    cost_micros: int


class TranscriptionBase64Request(StrictSchema):
    audio_base64: str = Field(min_length=1, max_length=14_000_000)
    filename: str = Field(default="caption.webm", pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
    content_type: str = Field(
        default="audio/webm",
        pattern=r"^(?:audio|video)/[A-Za-z0-9.+-]+$",
    )
    language: str | None = None
    prompt: str | None = Field(default=None, min_length=1, max_length=1000)

    _language = field_validator("language")(lambda value: valid_locale(value) if value else value)
    _prompt = field_validator("prompt")(
        lambda value: validate_plain_text(value) if value else value
    )


class TranscriptionResponse(StrictSchema):
    text: str
    language: str | None
    duration_seconds: float | None
    provider: str
    model: str
    prompt_units: int
    completion_units: int
    cost_micros: int


class ModerationRequest(StrictSchema):
    text: str = Field(min_length=1, max_length=20_000)

    _plain_text = field_validator("text")(validate_plain_text)


class ModerationResponse(StrictSchema):
    recommendation: Literal["allow", "review", "block"]
    confidence: float = Field(ge=0, le=1)
    categories: dict[str, float]
    provider: str
    model: str
    non_binding: Literal[True] = True


class ImageJobRequest(StrictSchema):
    capability: Literal[AICapability.image]
    prompt: str = Field(min_length=1, max_length=8000)
    size: Literal["256x256", "512x512", "1024x1024", "1024x1792", "1792x1024"] = "1024x1024"
    count: int = Field(default=1, ge=1, le=4)

    _plain_prompt = field_validator("prompt")(validate_plain_text)


class VideoJobRequest(StrictSchema):
    capability: Literal[AICapability.video]
    prompt: str = Field(min_length=1, max_length=8000)
    duration_seconds: int = Field(default=5, ge=1, le=120)
    aspect_ratio: Literal["1:1", "4:3", "3:4", "16:9", "9:16"] = "16:9"

    _plain_prompt = field_validator("prompt")(validate_plain_text)


class MusicJobRequest(StrictSchema):
    capability: Literal[AICapability.music]
    prompt: str = Field(min_length=1, max_length=8000)
    duration_seconds: int = Field(default=30, ge=1, le=600)
    instrumental: bool = False

    _plain_prompt = field_validator("prompt")(validate_plain_text)


class VoiceJobRequest(StrictSchema):
    capability: Literal[AICapability.voice]
    text: str = Field(min_length=1, max_length=20_000)
    voice: str = Field(min_length=1, max_length=64)
    output_format: Literal["mp3", "wav"] = "mp3"

    _plain_text = field_validator("text")(validate_plain_text)


class AvatarJobRequest(StrictSchema):
    capability: Literal[AICapability.avatar]
    prompt: str = Field(min_length=1, max_length=8000)
    source_object_key: str | None = None

    _plain_prompt = field_validator("prompt")(validate_plain_text)
    _object_key = field_validator("source_object_key")(
        lambda value: valid_object_key(value) if value else value
    )


AIJobCreate = Annotated[
    ImageJobRequest | VideoJobRequest | MusicJobRequest | VoiceJobRequest | AvatarJobRequest,
    Field(discriminator="capability"),
]


class AIOutputReference(StrictSchema):
    object_key: str
    content_type: str = Field(pattern=r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
    byte_size: int = Field(gt=0, le=1_000_000_000)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    metadata: dict[str, Any] = Field(default_factory=dict)

    _object_key = field_validator("object_key")(valid_object_key)
    _safe_metadata = field_validator("metadata")(validate_safe_json)


class AIJobResponse(ORMStrictSchema):
    id: uuid.UUID
    capability: AICapability
    status: AIJobStatus
    typed_request: dict[str, Any]
    output_refs: list[dict[str, Any]]
    provider: str
    model: str
    provider_operation_id: str | None
    progress: int
    retry_count: int
    max_retries: int
    failure_code: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None


class AIJobOutputPlayback(StrictSchema):
    playback_url: str
    content_type: str = Field(pattern=r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
    expires_in_seconds: int = Field(gt=0)


class AIJobPage(CursorPage):
    items: list[AIJobResponse]


class AIUsageResponse(ORMStrictSchema):
    id: uuid.UUID
    provider: str
    model: str
    capability: AICapability
    prompt_units: int
    completion_units: int
    cost_micros: int
    latency_ms: int
    status: str
    failure_code: str | None
    created_at: datetime


class AIUsagePage(CursorPage):
    items: list[AIUsageResponse]


class AIUsageSummary(StrictSchema):
    period_start: datetime
    prompt_units: int
    completion_units: int
    total_units: int
    cost_micros: int
    monthly_token_limit: int | None
    monthly_spend_limit_micros: int | None


class ProviderStatusItem(StrictSchema):
    name: str
    available_capabilities: list[AICapability]


class ProviderStatusResponse(StrictSchema):
    capabilities: dict[AICapability, bool]
    providers: list[ProviderStatusItem]


class AuraPresenceResponse(StrictSchema):
    emotion: Literal[
        "idle",
        "greeting",
        "listening",
        "thinking",
        "speaking",
        "amused",
        "focused",
        "delighted",
        "thoughtful",
        "supportive",
    ]
    mood_label: str
    personality: str
    voice_ready: bool
    voice_input_ready: bool
    voice_output_ready: bool
    transcription_ready: bool
    avatar_ready: bool
    avatar_job_status: str | None = None
    memory_count: int
    context_summary: str
    recommendations: list[str] = Field(default_factory=list)


class PricingEntry(StrictSchema):
    prompt_micros_per_million: int = Field(default=0, ge=0)
    completion_micros_per_million: int = Field(default=0, ge=0)
    unit_micros: int = Field(default=0, ge=0)


class ProviderConfigurationCreate(StrictSchema):
    name: str
    base_url: str = Field(min_length=8, max_length=2048)
    api_credential: str = Field(min_length=1, max_length=8192)
    enabled: bool = False
    capabilities: list[AICapability] = Field(min_length=1, max_length=16)
    model_mapping: dict[AICapability, str] = Field(min_length=1, max_length=16)
    pricing_config: dict[str, PricingEntry] = Field(default_factory=dict, max_length=100)

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        if not PROVIDER_NAME_PATTERN.fullmatch(value):
            raise ValueError("provider name must be lowercase and URL-safe")
        return value

    @field_validator("base_url")
    @classmethod
    def valid_base_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("base_url must be an absolute HTTP(S) URL")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("base_url cannot contain credentials, a query, or a fragment")
        return value.rstrip("/")

    @model_validator(mode="after")
    def models_cover_capabilities(self) -> ProviderConfigurationCreate:
        missing = set(self.capabilities) - set(self.model_mapping)
        if missing:
            raise ValueError("model_mapping must cover every configured capability")
        return self


class ProviderConfigurationPatch(StrictSchema):
    base_url: str | None = Field(default=None, min_length=8, max_length=2048)
    api_credential: str | None = Field(default=None, min_length=1, max_length=8192)
    enabled: bool | None = None
    capabilities: list[AICapability] | None = Field(default=None, min_length=1, max_length=16)
    model_mapping: dict[AICapability, str] | None = Field(default=None, min_length=1, max_length=16)
    pricing_config: dict[str, PricingEntry] | None = Field(default=None, max_length=100)

    _base_url = field_validator("base_url")(
        lambda value: ProviderConfigurationCreate.valid_base_url(value) if value else value
    )

    @model_validator(mode="after")
    def fields_cannot_be_null(self) -> ProviderConfigurationPatch:
        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class ProviderConfigurationResponse(ORMStrictSchema):
    id: uuid.UUID
    name: str
    base_url: str
    enabled: bool
    capabilities: list[AICapability]
    model_mapping: dict[str, str]
    pricing_config: dict[str, Any]
    credential_configured: bool = True
    created_at: datetime
    updated_at: datetime


class PromptTemplateCreate(StrictSchema):
    template_key: str = Field(pattern=r"^[a-z][a-z0-9._-]{1,95}$")
    version: int = Field(gt=0)
    locale: str
    capability: AICapability
    content: str = Field(min_length=1, max_length=32_000)
    policy_metadata: dict[str, Any] = Field(default_factory=dict)

    _locale = field_validator("locale")(valid_locale)
    _content = field_validator("content")(validate_plain_text)
    _metadata = field_validator("policy_metadata")(validate_safe_json)


class PromptTemplateResponse(ORMStrictSchema):
    id: uuid.UUID
    template_key: str
    version: int
    locale: str
    capability: AICapability
    content: str
    policy_metadata: dict[str, Any]
    state: PromptTemplateState
    created_at: datetime
    published_at: datetime | None


class AIEventResponse(StrictSchema):
    event: str
    cursor: str
    aggregate_type: str
    aggregate_id: uuid.UUID
    payload: dict[str, Any]
    occurred_at: datetime


class ProfileToolInput(StrictSchema):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=2000)
    locale: str | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    _display = field_validator("display_name")(
        lambda value: validate_plain_text(value) if value else value
    )
    _bio = field_validator("bio")(lambda value: validate_plain_text(value) if value else value)
    _locale = field_validator("locale")(lambda value: valid_locale(value) if value else value)

    @model_validator(mode="after")
    def not_empty(self) -> ProfileToolInput:
        if not self.model_fields_set:
            raise ValueError("at least one profile field is required")
        for field_name in self.model_fields_set - {"bio"}:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class SettingsToolInput(StrictSchema):
    product_emails: bool | None = None
    marketing_emails: bool | None = None
    security_emails: bool | None = None
    profile_visibility: Literal["private", "public"] | None = None

    @model_validator(mode="after")
    def not_empty(self) -> SettingsToolInput:
        if not self.model_fields_set:
            raise ValueError("at least one settings field is required")
        if any(getattr(self, field_name) is None for field_name in self.model_fields_set):
            raise ValueError("settings fields cannot be null")
        return self


class DraftPostToolInput(StrictSchema):
    body: str = Field(min_length=1, max_length=20_000)
    visibility: PostVisibility = PostVisibility.public
    category: str | None = Field(default=None, pattern=r"^[a-z0-9][a-z0-9_-]{1,63}$")

    _body = field_validator("body")(validate_plain_text)


class MarkNotificationReadToolInput(StrictSchema):
    notification_id: uuid.UUID


class ScheduleExportToolInput(StrictSchema):
    scope: Literal["ai_memory", "account_data"] = "account_data"


class ToolActionResponse(StrictSchema):
    proposal: AIToolProposalResponse
    execution_id: uuid.UUID | None = None
    output: dict[str, Any] | None = None
