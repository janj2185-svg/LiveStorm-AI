from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, Literal
from urllib.parse import urlparse

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)

from app.ai_schemas import valid_locale, validate_safe_json
from app.live_models import (
    GameState,
    IntegrationPlatform,
    IntegrationState,
    LiveActionState,
    LiveActionType,
    LiveAIMode,
    LiveCapability,
    LiveDestinationState,
    LiveGuestInviteStatus,
    LiveGuestMediaStatus,
    LiveGuestRole,
    LiveModerationMode,
    LiveNormalizedEventType,
    LiveReplayStatus,
    LiveRuleRisk,
    LiveSessionState,
    LiveTurnStatus,
    ModerationDisposition,
)
from app.live_rules import validate_condition_dsl
from app.social_schemas import validate_plain_text

REFERENCE_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._:/-]{1,254}$")
SCOPE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$")
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,254}$")
OBJECT_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._=/+-]{0,1023}$")


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


def safe_text(value: str) -> str:
    return validate_plain_text(value.strip())


def safe_json_object(value: dict[str, Any]) -> dict[str, Any]:
    result = validate_safe_json(value)
    if not isinstance(result, dict):
        raise ValueError("value must be a JSON object")
    return result


def safe_object_key(value: str) -> str:
    stripped = value.strip()
    if not OBJECT_KEY_PATTERN.fullmatch(stripped) or "//" in stripped or "/../" in f"/{stripped}/":
        raise ValueError("object key must be a relative S3 object key")
    return stripped


class PluginManifestInput(StrictSchema):
    manifest_id: str = Field(min_length=2, max_length=128, pattern=r"^[A-Za-z0-9._-]+$")
    schema_version: Literal["1.0"]
    callback_url: str = Field(max_length=2048)
    webhook_url: str = Field(max_length=2048)
    oauth_reference: str | None = Field(default=None, max_length=255)
    secret_reference: str | None = Field(default=None, max_length=255)
    declared_capabilities: list[LiveCapability] = Field(min_length=1, max_length=32)
    signing_key_id: str = Field(min_length=1, max_length=128)
    signature: str = Field(min_length=40, max_length=1024)

    @field_validator("callback_url", "webhook_url")
    @classmethod
    def https_endpoint(cls, value: str) -> str:
        parsed = urlparse(value)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.fragment
        ):
            raise ValueError("plugin endpoints must be credential-free HTTPS URLs")
        return value

    @field_validator("oauth_reference", "secret_reference")
    @classmethod
    def valid_reference(cls, value: str | None) -> str | None:
        if value is not None and not REFERENCE_PATTERN.fullmatch(value):
            raise ValueError("plugin secret references are invalid")
        return value


class IntegrationConnectRequest(StrictSchema):
    platform: IntegrationPlatform
    workspace_id: uuid.UUID | None = None
    access_credential: SecretStr | None = Field(default=None, min_length=1, max_length=8192)
    refresh_credential: SecretStr | None = Field(default=None, min_length=1, max_length=8192)
    connection_secret: SecretStr | None = Field(default=None, min_length=1, max_length=8192)
    token_expires_at: datetime | None = None
    scopes: list[str] = Field(default_factory=list, max_length=100)
    external_account_id: str | None = Field(default=None, max_length=255)
    external_channel_id: str | None = Field(default=None, max_length=255)
    requested_capabilities: list[LiveCapability] = Field(default_factory=list, max_length=32)
    endpoint_url: str | None = Field(default=None, max_length=2048)
    guild_id: str | None = Field(default=None, max_length=255)
    bot_application_id: str | None = Field(default=None, max_length=255)
    plugin_manifest: PluginManifestInput | None = None

    @field_validator("scopes")
    @classmethod
    def valid_scopes(cls, value: list[str]) -> list[str]:
        if any(not SCOPE_PATTERN.fullmatch(item) for item in value):
            raise ValueError("integration scopes are invalid")
        return sorted(set(value))

    @field_validator("external_account_id", "external_channel_id", "guild_id", "bot_application_id")
    @classmethod
    def valid_external_ids(cls, value: str | None) -> str | None:
        if value is not None and not ID_PATTERN.fullmatch(value):
            raise ValueError("external identifier is invalid")
        return value

    @model_validator(mode="after")
    def platform_configuration(self) -> IntegrationConnectRequest:
        if self.platform == IntegrationPlatform.obs and not self.endpoint_url:
            raise ValueError("OBS connections require an approved WebSocket endpoint")
        if self.platform != IntegrationPlatform.obs and self.endpoint_url is not None:
            raise ValueError("request-supplied endpoints are accepted only for OBS")
        if self.platform == IntegrationPlatform.plugin and self.plugin_manifest is None:
            raise ValueError("plugin connections require a signed manifest")
        if self.platform != IntegrationPlatform.plugin and self.plugin_manifest is not None:
            raise ValueError("plugin manifests are accepted only for plugin connections")
        return self


class IntegrationConnectionResponse(ORMStrictSchema):
    id: uuid.UUID
    workspace_id: uuid.UUID | None
    platform: IntegrationPlatform
    state: IntegrationState
    token_expires_at: datetime | None
    scopes: list[str]
    external_account_id: str | None
    external_channel_id: str | None
    verified_capabilities: list[str]
    safe_configuration: dict[str, Any]
    provider_status: str
    credential_configured: bool
    refresh_credential_configured: bool
    connection_secret_configured: bool
    last_health_at: datetime | None
    last_error_code: str | None
    last_error_at: datetime | None
    last_reconnect_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CapabilitySnapshotResponse(ORMStrictSchema):
    id: uuid.UUID
    connection_id: uuid.UUID
    fetched_capabilities: list[str]
    verified_capabilities: list[str]
    provider_metadata: dict[str, Any]
    status: str
    fetched_at: datetime


class OAuthStartRequest(StrictSchema):
    scopes: list[str] = Field(min_length=1, max_length=64)
    external_channel_id: str | None = Field(default=None, max_length=255)

    @field_validator("scopes")
    @classmethod
    def valid_scopes(cls, value: list[str]) -> list[str]:
        if any(not SCOPE_PATTERN.fullmatch(item) for item in value):
            raise ValueError("integration scopes are invalid")
        return sorted(set(value))


class OAuthStartResponse(StrictSchema):
    authorization_url: str
    state_expires_in_seconds: int = 600


class OAuthCallbackRequest(StrictSchema):
    code: SecretStr = Field(min_length=1, max_length=4096)
    state: str = Field(min_length=20, max_length=8192)


class LiveDestinationCreate(StrictSchema):
    connection_id: uuid.UUID
    publish_enabled: bool = False
    chat_enabled: bool = False
    events_enabled: bool = False
    moderation_enabled: bool = False
    analytics_enabled: bool = False
    max_reconnects: int = Field(default=5, ge=0, le=20)

    @model_validator(mode="after")
    def at_least_one_capability(self) -> LiveDestinationCreate:
        if not any(
            (
                self.publish_enabled,
                self.chat_enabled,
                self.events_enabled,
                self.moderation_enabled,
                self.analytics_enabled,
            )
        ):
            raise ValueError("destination must enable at least one verified capability")
        return self


class ModerationPolicyInput(StrictSchema):
    auto_actions: dict[str, Literal["delete", "timeout"]] = Field(
        default_factory=dict, max_length=16
    )
    minimum_confidence: float = Field(default=0.98, ge=0.95, le=1)
    timeout_seconds: int = Field(default=300, ge=1, le=3600)

    @field_validator("auto_actions")
    @classmethod
    def bounded_categories(
        cls, value: dict[str, Literal["delete", "timeout"]]
    ) -> dict[str, Literal["delete", "timeout"]]:
        if any(
            not key or len(key) > 64 or not key.replace("_", "").replace("-", "").isalnum()
            for key in value
        ):
            raise ValueError("moderation policy category is invalid")
        return value


class LiveSessionCreate(StrictSchema):
    workspace_id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    language: str = "en"
    recording_enabled: bool = False
    moderation_mode: LiveModerationMode = LiveModerationMode.recommend
    moderation_policy: ModerationPolicyInput = Field(default_factory=ModerationPolicyInput)
    ai_mode: LiveAIMode = LiveAIMode.off
    destinations: list[LiveDestinationCreate] = Field(default_factory=list, max_length=20)

    _title = field_validator("title")(safe_text)
    _language = field_validator("language")(valid_locale)


class LiveSessionPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    language: str | None = None
    recording_enabled: bool | None = None
    moderation_mode: LiveModerationMode | None = None
    moderation_policy: ModerationPolicyInput | None = None
    ai_mode: LiveAIMode | None = None

    _title = field_validator("title")(lambda value: safe_text(value) if value else value)
    _language = field_validator("language")(lambda value: valid_locale(value) if value else value)

    @model_validator(mode="after")
    def no_explicit_null(self) -> LiveSessionPatch:
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class LiveDestinationResponse(ORMStrictSchema):
    id: uuid.UUID
    connection_id: uuid.UUID
    state: LiveDestinationState
    publish_enabled: bool
    chat_enabled: bool
    events_enabled: bool
    moderation_enabled: bool
    analytics_enabled: bool
    external_broadcast_id: str | None
    reconnect_count: int
    max_reconnects: int
    next_retry_at: datetime | None
    last_error_code: str | None
    last_health_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LiveReplayRegister(StrictSchema):
    status: LiveReplayStatus = LiveReplayStatus.ready
    storage_key: str = Field(min_length=1, max_length=1024)
    duration_seconds: int = Field(ge=0, le=60 * 60 * 24)
    thumbnail_key: str | None = Field(default=None, min_length=1, max_length=1024)

    _storage_key = field_validator("storage_key")(safe_object_key)
    _thumbnail_key = field_validator("thumbnail_key")(
        lambda value: safe_object_key(value) if value else value
    )


class LiveReplayResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    status: LiveReplayStatus
    storage_key: str
    duration_seconds: int
    thumbnail_key: str | None
    created_at: datetime


class LiveReplayPlaybackResponse(LiveReplayResponse):
    playback_url: str
    thumbnail_url: str | None = None
    expires_in_seconds: int


class LiveSessionResponse(ORMStrictSchema):
    id: uuid.UUID
    owner_user_id: uuid.UUID | None = None
    workspace_id: uuid.UUID | None
    title: str
    language: str
    state: LiveSessionState
    ingest_path: str
    ingest_key_version: int
    ingest_provisioned: bool
    started_at: datetime | None
    ended_at: datetime | None
    recording_enabled: bool
    moderation_mode: LiveModerationMode
    moderation_policy: dict[str, Any]
    ai_mode: LiveAIMode
    last_error_code: str | None
    bgm_track_id: uuid.UUID | None = None
    bgm_playlist_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime
    destinations: list[LiveDestinationResponse] = Field(default_factory=list)
    replay: LiveReplayResponse | None = None


class LiveSessionCreated(LiveSessionResponse):
    stream_key_once: str


class LiveGuestInviteCreate(StrictSchema):
    invitee_user_id: uuid.UUID | None = None
    invitee_username: str | None = Field(default=None, min_length=2, max_length=30)
    role: LiveGuestRole = LiveGuestRole.guest

    @field_validator("invitee_username")
    @classmethod
    def valid_username(cls, value: str | None) -> str | None:
        if value is None:
            return value
        username = value.strip().lstrip("@")
        if not username or not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{1,29}", username):
            raise ValueError("invitee username is invalid")
        return username

    @model_validator(mode="after")
    def target_required(self) -> LiveGuestInviteCreate:
        if self.invitee_user_id is None and self.invitee_username is None:
            raise ValueError("invitee_user_id or invitee_username is required")
        return self


class LiveGuestInviteResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    invitee_user_id: uuid.UUID
    status: LiveGuestInviteStatus
    role: LiveGuestRole
    media_status: LiveGuestMediaStatus
    guest_ingest_path: str | None
    playback_url: str | None = None
    whep_url: str | None = None
    created_at: datetime
    updated_at: datetime


class LiveGuestSubscribeCredentialsResponse(StrictSchema):
    invite_id: uuid.UUID
    session_id: uuid.UUID
    status: Literal["available", "awaiting_media_plane"]
    reason: str | None = None
    guest_ingest_path: str | None = None
    whep_url: str | None = None
    playback_url: str | None = None
    subscribe_bearer_token: str | None = None
    token_expires_at: datetime | None = None
    token_expires_in_seconds: int = 0
    ice_servers: list[LiveIceServerResponse] = Field(default_factory=list)
    media_layout: Literal["contribution_gallery"] = "contribution_gallery"
    media_layout_note: str = (
        "Guest publishes are isolated contribution paths. Hosts subscribe via WHEP; "
        "this is not an SFU composite program feed."
    )


class LiveSessionBgmUpdate(StrictSchema):
    track_id: uuid.UUID | None = None
    playlist_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def at_most_one_source(self) -> LiveSessionBgmUpdate:
        if self.track_id is not None and self.playlist_id is not None:
            raise ValueError("Provide either track_id or playlist_id, not both")
        return self


class LiveGuestInvitationResponse(LiveGuestInviteResponse):
    session_title: str
    session_state: LiveSessionState
    host_user_id: uuid.UUID | None


class StreamKeyRevealResponse(StrictSchema):
    session_id: uuid.UUID
    ingest_path: str
    stream_key_once: str
    key_version: int
    ingest_provisioned: bool


class PreflightCheck(StrictSchema):
    subject: str
    ok: bool
    status: str
    detail: str


class PreflightResponse(StrictSchema):
    session_id: uuid.UUID
    ready: bool
    checks: list[PreflightCheck]


class LiveIceServerResponse(StrictSchema):
    urls: list[str] = Field(min_length=1, max_length=16)
    username: str | None = None
    credential: str | None = None


class LiveMediaCapabilityResponse(StrictSchema):
    session_id: uuid.UUID
    status: Literal["available", "unavailable"]
    reason: str | None
    whip_available: bool
    playback_available: bool
    obs_available: bool = True
    ingest_path: str


class LivePublishCredentialsResponse(LiveMediaCapabilityResponse):
    whip_url: str | None
    whep_url: str | None = None
    playback_url: str | None
    bearer_token: str | None
    subscribe_bearer_token: str | None = None
    token_expires_at: datetime | None
    token_expires_in_seconds: int
    ice_servers: list[LiveIceServerResponse] = Field(default_factory=list)
    media_layout: Literal["contribution_gallery"] = "contribution_gallery"
    media_layout_note: str = (
        "Guest publishes are isolated contribution paths. Hosts and peers subscribe via WHEP; "
        "this is not an SFU composite program feed."
    )


class LiveGuestInviteAcceptResponse(LiveGuestInviteResponse):
    publish_credentials: LivePublishCredentialsResponse | None = None


class OBSSceneResponse(StrictSchema):
    name: str
    current: bool = False


class OBSSceneListResponse(StrictSchema):
    connection_id: uuid.UUID
    destination_id: uuid.UUID
    current_scene: str | None
    scenes: list[OBSSceneResponse] = Field(default_factory=list)


class OBSSceneSelectRequest(StrictSchema):
    scene_name: str = Field(min_length=1, max_length=255)

    _scene_name = field_validator("scene_name")(safe_text)


class OBSRecordStatusResponse(StrictSchema):
    connection_id: uuid.UUID
    destination_id: uuid.UUID
    active: bool
    output_path: str | None = None


class CursorPage(StrictSchema):
    next_cursor: str | None


class PersonaCreate(StrictSchema):
    workspace_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=100)
    system_prompt_reference: str = Field(
        min_length=2, max_length=128, pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]+$"
    )
    system_prompt_version: int = Field(ge=1, le=1_000_000)
    languages: list[str] = Field(min_length=1, max_length=20)
    voice_config_reference: str | None = Field(default=None, max_length=255)
    avatar_config_reference: str | None = Field(default=None, max_length=255)
    speaking_style: dict[str, Any] = Field(default_factory=dict)
    active: bool = True

    _name = field_validator("name")(safe_text)

    @field_validator("languages")
    @classmethod
    def valid_languages(cls, value: list[str]) -> list[str]:
        return sorted(set(valid_locale(item) for item in value))

    _style = field_validator("speaking_style")(safe_json_object)

    @field_validator("voice_config_reference", "avatar_config_reference")
    @classmethod
    def references(cls, value: str | None) -> str | None:
        if value is not None and not REFERENCE_PATTERN.fullmatch(value):
            raise ValueError("configuration reference is invalid")
        return value


class PersonaPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    system_prompt_reference: str | None = Field(default=None, min_length=2, max_length=128)
    system_prompt_version: int | None = Field(default=None, ge=1, le=1_000_000)
    languages: list[str] | None = Field(default=None, min_length=1, max_length=20)
    voice_config_reference: str | None = Field(default=None, max_length=255)
    avatar_config_reference: str | None = Field(default=None, max_length=255)
    speaking_style: dict[str, Any] | None = None
    active: bool | None = None

    _name = field_validator("name")(lambda value: safe_text(value) if value else value)
    _languages = field_validator("languages")(
        lambda value: PersonaCreate.valid_languages(value) if value else value
    )
    _style = field_validator("speaking_style")(
        lambda value: safe_json_object(value) if value is not None else value
    )


class PersonaResponse(ORMStrictSchema):
    id: uuid.UUID
    workspace_id: uuid.UUID | None
    name: str
    system_prompt_reference: str
    system_prompt_version: int
    languages: list[str]
    voice_config_reference: str | None
    avatar_config_reference: str | None
    speaking_style: dict[str, Any]
    active: bool
    created_at: datetime
    updated_at: datetime


class RuleCreate(StrictSchema):
    workspace_id: uuid.UUID | None = None
    persona_id: uuid.UUID | None = None
    name: str = Field(min_length=1, max_length=120)
    trigger_event: LiveNormalizedEventType
    event_filter: dict[str, Any] = Field(default_factory=dict)
    condition_dsl: dict[str, Any] = Field(default_factory=dict)
    action_type: LiveActionType
    action_configuration: dict[str, Any] = Field(default_factory=dict)
    cooldown_seconds: int = Field(default=0, ge=0, le=86_400)
    rate_limit_count: int = Field(default=10, ge=1, le=1000)
    rate_limit_window_seconds: int = Field(default=60, ge=1, le=86_400)
    requires_approval: bool = True
    risk: LiveRuleRisk = LiveRuleRisk.low
    enabled: bool = False

    _name = field_validator("name")(safe_text)
    _filter = field_validator("event_filter")(safe_json_object)
    _configuration = field_validator("action_configuration")(safe_json_object)

    @field_validator("condition_dsl")
    @classmethod
    def condition(cls, value: dict[str, Any]) -> dict[str, Any]:
        return validate_condition_dsl(value)

    @model_validator(mode="after")
    def approval_floor(self) -> RuleCreate:
        if self.risk in {LiveRuleRisk.medium, LiveRuleRisk.high, LiveRuleRisk.critical}:
            self.requires_approval = True
        if self.action_type in {
            LiveActionType.moderate,
            LiveActionType.custom_tool,
            LiveActionType.obs_scene,
        }:
            self.requires_approval = True
        return self


class RulePatch(StrictSchema):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    persona_id: uuid.UUID | None = None
    trigger_event: LiveNormalizedEventType | None = None
    event_filter: dict[str, Any] | None = None
    condition_dsl: dict[str, Any] | None = None
    action_configuration: dict[str, Any] | None = None
    cooldown_seconds: int | None = Field(default=None, ge=0, le=86_400)
    rate_limit_count: int | None = Field(default=None, ge=1, le=1000)
    rate_limit_window_seconds: int | None = Field(default=None, ge=1, le=86_400)
    requires_approval: bool | None = None
    enabled: bool | None = None

    _name = field_validator("name")(lambda value: safe_text(value) if value else value)
    _filter = field_validator("event_filter")(
        lambda value: safe_json_object(value) if value is not None else value
    )
    _configuration = field_validator("action_configuration")(
        lambda value: safe_json_object(value) if value is not None else value
    )
    _condition = field_validator("condition_dsl")(
        lambda value: validate_condition_dsl(value) if value is not None else value
    )


class RuleResponse(ORMStrictSchema):
    id: uuid.UUID
    workspace_id: uuid.UUID | None
    persona_id: uuid.UUID | None
    name: str
    trigger_event: LiveNormalizedEventType
    event_filter: dict[str, Any]
    condition_dsl: dict[str, Any]
    action_type: LiveActionType
    action_configuration: dict[str, Any]
    cooldown_seconds: int
    rate_limit_count: int
    rate_limit_window_seconds: int
    requires_approval: bool
    risk: LiveRuleRisk
    enabled: bool
    created_at: datetime
    updated_at: datetime


class NormalizedEventResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    destination_id: uuid.UUID | None
    connection_id: uuid.UUID | None
    sequence: int
    event_type: LiveNormalizedEventType
    platform_event_id: str
    actor_platform_id: str | None
    actor_display_name: str | None
    text: str | None
    monetary_minor: int | None
    currency: str | None
    safe_metadata: dict[str, Any]
    occurred_at: datetime
    created_at: datetime


class LiveActionResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    event_id: uuid.UUID | None
    rule_id: uuid.UUID | None
    destination_id: uuid.UUID | None
    action_type: LiveActionType
    state: LiveActionState
    idempotency_key: str
    typed_payload: dict[str, Any]
    requires_approval: bool
    approved_by_user_id: uuid.UUID | None
    approved_at: datetime | None
    retry_count: int
    max_retries: int
    next_retry_at: datetime | None
    failure_code: str | None
    official_response_reference_hash: str | None
    created_at: datetime
    updated_at: datetime


class ModerationDecisionResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    event_id: uuid.UUID
    destination_id: uuid.UUID | None
    provider: str | None
    recommendation: ModerationDisposition
    confidence: float
    categories: dict[str, float]
    policy_snapshot: dict[str, Any]
    automatically_actioned: bool
    action_id: uuid.UUID | None
    decided_by_user_id: uuid.UUID | None
    created_at: datetime


class LiveTurnResponse(ORMStrictSchema):
    id: uuid.UUID
    session_id: uuid.UUID
    event_id: uuid.UUID
    persona_id: uuid.UUID
    ai_conversation_id: uuid.UUID | None
    ai_message_id: uuid.UUID | None
    ai_job_id: uuid.UUID | None
    tool_proposal_id: uuid.UUID | None
    status: LiveTurnStatus
    response_text: str | None
    translated_text: str | None
    audio_output_reference: str | None
    latency_ms: int | None
    human_approved_by_id: uuid.UUID | None
    human_approved_at: datetime | None
    failure_code: str | None
    created_at: datetime


class EventPage(CursorPage):
    items: list[NormalizedEventResponse]


class ActionPage(CursorPage):
    items: list[LiveActionResponse]


class ModerationPage(CursorPage):
    items: list[ModerationDecisionResponse]


class TurnPage(CursorPage):
    items: list[LiveTurnResponse]


class LiveTurnCreate(StrictSchema):
    persona_id: uuid.UUID
    action_type: Literal[LiveActionType.respond_text, LiveActionType.respond_voice] = (
        LiveActionType.respond_text
    )
    destination_id: uuid.UUID | None = None
    allow_text_fallback: bool = False


class HumanModerationRequest(StrictSchema):
    disposition: ModerationDisposition


class GameQuestionCreate(StrictSchema):
    prompt: str = Field(min_length=1, max_length=500)
    options: list[str] = Field(min_length=2, max_length=8)
    correct_option: int = Field(ge=0, le=7)
    points: int = Field(default=1, ge=1, le=10_000)

    _prompt = field_validator("prompt")(safe_text)

    @field_validator("options")
    @classmethod
    def options_are_plain(cls, value: list[str]) -> list[str]:
        cleaned = [safe_text(item) for item in value]
        if any(not item or len(item) > 200 for item in cleaned) or len(set(cleaned)) != len(
            cleaned
        ):
            raise ValueError("quiz options must be unique bounded plain text")
        return cleaned

    @model_validator(mode="after")
    def correct_option_exists(self) -> GameQuestionCreate:
        if self.correct_option >= len(self.options):
            raise ValueError("correct_option must identify an option")
        return self


class GameCreate(StrictSchema):
    live_session_id: uuid.UUID
    title: str = Field(min_length=1, max_length=160)
    questions: list[GameQuestionCreate] = Field(min_length=1, max_length=100)

    _title = field_validator("title")(safe_text)


class GameQuestionResponse(ORMStrictSchema):
    id: uuid.UUID
    position: int
    prompt: str
    options: list[str]
    points: int


class GameResponse(ORMStrictSchema):
    id: uuid.UUID
    live_session_id: uuid.UUID
    title: str
    state: GameState
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    questions: list[GameQuestionResponse] = Field(default_factory=list)


class GameAnswerRequest(StrictSchema):
    question_id: uuid.UUID
    connection_id: uuid.UUID
    platform_user_id: str = Field(min_length=1, max_length=255)
    display_name: str | None = Field(default=None, max_length=120)
    selected_option: int = Field(ge=0, le=7)

    _display = field_validator("display_name")(
        lambda value: safe_text(value) if value is not None else value
    )


class GameAnswerResponse(StrictSchema):
    answer_id: uuid.UUID
    correct: bool
    awarded_points: int
    total_score: int


class GameScoreResponse(ORMStrictSchema):
    connection_id: uuid.UUID
    platform_user_id: str
    display_name: str | None
    score: int


class PlatformStatusResponse(StrictSchema):
    platform: IntegrationPlatform
    available: bool
    status: str
    capabilities: list[LiveCapability]
    limitation: str | None = None


class TikTokControlPanelResponse(StrictSchema):
    integration_status: str
    adapter_status: str
    limitation: str | None = None
    connection: dict[str, Any] = Field(default_factory=dict)
    controls: dict[str, bool] = Field(default_factory=dict)
    personalities: list[str] = Field(default_factory=list)
    supported_events: list[str] = Field(default_factory=list)


class WebhookAccepted(StrictSchema):
    status: Literal["accepted", "duplicate"]
    delivery_id: uuid.UUID


class LiveReplayEvent(StrictSchema):
    event: str
    cursor: str | None = None
    aggregate_type: str | None = None
    aggregate_id: uuid.UUID | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime
