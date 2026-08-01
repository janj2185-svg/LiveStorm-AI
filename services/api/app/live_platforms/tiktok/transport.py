"""TikTok LIVE transports.

Production must not use FakeTikTokTransport. Fake is test-only.
BlockedTikTokTransport is the default until an approved provider is configured.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Mapping
from typing import Any

from app.live_platforms.common.interfaces import LiveAuthMaterial, LiveConnectRequest


class BlockedTikTokTransport:
    """Default production transport — refuses LIVE event streaming."""

    name = "blocked"

    def __init__(self, *, reason: str = "blocked_by_provider_access") -> None:
        self.reason = reason
        self._connected = False

    async def connect(
        self,
        request: LiveConnectRequest,
        auth: LiveAuthMaterial,
    ) -> None:
        raise PermissionError(self.reason)

    async def disconnect(self) -> None:
        self._connected = False

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        if False:  # pragma: no cover - keep AsyncIterator typing
            yield {}
        raise PermissionError(self.reason)

    async def health(self) -> Mapping[str, Any]:
        return {"ok": False, "status": self.reason, "transport": self.name}


class FakeTikTokTransport:
    """Deterministic in-memory transport for automated tests ONLY.

    Must never be selected as the production transport.
    """

    name = "fake_test_only"

    def __init__(self, raw_events: list[dict[str, Any]] | None = None) -> None:
        self._raw_events = list(raw_events or [])
        self._connected = False
        self._queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()

    async def connect(
        self,
        request: LiveConnectRequest,
        auth: LiveAuthMaterial,
    ) -> None:
        self._connected = True
        await self._queue.put(
            {
                "type": "connected",
                "roomId": request.room_id or "test-room",
                "account": request.account,
            }
        )
        for event in self._raw_events:
            await self._queue.put(event)

    async def disconnect(self) -> None:
        self._connected = False
        await self._queue.put(None)

    async def push(self, event: dict[str, Any]) -> None:
        await self._queue.put(event)

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        while True:
            item = await self._queue.get()
            if item is None:
                break
            yield item

    async def health(self) -> Mapping[str, Any]:
        return {
            "ok": self._connected,
            "status": "connected" if self._connected else "disconnected",
            "transport": self.name,
            "test_only": True,
        }


class ApprovedProviderTransportStub:
    """Contracted provider transport stub.

    Connect refuses until a concrete SDK/client is injected by operators.
    This keeps the seam ready without shipping unofficial scraping code.
    """

    name = "approved_provider_stub"

    def __init__(self, *, endpoint: str | None = None) -> None:
        self.endpoint = endpoint
        self._connected = False

    async def connect(
        self,
        request: LiveConnectRequest,
        auth: LiveAuthMaterial,
    ) -> None:
        if not self.endpoint:
            raise PermissionError("blocked_by_provider_access")
        # Endpoint presence alone is not enough — a real client must be wired.
        raise NotImplementedError(
            "approved_provider_transport_not_wired: inject a contracted client"
        )

    async def disconnect(self) -> None:
        self._connected = False

    async def events(self) -> AsyncIterator[dict[str, Any]]:
        if False:  # pragma: no cover
            yield {}
        raise PermissionError("blocked_by_provider_access")

    async def health(self) -> Mapping[str, Any]:
        return {
            "ok": False,
            "status": "blocked_by_provider_access",
            "transport": self.name,
            "endpoint_configured": bool(self.endpoint),
        }