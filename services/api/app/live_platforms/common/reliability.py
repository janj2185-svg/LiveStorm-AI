"""Reliability primitives: reconnect, rate limit, circuit breaker, dedupe, DLQ."""

from __future__ import annotations

import asyncio
import random
import time
from collections import OrderedDict, deque
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from app.live_platforms.common.events import NormalizedLiveEvent


class ExponentialBackoffReconnectManager:
    def __init__(
        self,
        *,
        base: float = 1.0,
        maximum: float = 60.0,
        jitter: float = 0.25,
    ) -> None:
        self._base = base
        self._maximum = maximum
        self._jitter = jitter
        self._attempt = 0

    def next_delay_seconds(self, attempt: int | None = None) -> float:
        self._attempt = attempt if attempt is not None else self._attempt + 1
        bounded = max(0, min(self._attempt, 20))
        ceiling = min(self._maximum, self._base * (2**bounded))
        low = max(0.0, ceiling * (1.0 - self._jitter))
        return random.uniform(low, ceiling)

    def reset(self) -> None:
        self._attempt = 0


class TokenBucketRateLimiter:
    def __init__(self, *, rate_per_second: float = 50.0, burst: float = 100.0) -> None:
        self._rate = rate_per_second
        self._burst = burst
        self._tokens: dict[str, float] = {}
        self._updated: dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> bool:
        async with self._lock:
            now = time.monotonic()
            tokens = self._tokens.get(key, self._burst)
            last = self._updated.get(key, now)
            tokens = min(self._burst, tokens + (now - last) * self._rate)
            self._updated[key] = now
            if tokens < 1.0:
                self._tokens[key] = tokens
                return False
            self._tokens[key] = tokens - 1.0
            return True


class CircuitBreaker:
    def __init__(self, *, failure_threshold: int = 5, reset_timeout_s: float = 30.0) -> None:
        self._failure_threshold = failure_threshold
        self._reset_timeout_s = reset_timeout_s
        self._failures = 0
        self._opened_at: float | None = None

    def allow(self) -> bool:
        if self._opened_at is None:
            return True
        if time.monotonic() - self._opened_at >= self._reset_timeout_s:
            self._opened_at = None
            self._failures = 0
            return True
        return False

    def success(self) -> None:
        self._failures = 0
        self._opened_at = None

    def failure(self) -> None:
        self._failures += 1
        if self._failures >= self._failure_threshold:
            self._opened_at = time.monotonic()

    @property
    def open(self) -> bool:
        return not self.allow()


class EventDeduplicator:
    def __init__(self, *, capacity: int = 10_000) -> None:
        self._capacity = capacity
        self._seen: OrderedDict[str, None] = OrderedDict()
        self.duplicate_count = 0

    def seen_before(self, key: str) -> bool:
        if key in self._seen:
            self.duplicate_count += 1
            self._seen.move_to_end(key)
            return True
        self._seen[key] = None
        while len(self._seen) > self._capacity:
            self._seen.popitem(last=False)
        return False


@dataclass
class DeadLetterItem:
    reason: str
    event: NormalizedLiveEvent | None
    raw: Mapping[str, Any] | None = None
    at: float = field(default_factory=time.time)


class DeadLetterQueue:
    def __init__(self, *, capacity: int = 500) -> None:
        self._items: deque[DeadLetterItem] = deque(maxlen=capacity)

    def push(
        self,
        reason: str,
        *,
        event: NormalizedLiveEvent | None = None,
        raw: Mapping[str, Any] | None = None,
    ) -> None:
        self._items.append(DeadLetterItem(reason=reason, event=event, raw=dict(raw or {})))

    def snapshot(self) -> list[dict[str, Any]]:
        return [
            {
                "reason": item.reason,
                "at": item.at,
                "event_id": item.event.event_id if item.event else None,
                "raw_keys": sorted((item.raw or {}).keys()),
            }
            for item in list(self._items)[-50:]
        ]

    def __len__(self) -> int:
        return len(self._items)


class HealthMonitor:
    def __init__(self) -> None:
        self._events = 0
        self._errors = 0
        self._reconnects = 0
        self._last_event_at: float | None = None
        self._last_error: str | None = None
        self._started_at = time.monotonic()

    def note_event(self) -> None:
        self._events += 1
        self._last_event_at = time.monotonic()

    def note_error(self, code: str) -> None:
        self._errors += 1
        self._last_error = code

    def note_reconnect(self) -> None:
        self._reconnects += 1

    def snapshot(self) -> Mapping[str, Any]:
        now = time.monotonic()
        heartbeat_age = None if self._last_event_at is None else now - self._last_event_at
        healthy = self._errors == 0 or (
            self._last_event_at is not None and heartbeat_age is not None and heartbeat_age < 30
        )
        return {
            "healthy": healthy,
            "events": self._events,
            "errors": self._errors,
            "reconnects": self._reconnects,
            "heartbeat_age_s": heartbeat_age,
            "last_error": self._last_error,
            "uptime_s": now - self._started_at,
        }