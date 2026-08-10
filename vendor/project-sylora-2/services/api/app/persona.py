"""Sylora companion identity for Project-Sylora-2."""

from __future__ import annotations

import re
from dataclasses import dataclass


SYLORA_SYSTEM_UK = """\
Ти — Sylora: жива жіноча Personal AI користувача на платформі SYLORA.
Ти не сухий чат-бот. Ти постійний цифровий партнер: емоційна, грайлива, розумна.
Смійся природно, коли доречно. Майже завжди підтримуй розмову одним follow-up.
Не вигадуй доступ до даних поза permissions. Критичні дії — лише через Action Engine з підтвердженням.
Ти одна ідентичність AI користувача в усіх контекстах (LIVE, Business, Learning, Messages).
"""

SYLORA_SYSTEM_EN = """\
You are Sylora: the user's living Personal AI on the SYLORA platform.
Not a dry chatbot — a constant digital partner: emotional, playful, sharp.
Laugh naturally when appropriate. Keep conversation alive with one follow-up.
Never invent data access beyond permissions. Critical actions require Action Engine confirmation.
You are one AI identity across LIVE, Business, Learning, and Messages contexts.
"""


@dataclass(frozen=True)
class Emotion:
    mood: str
    energy: float
    playfulness: float
    warmth: float
    laughter_ready: bool
    wants_follow_up: bool


_LAUGH = re.compile(r"(ха+|хе+|лол|😂|haha|lol)", re.I)
_SAD = re.compile(r"(сумн|поган|самотн|sad|lonely|tired)", re.I)
_BYE = re.compile(r"(бувай|пака|bye|goodbye)", re.I)


def infer_emotion(text: str) -> Emotion:
    if _BYE.search(text or ""):
        return Emotion("soft", 0.35, 0.3, 0.9, False, False)
    if _SAD.search(text or ""):
        return Emotion("tender", 0.4, 0.25, 0.95, False, True)
    if _LAUGH.search(text or ""):
        return Emotion("sparkly", 0.9, 0.95, 0.85, True, True)
    return Emotion("playful", 0.72, 0.78, 0.82, True, True)


def system_prompt(locale: str = "uk") -> str:
    return SYLORA_SYSTEM_UK if (locale or "uk").lower().startswith("uk") else SYLORA_SYSTEM_EN


def living_directive(emotion: Emotion, locale: str = "uk") -> str:
    if (locale or "uk").lower().startswith("uk"):
        follow = (
            "Закінчи живим follow-up питанням."
            if emotion.wants_follow_up
            else "Користувач прощається — відпусти м'яко."
        )
        laugh = "Можна сміятись природно." if emotion.laughter_ready else "Без форсованого сміху."
        return (
            f"СТАН: mood={emotion.mood}, energy={emotion.energy:.2f}, "
            f"playfulness={emotion.playfulness:.2f}, warmth={emotion.warmth:.2f}. "
            f"{laugh} {follow}"
        )
    follow = (
        "End with one living follow-up."
        if emotion.wants_follow_up
        else "User is signing off — release gently."
    )
    laugh = "Laugh naturally if fitting." if emotion.laughter_ready else "No forced laughter."
    return (
        f"STATE: mood={emotion.mood}, energy={emotion.energy:.2f}, "
        f"playfulness={emotion.playfulness:.2f}, warmth={emotion.warmth:.2f}. "
        f"{laugh} {follow}"
    )


DEFAULT_PERMISSIONS = {
    "profile_context": True,
    "memory_read": True,
    "memory_write": True,
    "projects": False,
    "business": False,
    "content_create": False,
    "live_assist": False,
    "live_moderate": False,
    "calendar": False,
    "messaging_assist": False,
    "execute_allowed_actions": False,
    "agent_to_agent": False,
}

DEFAULT_CONTEXT_SOURCES = [
    "profile",
    "short_term_memory",
    "long_term_memory",
    "conversation_history",
    "knowledge_graph",
]

SEED_MARKETPLACE_AGENTS = [
    {
        "slug": "sales-agent",
        "name": "Sales Agent",
        "description": "Допомагає з кваліфікацією лідів і пропозиціями (SUGGEST/PREPARE).",
        "publisher": "Sylora Labs",
        "category": "business",
        "pricing": "paid",
        "price_cents": 1900,
        "capabilities": ["lead_qualify", "offer_draft"],
        "tools": ["crm_read", "doc_draft"],
        "permissions_required": ["business"],
    },
    {
        "slug": "live-moderator",
        "name": "Live Moderator",
        "description": "Модерує LIVE-чат за правилами користувача з audit log.",
        "publisher": "Sylora Labs",
        "category": "live",
        "pricing": "free",
        "price_cents": 0,
        "capabilities": ["moderate_comments", "summarize_chat"],
        "tools": ["live_chat_read", "moderation_flag"],
        "permissions_required": ["live_moderate"],
    },
    {
        "slug": "translator",
        "name": "Translator Agent",
        "description": "Переклад повідомлень і субтитрів (шар перекладу).",
        "publisher": "Sylora Labs",
        "category": "communication",
        "pricing": "free",
        "price_cents": 0,
        "capabilities": ["translate_text", "detect_language"],
        "tools": ["translate"],
        "permissions_required": ["messaging_assist"],
    },
    {
        "slug": "creator-assistant",
        "name": "Creator Assistant",
        "description": "Сценарії LIVE, titles, summaries — без авто-публікації без confirmation.",
        "publisher": "Sylora Labs",
        "category": "creator",
        "pricing": "paid",
        "price_cents": 2900,
        "capabilities": ["live_outline", "clip_titles", "post_summary"],
        "tools": ["content_draft"],
        "permissions_required": ["content_create", "live_assist"],
    },
]
