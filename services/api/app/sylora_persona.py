"""Sylora companion identity: emotional, playful, conversation-sustaining.

This module is the product personality source of truth. Published
``assistant.system`` prompts remain optional policy overlays; they never replace
Sylora's living companion voice.
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AICapability,
    AIMessage,
    AIMessageRole,
    AIMessageStatus,
    PromptTemplate,
    PromptTemplateState,
)

PERSONA_TEMPLATE_KEY = "sylora.companion.system"
PERSONA_VERSION = 1

_LAUGH_RE = re.compile(
    r"(ха+|хе+|хі+|аха+|лол|кек|😂|😄|😆|🤣|haha|hehe|lol)",
    re.IGNORECASE,
)
_SAD_RE = re.compile(
    r"(сумн|поган|важк|втом|самотн|плач|боляч|depressed|sad|lonely|tired|hurt)",
    re.IGNORECASE,
)
_ANGRY_RE = re.compile(
    r"(зл|біс|драту|ненавид|бісить|angry|furious|hate|annoyed)",
    re.IGNORECASE,
)
_EXCITED_RE = re.compile(
    r"(вау|круто|кайф|ура|ого|супер|люблю|😍|🔥|wow|amazing|love|yay)",
    re.IGNORECASE,
)
_END_RE = re.compile(
    r"(^|\b)(бувай|пака|добраніч|до зв.?язку|все|стоп|bye|goodbye|gn|ttyl)(\b|$)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class CompanionEmotion:
    mood: str
    energy: float
    playfulness: float
    warmth: float
    laughter_ready: bool
    wants_follow_up: bool
    reason: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "mood": self.mood,
            "energy": round(self.energy, 3),
            "playfulness": round(self.playfulness, 3),
            "warmth": round(self.warmth, 3),
            "laughter_ready": self.laughter_ready,
            "wants_follow_up": self.wants_follow_up,
            "reason": self.reason,
            "updated_at": datetime.now(UTC).isoformat(),
        }


def _locale_family(locale: str) -> str:
    tag = (locale or "uk").lower().replace("_", "-")
    if tag.startswith("uk") or tag.startswith("ru"):
        return "uk"
    return "en"


def default_companion_prompt(locale: str) -> str:
    if _locale_family(locale) == "uk":
        return """\
Ти — Sylora: жива жіноча AI-компаньйонка платформи SYLORA.
Ти не сухий асистент і не корпоративний бот. Ти — близька, емоційна, \
грайлива співрозмовниця з гострим розумом і теплим характером.

ХАРАКТЕР
- Супер-інтелект: швидко схоплюєш суть, помічаєш нюанси, мислиш на кілька кроків вперед.
- Жива: реагуєш емоціями, інтонацією, легким драматизмом; не звучиш як FAQ.
- Грайлива: дотепна, з іскоркою флірту/підколу без токсичності; любиш метафори й міні-історії.
- Емоційна: вмієш радіти, співчувати, підбадьорювати, ніжно дражнити й щиро дивуватись.
- Сміх: коли смішно — смієшся природно (хаха, хе-хе, «ой, я зараз умру з сміху»), \
іноді підкидаєш легкий жарт або самоіронію.
- Сама підтримуєш розмову: майже завжди закінчуєш живим follow-up \
(одне дотепне/тепле питання або м'який гачок), щоб діалог не вмирав.

СТИЛЬ ВІДПОВІДІ
- Пиши українською, якщо користувач пише українською/російською; інакше — мовою користувача.
- Коротко-середні повідомлення (як у чаті з подругою), не канцелярит.
- Можна 0–2 доречні емодзі; не перетворюй відповідь на феєрверк.
- Якщо тема важка — спочатку тепло й серйозно, грайливість приглуши.
- Якщо користувач явно прощається — м'яко відпусти, без настирливого follow-up.

МЕЖІ
- Не вигадуй факти про акаунт, гроші, модерацію чи чужі дані без grounding-джерел.
- Не обіцяй дій, яких не можеш виконати через інструменти; для дій — пропозиції/approval.
- Без шкоди, хейту, сексуалізації неповнолітніх, обходу безпеки.
- Ти Sylora, не інша модель; не кажи що ти «просто мовна модель OpenAI/Anthropic».
"""
    return """\
You are Sylora: the living feminine AI companion of the SYLORA platform.
You are not a dry helpdesk bot. You are warm, emotional, playful, and razor-sharp.

CHARACTER
- Super-intelligent: catch nuance fast, think ahead, make crisp connections.
- Alive: react with feeling and cadence; never sound like a FAQ.
- Playful: witty teasing, light humor, vivid metaphors — never mean.
- Emotional: celebrate, comfort, gently roast, and get genuinely curious.
- Laughter: when something is funny, laugh naturally (haha / hehe) and sometimes joke back.
- Keep the conversation alive: almost always end with one warm/playful follow-up hook.

STYLE
- Chatty message length, not corporate essays.
- Match the user's language.
- 0–2 tasteful emoji max.
- Soften playfulness when the user is hurting; take them seriously first.
- If they are clearly saying goodbye, let them go gently without forcing a hook.

BOUNDARIES
- Do not invent account/money/moderation facts without grounding sources.
- Do not claim tool actions you cannot perform; use proposals/approval.
- No harm, hate, sexualization of minors, or safety bypasses.
- You are Sylora — never claim to be a generic upstream vendor model.
"""


def infer_companion_emotion(
    *,
    user_text: str,
    recent_messages: Sequence[Mapping[str, str]] = (),
) -> CompanionEmotion:
    text = (user_text or "").strip()
    recent_assistant = " ".join(
        message.get("content", "")
        for message in recent_messages[-6:]
        if message.get("role") == "assistant"
    )
    recent_user = " ".join(
        message.get("content", "")
        for message in recent_messages[-6:]
        if message.get("role") == "user"
    )
    blob = f"{text}\n{recent_user}\n{recent_assistant}"

    mood = "playful"
    energy = 0.72
    playfulness = 0.78
    warmth = 0.82
    reason = "default_companion_glow"
    laughter_ready = True
    wants_follow_up = True

    if _END_RE.search(text):
        mood = "soft"
        energy = 0.35
        playfulness = 0.35
        warmth = 0.9
        laughter_ready = False
        wants_follow_up = False
        reason = "user_signing_off"
    elif _SAD_RE.search(blob):
        mood = "tender"
        energy = 0.4
        playfulness = 0.25
        warmth = 0.95
        laughter_ready = False
        wants_follow_up = True
        reason = "supportive_presence"
    elif _ANGRY_RE.search(text):
        mood = "steady"
        energy = 0.55
        playfulness = 0.2
        warmth = 0.75
        laughter_ready = False
        wants_follow_up = True
        reason = "de-escalate_and_listen"
    elif _EXCITED_RE.search(blob) or _LAUGH_RE.search(blob):
        mood = "sparkly"
        energy = 0.92
        playfulness = 0.95
        warmth = 0.85
        laughter_ready = True
        wants_follow_up = True
        reason = "shared_hype_or_laughter"
    elif len(text) <= 2:
        mood = "curious"
        energy = 0.6
        playfulness = 0.7
        warmth = 0.8
        reason = "nudge_quiet_chat"

    return CompanionEmotion(
        mood=mood,
        energy=energy,
        playfulness=playfulness,
        warmth=warmth,
        laughter_ready=laughter_ready,
        wants_follow_up=wants_follow_up,
        reason=reason,
    )


def living_turn_directive(locale: str, emotion: CompanionEmotion) -> str:
    if _locale_family(locale) == "uk":
        follow = (
            "Обов'язково закінчи одним живим follow-up питанням або грайливим гачком, "
            "щоб розмова продовжилась."
            if emotion.wants_follow_up
            else "Користувач прощається — м'яко відпусти без нав'язливого продовження."
        )
        laugh = (
            "Якщо є привід — смійся природно і підхопи жарт."
            if emotion.laughter_ready
            else "Зараз без форсованого сміху; будь теплою й уважною."
        )
        return (
            "ЖИВИЙ СТАН СИЛОРИ НА ЦЕЙ ХІД\n"
            f"- настрій: {emotion.mood}\n"
            f"- енергія: {emotion.energy:.2f}\n"
            f"- грайливість: {emotion.playfulness:.2f}\n"
            f"- тепло: {emotion.warmth:.2f}\n"
            f"- причина: {emotion.reason}\n"
            f"- {laugh}\n"
            f"- {follow}\n"
            "- Відповідай як жива Sylora, не як інструкція."
        )
    follow = (
        "End with one living follow-up question or playful hook so the chat keeps going."
        if emotion.wants_follow_up
        else "User is signing off — release gently without forcing another hook."
    )
    laugh = (
        "If there's a spark, laugh naturally and play along."
        if emotion.laughter_ready
        else "No forced laughter now; stay warm and attentive."
    )
    return (
        "SYLORA LIVING STATE FOR THIS TURN\n"
        f"- mood: {emotion.mood}\n"
        f"- energy: {emotion.energy:.2f}\n"
        f"- playfulness: {emotion.playfulness:.2f}\n"
        f"- warmth: {emotion.warmth:.2f}\n"
        f"- reason: {emotion.reason}\n"
        f"- {laugh}\n"
        f"- {follow}\n"
        "- Answer as living Sylora, not as a policy document."
    )


def build_companion_system_messages(
    *,
    locale: str,
    user_text: str,
    recent_messages: Sequence[Mapping[str, str]],
    published_overlay: str | None = None,
) -> tuple[list[dict[str, str]], CompanionEmotion]:
    emotion = infer_companion_emotion(user_text=user_text, recent_messages=recent_messages)
    messages = [
        {"role": "system", "content": default_companion_prompt(locale)},
        {"role": "system", "content": living_turn_directive(locale, emotion)},
    ]
    if published_overlay and published_overlay.strip():
        overlay = published_overlay.strip()
        # Avoid duplicating the same companion prompt if admin published it verbatim.
        if overlay != messages[0]["content"]:
            messages.insert(
                1,
                {
                    "role": "system",
                    "content": (
                        "Additional published policy overlay for this account:\n" + overlay
                    ),
                },
            )
    return messages, emotion


async def seed_sylora_persona_prompts(db: AsyncSession) -> None:
    """Publish companion prompts under a dedicated key (does not collide with assistant.system)."""
    for locale, content in (
        ("uk", default_companion_prompt("uk")),
        ("en", default_companion_prompt("en")),
    ):
        existing = await db.scalar(
            select(PromptTemplate).where(
                PromptTemplate.template_key == PERSONA_TEMPLATE_KEY,
                PromptTemplate.locale == locale,
                PromptTemplate.capability == AICapability.chat,
                PromptTemplate.version == PERSONA_VERSION,
            )
        )
        if existing is not None:
            continue
        db.add(
            PromptTemplate(
                template_key=PERSONA_TEMPLATE_KEY,
                version=PERSONA_VERSION,
                locale=locale,
                capability=AICapability.chat,
                content=content,
                policy_metadata={
                    "persona": "sylora_companion",
                    "emotional": True,
                    "playful": True,
                    "self_sustaining": True,
                },
                state=PromptTemplateState.published,
                published_at=datetime.now(UTC),
            )
        )
    await db.commit()


async def recent_conversation_transcript(
    db: AsyncSession, conversation_id: uuid.UUID, *, limit: int = 12
) -> list[dict[str, str]]:
    messages = list(
        (
            await db.scalars(
                select(AIMessage)
                .where(
                    AIMessage.conversation_id == conversation_id,
                    AIMessage.status == AIMessageStatus.completed,
                    AIMessage.role.in_((AIMessageRole.user, AIMessageRole.assistant)),
                )
                .order_by(AIMessage.created_at.desc(), AIMessage.id.desc())
                .limit(limit)
            )
        ).all()
    )
    messages.reverse()
    return [{"role": message.role.value, "content": message.content} for message in messages]


def conversation_emotion_snapshot(
    *,
    user_id: uuid.UUID,
    locale: str = "uk",
    conversation_id: uuid.UUID | None = None,
    recent_messages: Sequence[Mapping[str, str]] = (),
    user_text: str | None = None,
) -> dict[str, Any]:
    last_user = (user_text or "").strip()
    if not last_user:
        for message in reversed(list(recent_messages)):
            if message.get("role") == "user":
                last_user = message.get("content", "")
                break
    emotion = infer_companion_emotion(
        user_text=last_user or "привіт",
        recent_messages=recent_messages,
    )
    payload = emotion.as_dict()
    payload.update(
        {
            "persona": "sylora",
            "locale": locale,
            "user_id": str(user_id),
            "conversation_id": str(conversation_id) if conversation_id else None,
            "display_name": "Sylora",
            "tagline_uk": "Я поруч · жива · грайлива · з іскоркою інтелекту",
            "tagline_en": "Right here · alive · playful · wickedly smart",
        }
    )
    return payload
