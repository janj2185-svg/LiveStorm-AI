"""Co-host memory layers with TTL and privacy controls."""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class MemoryItem:
    key: str
    value: Any
    expires_at: float
    tags: frozenset[str] = field(default_factory=frozenset)


class TtlMemoryStore:
    def __init__(self, *, default_ttl_s: float = 3600.0, capacity: int = 2000) -> None:
        self._default_ttl_s = default_ttl_s
        self._capacity = capacity
        self._items: dict[str, MemoryItem] = {}

    def put(
        self,
        key: str,
        value: Any,
        *,
        ttl_s: float | None = None,
        tags: set[str] | None = None,
    ) -> None:
        self.purge()
        self._items[key] = MemoryItem(
            key=key,
            value=value,
            expires_at=time.monotonic() + (ttl_s if ttl_s is not None else self._default_ttl_s),
            tags=frozenset(tags or ()),
        )
        while len(self._items) > self._capacity:
            oldest = min(self._items.values(), key=lambda item: item.expires_at)
            self._items.pop(oldest.key, None)

    def get(self, key: str) -> Any | None:
        self.purge()
        item = self._items.get(key)
        return None if item is None else item.value

    def delete(self, key: str) -> None:
        self._items.pop(key, None)

    def clear_tags(self, *tags: str) -> int:
        wanted = set(tags)
        remove = [key for key, item in self._items.items() if item.tags & wanted]
        for key in remove:
            self._items.pop(key, None)
        return len(remove)

    def purge(self) -> None:
        now = time.monotonic()
        expired = [key for key, item in self._items.items() if item.expires_at <= now]
        for key in expired:
            self._items.pop(key, None)


@dataclass
class CoHostMemory:
    """Separated memory planes for a LIVE session."""

    short_term: TtlMemoryStore = field(default_factory=lambda: TtlMemoryStore(default_ttl_s=900))
    users: TtlMemoryStore = field(default_factory=lambda: TtlMemoryStore(default_ttl_s=86_400))
    topics: TtlMemoryStore = field(default_factory=lambda: TtlMemoryStore(default_ttl_s=3600))
    gifts: TtlMemoryStore = field(default_factory=lambda: TtlMemoryStore(default_ttl_s=86_400))
    summaries: TtlMemoryStore = field(default_factory=lambda: TtlMemoryStore(default_ttl_s=7200))
    recent_turns: deque[str] = field(default_factory=lambda: deque(maxlen=40))
    store_personal_data: bool = False

    def remember_user_message(self, user_id: str, username: str | None, text: str) -> None:
        safe_name = username if self.store_personal_data else None
        history = list(self.users.get(user_id) or [])
        history.append({"text": text[:280], "username": safe_name, "at": time.time()})
        self.users.put(user_id, history[-20:], tags={"user"})
        self.short_term.put(f"last:{user_id}", text[:280], ttl_s=600, tags={"short"})
        self.recent_turns.append(f"viewer:{user_id}:{text[:120]}")

    def remember_host_utterance(self, text: str) -> None:
        self.short_term.put("host:last", text[:500], ttl_s=300, tags={"host", "short"})
        self.recent_turns.append(f"host:{text[:120]}")

    def remember_gift(self, user_id: str, gift_name: str, diamonds: int | None) -> None:
        key = f"gift:{user_id}"
        items = list(self.gifts.get(key) or [])
        items.append({"gift": gift_name, "diamonds": diamonds, "at": time.time()})
        self.gifts.put(key, items[-30:], tags={"gift"})

    def remember_topic(self, topic: str) -> None:
        self.topics.put(topic.lower()[:64], {"topic": topic, "at": time.time()}, tags={"topic"})

    def summarize(self, text: str) -> None:
        self.summaries.put("session_summary", text[:2000], tags={"summary"})

    def forget_user(self, user_id: str) -> None:
        self.users.delete(user_id)
        self.gifts.delete(f"gift:{user_id}")
        self.short_term.delete(f"last:{user_id}")

    def export_safe_context(self, user_id: str | None = None) -> dict[str, Any]:
        ctx: dict[str, Any] = {
            "recent_turns": list(self.recent_turns)[-12:],
            "host_last": self.short_term.get("host:last"),
            "summary": self.summaries.get("session_summary"),
        }
        if user_id:
            ctx["user_history"] = self.users.get(user_id) or []
            ctx["user_gifts"] = self.gifts.get(f"gift:{user_id}") or []
        return ctx
