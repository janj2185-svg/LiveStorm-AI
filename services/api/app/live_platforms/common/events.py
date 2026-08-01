"""Normalized live-event contracts shared by all platforms."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4


class NormalizedLiveEventType(StrEnum):
    """Canonical event kinds emitted by every live-platform adapter."""

    connected = "connected"
    disconnected = "disconnected"
    chat_message = "chat_message"
    like = "like"
    gift = "gift"
    gift_streak = "gift_streak"
    follow = "follow"
    share = "share"
    subscribe = "subscribe"
    viewer_join = "viewer_join"
    viewer_leave = "viewer_leave"
    room_statistics = "room_statistics"
    moderation = "moderation"
    stream_ended = "stream_ended"
    reconnect = "reconnect"
    provider_error = "provider_error"
    member = "member"
    unknown = "unknown"


@dataclass(frozen=True)
class NormalizedLiveEvent:
    """Platform-agnostic live event for LiveEventHub and Co-Host."""

    event_id: str
    source: str
    type: NormalizedLiveEventType
    timestamp: datetime
    room_id: str | None
    user_id: str | None
    username: str | None
    display_name: str | None
    payload: dict[str, Any]
    raw_provider_event: dict[str, Any]
    deduplication_key: str
    sequence_number: int
    confidence: float
    provider_latency_ms: int | None = None

    @staticmethod
    def new_id() -> str:
        return str(uuid4())

    @staticmethod
    def now() -> datetime:
        return datetime.now(UTC)


@dataclass
class LivePlatformConnectionState:
    connected: bool = False
    room_id: str | None = None
    account: str | None = None
    viewer_count: int | None = None
    chat_rate_per_min: float = 0.0
    last_error: str | None = None
    reconnect_count: int = 0
    last_event_at: datetime | None = None
    health: str = "unknown"
    sequence: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)