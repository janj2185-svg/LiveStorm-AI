"""LivePlatformConnectionManager: auth + transport + normalize + reliability."""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
from collections.abc import AsyncIterator, Mapping
from typing import Any

from app.live_platforms.common.events import LivePlatformConnectionState, NormalizedLiveEvent
from app.live_platforms.common.interfaces import (
    LiveConnectRequest,
    LiveEventNormalizer,
    LivePlatformAuthProvider,
    LivePlatformTransport,
)
from app.live_platforms.common.reliability import (
    CircuitBreaker,
    DeadLetterQueue,
    EventDeduplicator,
    ExponentialBackoffReconnectManager,
    HealthMonitor,
    TokenBucketRateLimiter,
)

logger = logging.getLogger("sylora.live_platforms")


class LivePlatformConnectionManager:
    """Owns connect/reconnect lifecycle for one live-platform session."""

    def __init__(
        self,
        *,
        auth_provider: LivePlatformAuthProvider,
        transport: LivePlatformTransport,
        normalizer: LiveEventNormalizer,
        platform: str = "live",
        rate_limiter: TokenBucketRateLimiter | None = None,
        reconnect: ExponentialBackoffReconnectManager | None = None,
        health: HealthMonitor | None = None,
        circuit_breaker: CircuitBreaker | None = None,
        allow_test_transport: bool = False,
    ) -> None:
        if transport.name == "fake_test_only" and not allow_test_transport:
            raise RuntimeError("fake_test_only transport is forbidden outside tests")
        self._auth = auth_provider
        self._transport = transport
        self._normalizer = normalizer
        self._platform = platform
        self._rate_limiter = rate_limiter or TokenBucketRateLimiter()
        self._reconnect = reconnect or ExponentialBackoffReconnectManager()
        self._health = health or HealthMonitor()
        self._circuit = circuit_breaker or CircuitBreaker()
        self._dedupe = EventDeduplicator()
        self._dlq = DeadLetterQueue()
        self._state = LivePlatformConnectionState()
        self._queue: asyncio.Queue[NormalizedLiveEvent] = asyncio.Queue()
        self._task: asyncio.Task[None] | None = None
        self._stop = asyncio.Event()
        self._request: LiveConnectRequest | None = None
        self.event_loss = 0
        self.metrics: dict[str, Any] = {
            "normalized": 0,
            "duplicates": 0,
            "rate_limited": 0,
            "reconnect_time_total_s": 0.0,
        }

    @property
    def state(self) -> LivePlatformConnectionState:
        return self._state

    async def start(self, request: LiveConnectRequest) -> None:
        if not self._auth.is_approved():
            self._state.last_error = "blocked_by_provider_access"
            self._state.health = "blocked"
            raise PermissionError("blocked_by_provider_access")
        if not self._circuit.allow():
            raise RuntimeError("circuit_open")
        self._request = request
        self._stop.clear()
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(
            self._run_loop(), name=f"{self._platform}-live-connection"
        )

    async def stop(self) -> None:
        self._stop.set()
        try:
            await self._transport.disconnect()
        except Exception:  # noqa: BLE001 - graceful shutdown
            logger.exception("live_platform_transport_disconnect_failed")
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        self._state.connected = False
        self._state.health = "stopped"

    async def normalized_events(self) -> AsyncIterator[NormalizedLiveEvent]:
        while True:
            if self._stop.is_set() and self._queue.empty():
                break
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=0.5)
            except TimeoutError:
                continue
            yield event

    def diagnostics(self) -> Mapping[str, Any]:
        health = self._health.snapshot()
        return {
            "platform": self._platform,
            "connected": self._state.connected,
            "account": self._state.account,
            "room_id": self._state.room_id,
            "viewer_count": self._state.viewer_count,
            "chat_rate_per_min": self._state.chat_rate_per_min,
            "health": self._state.health,
            "last_error": self._state.last_error,
            "reconnect_count": self._state.reconnect_count,
            "sequence": self._state.sequence,
            "duplicates": self._dedupe.duplicate_count,
            "event_loss": self.event_loss,
            "dead_letter": self._dlq.snapshot(),
            "circuit_open": self._circuit.open,
            "transport": self._transport.name,
            "auth_provider": self._auth.name,
            "auth_approved": self._auth.is_approved(),
            "monitor": dict(health),
            "metrics": dict(self.metrics),
        }

    async def _run_loop(self) -> None:
        assert self._request is not None
        attempt = 0
        while not self._stop.is_set():
            started = time.monotonic()
            try:
                auth = await self._auth.resolve(self._request)
                await self._transport.connect(self._request, auth)
                self._reconnect.reset()
                self._circuit.success()
                self._state.connected = True
                self._state.account = self._request.account
                self._state.room_id = self._request.room_id
                self._state.health = "connected"
                self._state.last_error = None
                if attempt > 0:
                    self.metrics["reconnect_time_total_s"] += time.monotonic() - started
                attempt = 0
                async for raw in self._transport.events():
                    if self._stop.is_set():
                        break
                    await self._handle_raw(raw)
            except asyncio.CancelledError:
                raise
            except PermissionError as exc:
                self._state.connected = False
                self._state.health = "blocked"
                self._state.last_error = str(exc)
                self._health.note_error(str(exc))
                self._circuit.failure()
                logger.warning("live_platform_blocked", extra={"error": str(exc), "platform": self._platform})
                return
            except Exception as exc:  # noqa: BLE001 - reconnect path
                self._state.connected = False
                self._state.health = "reconnecting"
                self._state.last_error = type(exc).__name__
                self._health.note_error(type(exc).__name__)
                self._circuit.failure()
                self._health.note_reconnect()
                self._state.reconnect_count += 1
                attempt += 1
                delay = self._reconnect.next_delay_seconds(attempt)
                logger.warning(
                    "live_platform_reconnect_scheduled",
                    extra={
                        "attempt": attempt,
                        "delay_s": delay,
                        "error": type(exc).__name__,
                        "platform": self._platform,
                    },
                )
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=delay)
                    return
                except TimeoutError:
                    continue

    async def _handle_raw(self, raw: Mapping[str, Any]) -> None:
        if not await self._rate_limiter.allow(f"{self._platform}-events"):
            self.metrics["rate_limited"] += 1
            self.event_loss += 1
            self._dlq.push("rate_limited", raw=raw)
            return
        self._state.sequence += 1
        event = self._normalizer.normalize(
            raw,
            sequence_number=self._state.sequence,
            received_at_ms=int(time.time() * 1000),
        )
        if event is None:
            self.event_loss += 1
            self._dlq.push("unrecognized_event", raw=raw)
            return
        if self._dedupe.seen_before(event.deduplication_key):
            self.metrics["duplicates"] = self._dedupe.duplicate_count
            return
        self._health.note_event()
        self._state.last_event_at = event.timestamp
        if event.type.value == "room_statistics":
            viewers = event.payload.get("viewerCount")
            if isinstance(viewers, int):
                self._state.viewer_count = viewers
        if event.type.value == "chat_message":
            self._state.chat_rate_per_min = min(10_000.0, self._state.chat_rate_per_min * 0.9 + 6.0)
        self.metrics["normalized"] += 1
        await self._queue.put(event)