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
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class IntegrationPlatform(enum.StrEnum):
    tiktok = "tiktok"
    youtube = "youtube"
    twitch = "twitch"
    kick = "kick"
    facebook = "facebook"
    instagram = "instagram"
    discord = "discord"
    obs = "obs"
    rtmp_webrtc = "rtmp_webrtc"
    plugin = "plugin"


class IntegrationState(enum.StrEnum):
    disconnected = "disconnected"
    authorizing = "authorizing"
    connected = "connected"
    degraded = "degraded"
    revoked = "revoked"
    error = "error"


class LiveCapability(enum.StrEnum):
    publish = "publish"
    chat_read = "chat_read"
    chat_send = "chat_send"
    events = "events"
    moderation_delete = "moderation_delete"
    moderation_timeout = "moderation_timeout"
    analytics = "analytics"
    broadcast_create = "broadcast_create"
    broadcast_update = "broadcast_update"
    broadcast_end = "broadcast_end"
    obs_scene = "obs_scene"
    obs_source = "obs_source"
    stream_control = "stream_control"
    record_control = "record_control"
    first_party_ingest = "first_party_ingest"
    overlay = "overlay"


class LiveSessionState(enum.StrEnum):
    draft = "draft"
    preflight = "preflight"
    starting = "starting"
    live = "live"
    reconnecting = "reconnecting"
    ending = "ending"
    ended = "ended"
    failed = "failed"


class LiveGuestInviteStatus(enum.StrEnum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    revoked = "revoked"


class LiveGuestRole(enum.StrEnum):
    guest = "guest"
    cohost = "cohost"


class LiveGuestMediaStatus(enum.StrEnum):
    not_requested = "not_requested"
    awaiting_media_plane = "awaiting_media_plane"
    ready = "ready"


class LiveReplayStatus(enum.StrEnum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class LiveDestinationState(enum.StrEnum):
    pending = "pending"
    ready = "ready"
    starting = "starting"
    live = "live"
    reconnecting = "reconnecting"
    ended = "ended"
    failed = "failed"
    unavailable = "unavailable"


class LiveAIMode(enum.StrEnum):
    off = "off"
    copilot = "copilot"
    autopilot = "autopilot"
    manual = "manual"


class LiveModerationMode(enum.StrEnum):
    off = "off"
    recommend = "recommend"
    manual = "manual"
    policy = "policy"


class LiveNormalizedEventType(enum.StrEnum):
    chat = "chat"
    follow = "follow"
    subscription = "subscription"
    donation = "donation"
    platform_gift = "platform_gift"
    like = "like"
    viewer_join = "viewer_join"
    moderation = "moderation"
    stream_status = "stream_status"
    custom = "custom"


class LiveActionType(enum.StrEnum):
    respond_text = "respond_text"
    respond_voice = "respond_voice"
    moderate = "moderate"
    obs_scene = "obs_scene"
    overlay = "overlay"
    gift_effect = "gift_effect"
    quiz = "quiz"
    game = "game"
    custom_tool = "custom_tool"


class LiveActionState(enum.StrEnum):
    queued = "queued"
    executing = "executing"
    succeeded = "succeeded"
    failed = "failed"
    retry = "retry"


class LiveRuleRisk(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class LiveTurnStatus(enum.StrEnum):
    queued = "queued"
    awaiting_approval = "awaiting_approval"
    succeeded = "succeeded"
    unavailable = "unavailable"
    failed = "failed"


class ModerationDisposition(enum.StrEnum):
    allow = "allow"
    review = "review"
    delete = "delete"
    timeout = "timeout"
    ban = "ban"


class GameState(enum.StrEnum):
    draft = "draft"
    active = "active"
    ended = "ended"


class IntegrationConnection(Base):
    __tablename__ = "live_integration_connections"
    __table_args__ = (
        UniqueConstraint(
            "owner_user_id",
            "platform",
            "external_account_id",
            name="uq_live_connection_owner_platform_account",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    owner_subject_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    platform: Mapped[IntegrationPlatform] = mapped_column(
        Enum(IntegrationPlatform, native_enum=False, length=24), index=True
    )
    state: Mapped[IntegrationState] = mapped_column(
        Enum(IntegrationState, native_enum=False, length=16),
        default=IntegrationState.disconnected,
        index=True,
    )
    encrypted_access_credential: Mapped[str | None] = mapped_column(Text)
    encrypted_refresh_credential: Mapped[str | None] = mapped_column(Text)
    encrypted_connection_secret: Mapped[str | None] = mapped_column(Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    external_account_id: Mapped[str | None] = mapped_column(String(255), index=True)
    external_channel_id: Mapped[str | None] = mapped_column(String(255), index=True)
    verified_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    safe_configuration: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    provider_status: Mapped[str] = mapped_column(String(64), default="unverified", index=True)
    last_health_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_code: Mapped[str | None] = mapped_column(String(96))
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_reconnect_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class IntegrationCapabilitySnapshot(Base):
    __tablename__ = "live_integration_capability_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="CASCADE"), index=True
    )
    fetched_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    verified_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    provider_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(64), index=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LivePluginManifest(Base):
    __tablename__ = "live_plugin_manifests"
    __table_args__ = (
        UniqueConstraint("connection_id", "manifest_id", name="uq_live_plugin_manifest"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="CASCADE"), index=True
    )
    manifest_id: Mapped[str] = mapped_column(String(128))
    schema_version: Mapped[str] = mapped_column(String(16))
    callback_url: Mapped[str] = mapped_column(String(2048))
    webhook_url: Mapped[str] = mapped_column(String(2048))
    oauth_reference: Mapped[str | None] = mapped_column(String(255))
    secret_reference: Mapped[str | None] = mapped_column(String(255))
    declared_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    signing_key_id: Mapped[str] = mapped_column(String(128), index=True)
    manifest_hash: Mapped[str] = mapped_column(String(64))
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiveSession(Base):
    __tablename__ = "live_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    owner_subject_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    title: Mapped[str] = mapped_column(String(200))
    language: Mapped[str] = mapped_column(String(16))
    state: Mapped[LiveSessionState] = mapped_column(
        Enum(LiveSessionState, native_enum=False, length=16),
        default=LiveSessionState.draft,
        index=True,
    )
    ingest_path: Mapped[str] = mapped_column(String(255), unique=True)
    ingest_key_hash: Mapped[str] = mapped_column(String(64))
    ingest_key_version: Mapped[int] = mapped_column(Integer, default=1)
    ingest_provisioned: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    recording_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_mode: Mapped[LiveModerationMode] = mapped_column(
        Enum(LiveModerationMode, native_enum=False, length=16),
        default=LiveModerationMode.recommend,
    )
    moderation_policy: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    ai_mode: Mapped[LiveAIMode] = mapped_column(
        Enum(LiveAIMode, native_enum=False, length=16), default=LiveAIMode.off
    )
    last_error_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class LiveGuestInvite(Base):
    __tablename__ = "live_guest_invites"
    __table_args__ = (
        Index("ix_live_guest_invites_session_created", "session_id", "created_at", "id"),
        Index("ix_live_guest_invites_invitee_status", "invitee_user_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), index=True
    )
    invitee_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[LiveGuestInviteStatus] = mapped_column(
        Enum(LiveGuestInviteStatus, native_enum=False, length=16),
        default=LiveGuestInviteStatus.pending,
        index=True,
    )
    role: Mapped[LiveGuestRole] = mapped_column(
        Enum(LiveGuestRole, native_enum=False, length=16),
        default=LiveGuestRole.guest,
        index=True,
    )
    media_status: Mapped[LiveGuestMediaStatus] = mapped_column(
        Enum(LiveGuestMediaStatus, native_enum=False, length=32),
        default=LiveGuestMediaStatus.not_requested,
        index=True,
    )
    guest_ingest_path: Mapped[str | None] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class LiveReplay(Base):
    __tablename__ = "live_replays"
    __table_args__ = (
        CheckConstraint("duration_seconds >= 0", name="ck_live_replay_duration_nonnegative"),
        Index("ix_live_replay_session_created", "session_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[LiveReplayStatus] = mapped_column(
        Enum(LiveReplayStatus, native_enum=False, length=16),
        default=LiveReplayStatus.pending,
        index=True,
    )
    storage_key: Mapped[str] = mapped_column(String(1024))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    thumbnail_key: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveDestination(Base):
    __tablename__ = "live_destinations"
    __table_args__ = (
        UniqueConstraint("session_id", "connection_id", name="uq_live_destination_connection"),
        CheckConstraint(
            "reconnect_count >= 0 AND max_reconnects >= 0",
            name="ck_live_destination_reconnects",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), index=True
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="RESTRICT"), index=True
    )
    state: Mapped[LiveDestinationState] = mapped_column(
        Enum(LiveDestinationState, native_enum=False, length=16),
        default=LiveDestinationState.pending,
        index=True,
    )
    publish_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    chat_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    events_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    moderation_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    analytics_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    external_broadcast_id: Mapped[str | None] = mapped_column(String(255), index=True)
    reconnect_count: Mapped[int] = mapped_column(Integer, default=0)
    max_reconnects: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    last_error_code: Mapped[str | None] = mapped_column(String(96))
    last_health_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class IntegrationWebhookDelivery(Base):
    __tablename__ = "live_integration_webhook_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "provider_event_id",
            name="uq_live_webhook_connection_event",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="CASCADE"), index=True
    )
    platform: Mapped[IntegrationPlatform] = mapped_column(
        Enum(IntegrationPlatform, native_enum=False, length=24), index=True
    )
    provider_event_id: Mapped[str] = mapped_column(String(255))
    event_payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    payload_hash: Mapped[str] = mapped_column(String(64))
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(96))


class LiveNormalizedEvent(Base):
    __tablename__ = "live_normalized_events"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "platform_event_id",
            name="uq_live_normalized_connection_event",
        ),
        UniqueConstraint("session_id", "sequence", name="uq_live_normalized_session_sequence"),
        CheckConstraint("sequence > 0", name="ck_live_normalized_positive_sequence"),
        CheckConstraint(
            "monetary_minor IS NULL OR monetary_minor >= 0",
            name="ck_live_normalized_nonnegative_money",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="RESTRICT"), index=True
    )
    destination_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_destinations.id", ondelete="SET NULL"), index=True
    )
    connection_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="SET NULL"), index=True
    )
    sequence: Mapped[int] = mapped_column(BigInteger)
    event_type: Mapped[LiveNormalizedEventType] = mapped_column(
        Enum(LiveNormalizedEventType, native_enum=False, length=24), index=True
    )
    platform_event_id: Mapped[str] = mapped_column(String(255))
    actor_platform_id: Mapped[str | None] = mapped_column(String(255), index=True)
    actor_display_name: Mapped[str | None] = mapped_column(String(120))
    text: Mapped[str | None] = mapped_column(Text)
    monetary_minor: Mapped[int | None] = mapped_column(BigInteger)
    currency: Mapped[str | None] = mapped_column(String(3))
    safe_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class AILivePersona(Base):
    __tablename__ = "ai_live_personas"
    __table_args__ = (
        UniqueConstraint("owner_user_id", "name", name="uq_ai_live_persona_owner_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    name: Mapped[str] = mapped_column(String(100))
    system_prompt_reference: Mapped[str] = mapped_column(String(128))
    system_prompt_version: Mapped[int] = mapped_column(Integer)
    languages: Mapped[list[str]] = mapped_column(JSON, default=list)
    voice_config_reference: Mapped[str | None] = mapped_column(String(255))
    avatar_config_reference: Mapped[str | None] = mapped_column(String(255))
    speaking_style: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AILiveRule(Base):
    __tablename__ = "ai_live_rules"
    __table_args__ = (
        CheckConstraint("cooldown_seconds >= 0", name="ck_ai_live_rule_cooldown"),
        CheckConstraint(
            "rate_limit_count > 0 AND rate_limit_window_seconds > 0",
            name="ck_ai_live_rule_rate",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    persona_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_live_personas.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    trigger_event: Mapped[LiveNormalizedEventType] = mapped_column(
        Enum(LiveNormalizedEventType, native_enum=False, length=24), index=True
    )
    event_filter: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    condition_dsl: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    action_type: Mapped[LiveActionType] = mapped_column(
        Enum(LiveActionType, native_enum=False, length=24), index=True
    )
    action_configuration: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=0)
    rate_limit_count: Mapped[int] = mapped_column(Integer, default=10)
    rate_limit_window_seconds: Mapped[int] = mapped_column(Integer, default=60)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    risk: Mapped[LiveRuleRisk] = mapped_column(
        Enum(LiveRuleRisk, native_enum=False, length=16), default=LiveRuleRisk.low
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AILiveTurn(Base):
    __tablename__ = "ai_live_turns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="RESTRICT"), index=True
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_normalized_events.id", ondelete="RESTRICT"), index=True
    )
    persona_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ai_live_personas.id", ondelete="RESTRICT"), index=True
    )
    ai_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="SET NULL"), index=True
    )
    ai_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_messages.id", ondelete="SET NULL"), index=True
    )
    ai_job_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_jobs.id", ondelete="SET NULL"), index=True
    )
    tool_proposal_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_tool_proposals.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[LiveTurnStatus] = mapped_column(
        Enum(LiveTurnStatus, native_enum=False, length=24),
        default=LiveTurnStatus.queued,
        index=True,
    )
    response_text: Mapped[str | None] = mapped_column(Text)
    translated_text: Mapped[str | None] = mapped_column(Text)
    audio_output_reference: Mapped[str | None] = mapped_column(String(512))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    human_approved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    human_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveModerationDecision(Base):
    __tablename__ = "live_moderation_decisions"
    __table_args__ = (
        CheckConstraint(
            "confidence >= 0 AND confidence <= 1",
            name="ck_live_moderation_confidence",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="RESTRICT"), index=True
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_normalized_events.id", ondelete="RESTRICT"), index=True
    )
    destination_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_destinations.id", ondelete="SET NULL"), index=True
    )
    provider: Mapped[str | None] = mapped_column(String(64))
    recommendation: Mapped[ModerationDisposition] = mapped_column(
        Enum(ModerationDisposition, native_enum=False, length=16), index=True
    )
    confidence: Mapped[float] = mapped_column()
    categories: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    policy_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    automatically_actioned: Mapped[bool] = mapped_column(Boolean, default=False)
    action_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_actions.id", use_alter=True, ondelete="SET NULL")
    )
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveViewerConsent(Base):
    __tablename__ = "live_viewer_consents"
    __table_args__ = (
        UniqueConstraint(
            "connection_id",
            "platform_user_id",
            name="uq_live_viewer_consent_platform_user",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="CASCADE"), index=True
    )
    platform_user_id: Mapped[str] = mapped_column(String(255), index=True)
    linked_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    verified_link_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    memory_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    consented_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retention_days: Mapped[int] = mapped_column(Integer, default=30)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiveViewerMemory(Base):
    __tablename__ = "live_viewer_memories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    consent_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_viewer_consents.id", ondelete="CASCADE"), index=True
    )
    encrypted_content: Mapped[str] = mapped_column(Text)
    source_event_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_normalized_events.id", ondelete="SET NULL")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiveAction(Base):
    __tablename__ = "live_actions"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_live_action_idempotency"),
        CheckConstraint("retry_count >= 0 AND max_retries >= 0", name="ck_live_action_retries"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="RESTRICT"), index=True
    )
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_normalized_events.id", ondelete="SET NULL"), index=True
    )
    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_live_rules.id", ondelete="SET NULL"), index=True
    )
    destination_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("live_destinations.id", ondelete="SET NULL"), index=True
    )
    action_type: Mapped[LiveActionType] = mapped_column(
        Enum(LiveActionType, native_enum=False, length=24), index=True
    )
    state: Mapped[LiveActionState] = mapped_column(
        Enum(LiveActionState, native_enum=False, length=16),
        default=LiveActionState.queued,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(String(128))
    typed_payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=True)
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    max_retries: Mapped[int] = mapped_column(Integer, default=5)
    next_retry_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(96))
    official_response_reference_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class LiveActionTransition(Base):
    __tablename__ = "live_action_transitions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    action_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_actions.id", ondelete="RESTRICT"), index=True
    )
    from_state: Mapped[LiveActionState | None] = mapped_column(
        Enum(LiveActionState, native_enum=False, length=16)
    )
    to_state: Mapped[LiveActionState] = mapped_column(
        Enum(LiveActionState, native_enum=False, length=16), index=True
    )
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveEvent(Base):
    __tablename__ = "live_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="RESTRICT"), index=True
    )
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(32))
    aggregate_id: Mapped[uuid.UUID] = mapped_column(index=True)
    event_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveGameSession(Base):
    __tablename__ = "live_game_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    live_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), index=True
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    state: Mapped[GameState] = mapped_column(
        Enum(GameState, native_enum=False, length=16), default=GameState.draft, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiveGameQuestion(Base):
    __tablename__ = "live_game_questions"
    __table_args__ = (
        UniqueConstraint("game_session_id", "position", name="uq_live_game_question_position"),
        CheckConstraint("points > 0", name="ck_live_game_question_points"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_game_sessions.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    prompt: Mapped[str] = mapped_column(String(500))
    options: Mapped[list[str]] = mapped_column(JSON)
    correct_option: Mapped[int] = mapped_column(Integer)
    points: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiveParticipantAnswer(Base):
    __tablename__ = "live_participant_answers"
    __table_args__ = (
        UniqueConstraint(
            "question_id",
            "connection_id",
            "platform_user_id",
            name="uq_live_game_participant_answer",
        ),
        CheckConstraint("awarded_points >= 0", name="ck_live_game_answer_points"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_game_questions.id", ondelete="CASCADE"), index=True
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="RESTRICT"), index=True
    )
    platform_user_id: Mapped[str] = mapped_column(String(255), index=True)
    selected_option: Mapped[int] = mapped_column(Integer)
    correct: Mapped[bool] = mapped_column(Boolean)
    awarded_points: Mapped[int] = mapped_column(Integer)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class LiveGameScore(Base):
    __tablename__ = "live_game_scores"
    __table_args__ = (
        UniqueConstraint(
            "game_session_id",
            "connection_id",
            "platform_user_id",
            name="uq_live_game_score_participant",
        ),
        CheckConstraint("score >= 0", name="ck_live_game_nonnegative_score"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    game_session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_game_sessions.id", ondelete="CASCADE"), index=True
    )
    connection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_integration_connections.id", ondelete="RESTRICT"), index=True
    )
    platform_user_id: Mapped[str] = mapped_column(String(255), index=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    score: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


@event.listens_for(LiveNormalizedEvent, "before_update")
@event.listens_for(LiveNormalizedEvent, "before_delete")
@event.listens_for(LiveModerationDecision, "before_update")
@event.listens_for(LiveModerationDecision, "before_delete")
@event.listens_for(LiveActionTransition, "before_update")
@event.listens_for(LiveActionTransition, "before_delete")
@event.listens_for(LiveEvent, "before_update")
@event.listens_for(LiveEvent, "before_delete")
def reject_live_audit_mutation(*_: object) -> None:
    raise ValueError("live event, decision, and action audit records are append-only")


@event.listens_for(LiveAction, "before_delete")
def reject_live_action_delete(*_: object) -> None:
    raise ValueError("live actions cannot be deleted")


Index(
    "ix_live_normalized_session_created",
    LiveNormalizedEvent.session_id,
    LiveNormalizedEvent.created_at,
    LiveNormalizedEvent.id,
)
Index(
    "ix_live_actions_session_created",
    LiveAction.session_id,
    LiveAction.created_at,
    LiveAction.id,
)
Index("ix_live_events_session_created", LiveEvent.session_id, LiveEvent.created_at, LiveEvent.id)
Index(
    "ix_live_turns_session_created",
    AILiveTurn.session_id,
    AILiveTurn.created_at,
    AILiveTurn.id,
)
