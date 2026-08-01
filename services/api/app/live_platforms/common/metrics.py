"""Lightweight metrics counters for live-platform adapters."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class LivePlatformMetrics:
    platform: str
    _counters: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    _gauges: dict[str, float] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock)

    def incr(self, name: str, amount: int = 1) -> None:
        with self._lock:
            self._counters[name] += amount

    def set_gauge(self, name: str, value: float) -> None:
        with self._lock:
            self._gauges[name] = value

    def get(self, name: str) -> int | float:
        with self._lock:
            if name in self._gauges:
                return self._gauges[name]
            return self._counters.get(name, 0)

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "platform": self.platform,
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
            }

    def reset(self) -> None:
        with self._lock:
            self._counters.clear()
            self._gauges.clear()


# Common metric names
EVENTS_RECEIVED = "events_received"
EVENTS_NORMALIZED = "events_normalized"
EVENTS_DROPPED = "events_dropped"
EVENTS_DUPLICATE = "events_duplicate"
EVENTS_FORWARDED = "events_forwarded"
RECONNECT_ATTEMPTS = "reconnect_attempts"
AUTH_FAILURES = "auth_failures"
TRANSPORT_ERRORS = "transport_errors"
RATE_LIMIT_HITS = "rate_limit_hits"