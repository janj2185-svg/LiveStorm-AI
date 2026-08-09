"""In-memory living-avatar bridge for co-host reactions.

The browser LivingAvatar / OBS overlay polls or receives these events. This is
the concrete AvatarController the dialogue orchestrator can drive today without
a third-party digital-human vendor.
"""

from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import asdict, dataclass, field
from typing import Any


ALLOWED_REACTIONS = frozenset(
    {"idle", "talk", "listen", "wave", "glance", "gift_react", "think"}
)


@dataclass
class AvatarPresenceState:
    persona_name: str = "Sylora"
    reaction: str = "idle"
    utterance: str | None = None
    sync_token: str | None = None
    mood: str = "neutral"
    updated_at: float = field(default_factory=time.time)
    sequence: int = 0

    def as_public_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        return payload


class LivingAvatarController:
    """Records co-host avatar reactions and fans them out to overlay listeners."""

    def __init__(self, *, persona_name: str = "Sylora", history: int = 64) -> None:
        self.persona_name = persona_name
        self.state = AvatarPresenceState(persona_name=persona_name)
        self.reactions: list[str] = []
        self._history: deque[dict[str, Any]] = deque(maxlen=history)
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    async def react(
        self,
        reaction: str,
        *,
        sync_token: str | None = None,
        utterance: str | None = None,
    ) -> None:
        key = (reaction or "idle").strip().lower().replace("-", "_")
        if key not in ALLOWED_REACTIONS:
            key = "idle"
        self.reactions.append(key)
        self.state.sequence += 1
        self.state.reaction = key
        self.state.sync_token = sync_token
        if utterance is not None:
            self.state.utterance = utterance
        self.state.mood = _mood_for(key)
        self.state.updated_at = time.time()
        event = {
            "type": "avatar.reaction",
            "state": self.state.as_public_dict(),
        }
        self._history.append(event)
        await self._fanout(event)

    def snapshot(self) -> dict[str, Any]:
        return {
            "state": self.state.as_public_dict(),
            "recent": list(self._history)[-12:],
        }

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=32)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    async def _fanout(self, event: dict[str, Any]) -> None:
        stale: list[asyncio.Queue[dict[str, Any]]] = []
        for queue in self._subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                stale.append(queue)
        for queue in stale:
            self._subscribers.discard(queue)


def _mood_for(reaction: str) -> str:
    return {
        "idle": "neutral",
        "talk": "warm",
        "listen": "attentive",
        "wave": "warm",
        "glance": "attentive",
        "gift_react": "delighted",
        "think": "thoughtful",
    }.get(reaction, "neutral")


# Process-wide default presence used by the public overlay endpoints.
GLOBAL_LIVING_AVATAR = LivingAvatarController()
