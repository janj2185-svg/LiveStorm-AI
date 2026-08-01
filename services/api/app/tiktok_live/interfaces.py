"""Independent TikTok LIVE interfaces (no hard coupling to SYLORA internals)."""

from __future__ import annotations

from collections.abc import AsyncIterator, Mapping
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

from app.tiktok_live.events import TikTokNormalizedEvent


@dataclass(frozen=True)
class TikTokAuthMaterial:
    """Opaque provider credentials — never log secret values."""

    provider: str
    access_token: str | None = None
    refresh_token: str | None = None
    api_key: str | None = None
    scopes: frozenset[str] = frozenset()
    metadata: Mapping[str, Any] | None = None


@dataclass(frozen=True)
class TikTokConnectRequest:
    account: str
    room_id: str | None = None
    session_label: str | None = None


@runtime_checkable
class TikTokAuthProvider(Protocol):
    name: str

    async def resolve(self, request: TikTokConnectRequest) -> TikTokAuthMaterial: ...

    async def refresh(self, material: TikTokAuthMaterial) -> TikTokAuthMaterial: ...

    def is_approved(self) -> bool:
        """True only when product/legal has approved this provider for LIVE events."""
        ...


@runtime_checkable
class TikTokTransport(Protocol):
    name: str

    async def connect(
        self,
        request: TikTokConnectRequest,
        auth: TikTokAuthMaterial,
    ) -> None: ...

    async def disconnect(self) -> None: ...

    def events(self) -> AsyncIterator[dict[str, Any]]:
        """Yield raw provider payloads (never synthetic in production transports)."""
        ...

    async def health(self) -> Mapping[str, Any]: ...


@runtime_checkable
class TikTokEventNormalizer(Protocol):
    def normalize(
        self,
        raw: Mapping[str, Any],
        *,
        sequence_number: int,
        received_at_ms: int | None = None,
    ) -> TikTokNormalizedEvent | None: ...


@runtime_checkable
class TikTokRateLimiter(Protocol):
    async def allow(self, key: str) -> bool: ...


@runtime_checkable
class TikTokHealthMonitor(Protocol):
    def note_event(self) -> None: ...

    def note_error(self, code: str) -> None: ...

    def note_reconnect(self) -> None: ...

    def snapshot(self) -> Mapping[str, Any]: ...


@runtime_checkable
class TikTokReconnectManager(Protocol):
    def next_delay_seconds(self, attempt: int) -> float: ...

    def reset(self) -> None: ...


@runtime_checkable
class TikTokConnectionManager(Protocol):
    async def start(self, request: TikTokConnectRequest) -> None: ...

    async def stop(self) -> None: ...

    def normalized_events(self) -> AsyncIterator[TikTokNormalizedEvent]: ...

    def diagnostics(self) -> Mapping[str, Any]: ...
