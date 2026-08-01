"""Abstract contracts for live-platform adapters (platform-agnostic names)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from app.live_platforms.common.credentials import LivePlatformCredentials
from app.live_platforms.common.events import NormalizedLiveEvent
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


@dataclass(frozen=True)
class LiveAuthMaterial:
    """Opaque provider credentials — never log secret values."""

    provider: str
    access_token: str | None = None
    refresh_token: str | None = None
    api_key: str | None = None
    scopes: frozenset[str] = frozenset()
    metadata: Mapping[str, Any] | None = None

    def to_credentials(self, *, platform: str, room_id: str = "") -> LivePlatformCredentials:
        return LivePlatformCredentials(
            platform=platform,
            access_token=self.access_token or "",
            refresh_token=self.refresh_token or "",
            api_key=self.api_key or "",
            room_id=room_id,
            metadata=dict(self.metadata or {}),
        )


@dataclass(frozen=True)
class LiveConnectRequest:
    account: str
    room_id: str | None = None
    session_label: str | None = None
    platform: str | None = None


@runtime_checkable
class LivePlatformAuthProvider(Protocol):
    name: str

    async def resolve(self, request: LiveConnectRequest) -> LiveAuthMaterial: ...

    async def refresh(self, material: LiveAuthMaterial) -> LiveAuthMaterial: ...

    def is_approved(self) -> bool:
        """True only when product/legal has approved this provider for LIVE events."""
        ...


@runtime_checkable
class LivePlatformTransport(Protocol):
    name: str

    async def connect(
        self,
        request: LiveConnectRequest,
        auth: LiveAuthMaterial,
    ) -> None: ...

    async def disconnect(self) -> None: ...

    def events(self) -> AsyncIterator[dict[str, Any]]:
        """Yield raw provider payloads (never synthetic in production transports)."""
        ...

    async def health(self) -> Mapping[str, Any]: ...


@runtime_checkable
class LiveEventNormalizer(Protocol):
    def normalize(
        self,
        raw: Mapping[str, Any],
        *,
        sequence_number: int,
        received_at_ms: int | None = None,
    ) -> NormalizedLiveEvent | None: ...


@runtime_checkable
class LivePlatformRateLimiter(Protocol):
    async def allow(self, key: str) -> bool: ...


@runtime_checkable
class LivePlatformHealthMonitor(Protocol):
    def note_event(self) -> None: ...

    def note_error(self, code: str) -> None: ...

    def note_reconnect(self) -> None: ...

    def snapshot(self) -> Mapping[str, Any]: ...


@runtime_checkable
class LivePlatformReconnectManager(Protocol):
    def next_delay_seconds(self, attempt: int) -> float: ...

    def reset(self) -> None: ...


@runtime_checkable
class LiveConnectionManager(Protocol):
    async def start(self, request: LiveConnectRequest) -> None: ...

    async def stop(self) -> None: ...

    def normalized_events(self) -> AsyncIterator[NormalizedLiveEvent]: ...

    def diagnostics(self) -> Mapping[str, Any]: ...


# Preferred public alias
LivePlatformConnectionManager = LiveConnectionManager

EventSink = Callable[[NormalizedLiveEvent], Awaitable[None]]


@runtime_checkable
class LivePlatformAdapter(Protocol):
    """Top-level adapter seam — concrete adapters also implement BasePlatformAdapter."""

    platform: LivePlatformId | Any

    def status(self) -> LivePlatformStatusReport: ...


__all__ = [
    "EventSink",
    "LiveAuthMaterial",
    "LiveConnectRequest",
    "LiveConnectionManager",
    "LiveEventNormalizer",
    "LivePlatformAdapter",
    "LivePlatformAuthProvider",
    "LivePlatformConnectionManager",
    "LivePlatformHealthMonitor",
    "LivePlatformRateLimiter",
    "LivePlatformReconnectManager",
    "LivePlatformTransport",
]