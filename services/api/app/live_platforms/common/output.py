"""TTS / avatar / OBS output orchestration hooks for co-host decisions."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.live_platforms.common.cohost import DialogueDecision


class SpeechSynthesizer(Protocol):
    async def speak(self, text: str, *, emotion: str, volume: float) -> str:
        """Return audio reference id."""
        ...

    async def interrupt(self) -> None: ...


class AvatarController(Protocol):
    async def react(self, reaction: str, *, sync_token: str | None = None) -> None: ...


class ObsOverlayController(Protocol):
    async def publish(self, event_type: str, payload: dict[str, Any]) -> None: ...


class GiftRuntimeController(Protocol):
    async def trigger(self, gift_key: str, *, user_label: str | None) -> None: ...


@dataclass
class OutputSyncPlan:
    text: str
    audio_reference: str | None
    avatar_reaction: str | None
    obs_event: str | None
    gift_effect: str | None
    sync_token: str
    created_at: float = field(default_factory=time.time)


class NullSpeechSynthesizer:
    def __init__(self) -> None:
        self.interrupted = False
        self.spoken: list[str] = []

    async def speak(self, text: str, *, emotion: str, volume: float) -> str:
        self.interrupted = False
        self.spoken.append(text)
        return f"tts:null:{len(self.spoken)}"

    async def interrupt(self) -> None:
        self.interrupted = True


class NullAvatarController:
    def __init__(self) -> None:
        self.reactions: list[str] = []

    async def react(self, reaction: str, *, sync_token: str | None = None) -> None:
        self.reactions.append(reaction)


# Human-life reaction vocabulary consumed by packages/avatar-runtime (Liora).
LIORA_REACTIONS = frozenset(
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


@dataclass
class AvatarLifeEvent:
    reaction: str
    sync_token: str | None
    persona_id: str
    at: float


class LocalAvatarLifeController:
    """Records co-host reactions for the Liora living-avatar runtime.

    The browser AvatarLifeEngine consumes the same reaction ids. This controller
    is the server-side ledger so Live Hub / OBS overlays can replay or fan out
    gesture cues without inventing a separate vocabulary.
    """

    def __init__(self, *, persona_id: str = "liora") -> None:
        self.persona_id = persona_id
        self.reactions: list[str] = []
        self.events: list[AvatarLifeEvent] = []

    async def react(self, reaction: str, *, sync_token: str | None = None) -> None:
        normalized = reaction.strip().lower() if reaction else "idle"
        if normalized not in LIORA_REACTIONS:
            normalized = "idle"
        self.reactions.append(normalized)
        self.events.append(
            AvatarLifeEvent(
                reaction=normalized,
                sync_token=sync_token,
                persona_id=self.persona_id,
                at=time.time(),
            )
        )


class NullObsOverlayController:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict[str, Any]]] = []

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        self.events.append((event_type, payload))


class NullGiftRuntimeController:
    def __init__(self) -> None:
        self.triggers: list[str] = []

    async def trigger(self, gift_key: str, *, user_label: str | None) -> None:
        self.triggers.append(gift_key)


class CoHostOutputOrchestrator:
    """Coordinates text/TTS/avatar/OBS/gift outputs with interrupt support."""

    def __init__(
        self,
        *,
        tts: SpeechSynthesizer | None = None,
        avatar: AvatarController | None = None,
        obs: ObsOverlayController | None = None,
        gifts: GiftRuntimeController | None = None,
    ) -> None:
        self.tts = tts or NullSpeechSynthesizer()
        self.avatar = avatar or LocalAvatarLifeController()
        self.obs = obs or NullObsOverlayController()
        self.gifts = gifts or NullGiftRuntimeController()
        self.last_plan: OutputSyncPlan | None = None
        self.tts_latency_ms: list[int] = []

    async def apply(
        self,
        decision: DialogueDecision,
        *,
        reply_text: str,
        volume: float = 0.8,
    ) -> OutputSyncPlan:
        if decision.interrupt_tts:
            await self.tts.interrupt()
        sync_token = f"sync-{int(time.time() * 1000)}"
        audio_ref = None
        started = time.perf_counter()
        if decision.should_respond and decision.speak_voice and reply_text:
            audio_ref = await self.tts.speak(
                reply_text,
                emotion=str(decision.prompt_hints.get("emotion") or "neutral"),
                volume=volume,
            )
            self.tts_latency_ms.append(int((time.perf_counter() - started) * 1000))
        if decision.avatar_reaction:
            await self.avatar.react(decision.avatar_reaction, sync_token=sync_token)
        obs_event = None
        if decision.should_respond:
            obs_event = "cohost.reply"
            await self.obs.publish(
                obs_event,
                {
                    "text": reply_text if decision.show_text else None,
                    "user": decision.target_username,
                    "sync_token": sync_token,
                    "avatar_reaction": decision.avatar_reaction,
                    "persona_id": getattr(self.avatar, "persona_id", "liora"),
                },
            )
        gift_effect = None
        if decision.reason == "gift_thanks":
            gift_effect = str(decision.prompt_hints.get("gift_name") or "gift")
            await self.gifts.trigger(gift_effect, user_label=decision.target_username)
        plan = OutputSyncPlan(
            text=reply_text if decision.show_text else "",
            audio_reference=audio_ref,
            avatar_reaction=decision.avatar_reaction,
            obs_event=obs_event,
            gift_effect=gift_effect,
            sync_token=sync_token,
        )
        self.last_plan = plan
        return plan
