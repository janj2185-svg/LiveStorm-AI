"""Normalized, sequenced OBS event fan-out."""

from __future__ import annotations

import asyncio
from collections import deque
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass(frozen=True, slots=True)
class CompanionEvent:
    sequence: int
    type: str
    occurred_at: str
    data: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "sequence": self.sequence,
            "type": self.type,
            "occurred_at": self.occurred_at,
            "data": self.data,
        }


@dataclass(frozen=True, slots=True)
class Replay:
    events: list[CompanionEvent]
    oldest_sequence: int
    latest_sequence: int
    truncated: bool


class EventBus:
    """Bounded replay and subscriber queues with monotonically increasing sequence."""

    def __init__(self, replay_limit: int = 512, subscriber_queue_limit: int = 128) -> None:
        if replay_limit < 1 or subscriber_queue_limit < 1:
            raise ValueError("queue limits must be positive")
        self._history: deque[CompanionEvent] = deque(maxlen=replay_limit)
        self._subscriber_limit = subscriber_queue_limit
        self._subscribers: set[asyncio.Queue[CompanionEvent]] = set()
        self._sequence = 0
        self._lock = asyncio.Lock()

    async def publish(self, event_type: str, data: dict[str, Any]) -> CompanionEvent:
        async with self._lock:
            self._sequence += 1
            event = CompanionEvent(
                sequence=self._sequence,
                type=event_type,
                occurred_at=datetime.now(UTC).isoformat(),
                data=data,
            )
            self._history.append(event)
            for queue in self._subscribers:
                if queue.full():
                    queue.get_nowait()
                queue.put_nowait(event)
            return event

    async def replay(self, after_sequence: int) -> Replay:
        async with self._lock:
            oldest = self._history[0].sequence if self._history else self._sequence + 1
            return Replay(
                events=[event for event in self._history if event.sequence > after_sequence],
                oldest_sequence=oldest,
                latest_sequence=self._sequence,
                truncated=bool(self._history and after_sequence < oldest - 1),
            )

    async def subscribe(self) -> asyncio.Queue[CompanionEvent]:
        queue: asyncio.Queue[CompanionEvent] = asyncio.Queue(self._subscriber_limit)
        async with self._lock:
            self._subscribers.add(queue)
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[CompanionEvent]) -> None:
        async with self._lock:
            self._subscribers.discard(queue)
