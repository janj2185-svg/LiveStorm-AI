"""Browser-source avatar controller for co-host output.

Mirrors the AvatarController protocol used by CoHostOutputOrchestrator and
records reactions so a SYLORA living-avatar browser source (Lira) can poll or
subscribe via WebSocket later. Until a transport is attached, reactions stay
in-process — same contract as NullAvatarController, with richer metadata.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class AvatarReactionEvent:
    reaction: str
    sync_token: str | None
    at: float = field(default_factory=time.time)


class LivingAvatarController:
    """Drop-in AvatarController that keeps an ordered reaction log for Lira."""

    KNOWN = frozenset(
        {
            "idle",
            "listen",
            "talk",
            "wave",
            "nod",
            "glance",
            "gift_react",
            "think",
            "smile",
        }
    )

    def __init__(self) -> None:
        self.events: list[AvatarReactionEvent] = []

    async def react(self, reaction: str, *, sync_token: str | None = None) -> None:
        normalized = reaction if reaction in self.KNOWN else "idle"
        self.events.append(
            AvatarReactionEvent(reaction=normalized, sync_token=sync_token)
        )

    @property
    def reactions(self) -> list[str]:
        return [event.reaction for event in self.events]

    def latest(self) -> AvatarReactionEvent | None:
        return self.events[-1] if self.events else None
