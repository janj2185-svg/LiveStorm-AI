"""Dialogue scheduler + personality profiles with non-disableable safety."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from app.tiktok_live.events import TikTokEventType, TikTokNormalizedEvent
from app.tiktok_live.memory import CoHostMemory


class HumorLevel(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class ProfanityLevel(StrEnum):
    none = "none"
    mild = "mild"
    spicy = "spicy"  # still never allows harassment / slurs


@dataclass(frozen=True)
class PersonalityProfile:
    id: str
    label: str
    style_prompt: str
    humor: HumorLevel = HumorLevel.medium
    profanity: ProfanityLevel = ProfanityLevel.none
    tease_enabled: bool = True
    gift_thanks: bool = True
    greet_new_viewers: bool = False


PERSONALITY_PROFILES: dict[str, PersonalityProfile] = {
    "warm_host": PersonalityProfile(
        id="warm_host",
        label="Warm Host",
        style_prompt="Friendly, supportive co-host. Light jokes. Address viewers by nickname.",
        humor=HumorLevel.medium,
    ),
    "hype_sidekick": PersonalityProfile(
        id="hype_sidekick",
        label="Hype Sidekick",
        style_prompt="Energetic hype co-host. Celebrate gifts. Keep replies short.",
        humor=HumorLevel.high,
        greet_new_viewers=True,
    ),
    "dry_wit": PersonalityProfile(
        id="dry_wit",
        label="Dry Wit",
        style_prompt="Dry humor, gentle teasing, never mean. Prefer concise replies.",
        humor=HumorLevel.medium,
        tease_enabled=True,
        profanity=ProfanityLevel.mild,
    ),
}


@dataclass
class SafetyPolicy:
    """Hard rules that personality profiles cannot disable."""

    allow_harassment: bool = False
    allow_slurs: bool = False
    allow_sexual_minors_content: bool = False
    max_profanity: ProfanityLevel = ProfanityLevel.spicy
    require_host_priority: bool = True


@dataclass
class SchedulerConfig:
    muted: bool = False
    host_speaking: bool = False
    respond_to_gifts: bool = True
    respond_to_new_viewers: bool = False
    host_mode: bool = True  # host speech always wins
    min_seconds_between_ai_replies: float = 6.0
    chat_burst_threshold: float = 40.0
    personality_id: str = "warm_host"
    tts_volume: float = 0.8
    interrupt_tts_on_host_speech: bool = True


@dataclass(frozen=True)
class DialogueDecision:
    should_respond: bool
    target_user_id: str | None
    target_username: str | None
    speak_voice: bool
    show_text: bool
    avatar_reaction: str | None
    defer_seconds: float
    merge_with_previous: bool
    yield_to_host: bool
    interrupt_tts: bool
    priority: int
    reason: str
    prompt_hints: dict[str, Any] = field(default_factory=dict)


class DialogueScheduler:
    def __init__(
        self,
        *,
        memory: CoHostMemory | None = None,
        config: SchedulerConfig | None = None,
        safety: SafetyPolicy | None = None,
    ) -> None:
        self.memory = memory or CoHostMemory()
        self.config = config or SchedulerConfig()
        self.safety = safety or SafetyPolicy()
        self._last_reply_at = 0.0
        self._pending_chat: list[TikTokNormalizedEvent] = []

    @property
    def personality(self) -> PersonalityProfile:
        return PERSONALITY_PROFILES.get(
            self.config.personality_id, PERSONALITY_PROFILES["warm_host"]
        )

    def note_host_speaking(self, speaking: bool, *, transcript: str | None = None) -> DialogueDecision | None:
        self.config.host_speaking = speaking
        if transcript:
            self.memory.remember_host_utterance(transcript)
        if speaking and self.config.interrupt_tts_on_host_speech:
            return DialogueDecision(
                should_respond=False,
                target_user_id=None,
                target_username=None,
                speak_voice=False,
                show_text=False,
                avatar_reaction="listen",
                defer_seconds=0.0,
                merge_with_previous=False,
                yield_to_host=True,
                interrupt_tts=True,
                priority=0,
                reason="host_speaking_interrupt_tts",
            )
        return None

    def evaluate(self, event: TikTokNormalizedEvent, *, now: float) -> DialogueDecision:
        if self.config.muted:
            return self._no("muted")
        if self.safety.require_host_priority and self.config.host_speaking and self.config.host_mode:
            return self._no("yield_to_host", yield_to_host=True, interrupt_tts=True)

        if event.type is TikTokEventType.chat_message:
            text = str(event.payload.get("comment") or event.payload.get("text") or "")
            if event.user_id:
                self.memory.remember_user_message(event.user_id, event.username, text)
            if _looks_toxic(text):
                return self._no("toxic_or_unsafe")
            if now - self._last_reply_at < self.config.min_seconds_between_ai_replies:
                self._pending_chat.append(event)
                return DialogueDecision(
                    should_respond=False,
                    target_user_id=event.user_id,
                    target_username=event.username,
                    speak_voice=False,
                    show_text=False,
                    avatar_reaction=None,
                    defer_seconds=self.config.min_seconds_between_ai_replies,
                    merge_with_previous=True,
                    yield_to_host=False,
                    interrupt_tts=False,
                    priority=4,
                    reason="deferred_rate",
                )
            if len(self._pending_chat) >= 3:
                merged = self._pending_chat[-3:]
                self._pending_chat.clear()
                self._last_reply_at = now
                return DialogueDecision(
                    should_respond=True,
                    target_user_id=event.user_id,
                    target_username=event.username,
                    speak_voice=True,
                    show_text=True,
                    avatar_reaction="talk",
                    defer_seconds=0.0,
                    merge_with_previous=True,
                    yield_to_host=False,
                    interrupt_tts=False,
                    priority=5,
                    reason="merged_chat_burst",
                    prompt_hints={
                        "personality": self.personality.id,
                        "merged_count": len(merged),
                        "address_by_nickname": True,
                        "style": self.personality.style_prompt,
                        "humor": self.personality.humor.value,
                        "profanity_cap": min_profanity(
                            self.personality.profanity, self.safety.max_profanity
                        ).value,
                    },
                )
            self._last_reply_at = now
            # Do not answer every message: skip low-signal short spam when chat is hot.
            if len(text) < 2:
                return self._no("too_short")
            return DialogueDecision(
                should_respond=True,
                target_user_id=event.user_id,
                target_username=event.username,
                speak_voice=True,
                show_text=True,
                avatar_reaction="talk",
                defer_seconds=0.0,
                merge_with_previous=False,
                yield_to_host=False,
                interrupt_tts=False,
                priority=5 if "?" in text else 6,
                reason="chat_reply",
                prompt_hints={
                    "personality": self.personality.id,
                    "address_by_nickname": True,
                    "nickname": event.display_name or event.username,
                    "style": self.personality.style_prompt,
                    "humor": self.personality.humor.value,
                    "profanity_cap": min_profanity(
                        self.personality.profanity, self.safety.max_profanity
                    ).value,
                    "memory": self.memory.export_safe_context(event.user_id),
                },
            )

        if event.type in {TikTokEventType.gift, TikTokEventType.gift_streak}:
            if not self.config.respond_to_gifts or not self.personality.gift_thanks:
                return self._no("gifts_disabled")
            gift_name = str(event.payload.get("giftName") or "gift")
            diamonds = event.payload.get("diamondCount")
            if event.user_id:
                self.memory.remember_gift(
                    event.user_id, gift_name, diamonds if isinstance(diamonds, int) else None
                )
            self._last_reply_at = now
            return DialogueDecision(
                should_respond=True,
                target_user_id=event.user_id,
                target_username=event.username,
                speak_voice=True,
                show_text=True,
                avatar_reaction="gift_react",
                defer_seconds=0.0,
                merge_with_previous=False,
                yield_to_host=False,
                interrupt_tts=False,
                priority=1,
                reason="gift_thanks",
                prompt_hints={
                    "gift_name": gift_name,
                    "nickname": event.display_name or event.username,
                    "address_by_nickname": True,
                    "personality": self.personality.id,
                },
            )

        if event.type is TikTokEventType.follow:
            self._last_reply_at = now
            return DialogueDecision(
                should_respond=True,
                target_user_id=event.user_id,
                target_username=event.username,
                speak_voice=True,
                show_text=True,
                avatar_reaction="wave",
                defer_seconds=0.5,
                merge_with_previous=False,
                yield_to_host=False,
                interrupt_tts=False,
                priority=2,
                reason="follow_thanks",
                prompt_hints={"nickname": event.display_name or event.username},
            )

        if event.type is TikTokEventType.viewer_join:
            if not (self.config.respond_to_new_viewers or self.personality.greet_new_viewers):
                return self._no("joins_disabled")
            return DialogueDecision(
                should_respond=True,
                target_user_id=event.user_id,
                target_username=event.username,
                speak_voice=False,
                show_text=True,
                avatar_reaction="glance",
                defer_seconds=1.0,
                merge_with_previous=True,
                yield_to_host=False,
                interrupt_tts=False,
                priority=7,
                reason="viewer_join_greet",
                prompt_hints={"nickname": event.display_name or event.username},
            )

        if event.type is TikTokEventType.like:
            return self._no("likes_ack_only")

        return self._no("unsupported_event")

    def _no(
        self,
        reason: str,
        *,
        yield_to_host: bool = False,
        interrupt_tts: bool = False,
    ) -> DialogueDecision:
        return DialogueDecision(
            should_respond=False,
            target_user_id=None,
            target_username=None,
            speak_voice=False,
            show_text=False,
            avatar_reaction="listen" if yield_to_host else None,
            defer_seconds=0.0,
            merge_with_previous=False,
            yield_to_host=yield_to_host,
            interrupt_tts=interrupt_tts,
            priority=9,
            reason=reason,
        )


def min_profanity(a: ProfanityLevel, b: ProfanityLevel) -> ProfanityLevel:
    order = [ProfanityLevel.none, ProfanityLevel.mild, ProfanityLevel.spicy]
    return order[min(order.index(a), order.index(b))]


def _looks_toxic(text: str) -> bool:
    lowered = text.lower()
    # Hard safety net — not a full moderation stack.
    blocked = ("kill yourself", "kys", "rape", "nazi")
    return any(token in lowered for token in blocked)
