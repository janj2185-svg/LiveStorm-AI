"""Normalize provider payloads into TikTokNormalizedEvent."""

from __future__ import annotations

import hashlib
import json
import time
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

from app.tiktok_live.events import TikTokEventType, TikTokNormalizedEvent

_TYPE_ALIASES: dict[str, TikTokEventType] = {
    "connected": TikTokEventType.connected,
    "disconnected": TikTokEventType.disconnected,
    "chat": TikTokEventType.chat_message,
    "chat_message": TikTokEventType.chat_message,
    "comment": TikTokEventType.chat_message,
    "like": TikTokEventType.like,
    "gift": TikTokEventType.gift,
    "gift_streak": TikTokEventType.gift_streak,
    "gift_combo": TikTokEventType.gift_streak,
    "follow": TikTokEventType.follow,
    "share": TikTokEventType.share,
    "subscribe": TikTokEventType.subscribe,
    "subscription": TikTokEventType.subscribe,
    "member": TikTokEventType.viewer_join,
    "viewer_join": TikTokEventType.viewer_join,
    "join": TikTokEventType.viewer_join,
    "viewer_leave": TikTokEventType.viewer_leave,
    "leave": TikTokEventType.viewer_leave,
    "room": TikTokEventType.room_statistics,
    "room_statistics": TikTokEventType.room_statistics,
    "roomUser": TikTokEventType.room_statistics,
    "viewerCount": TikTokEventType.room_statistics,
    "moderation": TikTokEventType.moderation,
    "stream_ended": TikTokEventType.stream_ended,
    "streamEnd": TikTokEventType.stream_ended,
    "control": TikTokEventType.stream_ended,
    "reconnect": TikTokEventType.reconnect,
    "error": TikTokEventType.provider_error,
    "provider_error": TikTokEventType.provider_error,
}


class DefaultTikTokEventNormalizer:
    source = "tiktok"

    def normalize(
        self,
        raw: Mapping[str, Any],
        *,
        sequence_number: int,
        received_at_ms: int | None = None,
    ) -> TikTokNormalizedEvent | None:
        event_type_raw = str(raw.get("type") or raw.get("event") or raw.get("eventType") or "")
        event_type = _TYPE_ALIASES.get(event_type_raw)
        if event_type is None:
            return None

        user = raw.get("user") if isinstance(raw.get("user"), Mapping) else {}
        user_id = _as_optional_str(
            raw.get("userId") or raw.get("user_id") or user.get("userId") or user.get("id")
        )
        username = _as_optional_str(
            raw.get("username")
            or raw.get("uniqueId")
            or user.get("uniqueId")
            or user.get("username")
        )
        display_name = _as_optional_str(
            raw.get("displayName")
            or raw.get("nickname")
            or user.get("nickname")
            or user.get("displayName")
            or username
        )
        room_id = _as_optional_str(raw.get("roomId") or raw.get("room_id"))
        provider_event_id = _as_optional_str(
            raw.get("eventId") or raw.get("msgId") or raw.get("messageId") or raw.get("id")
        )
        payload = _safe_payload(raw)
        dedupe_seed = provider_event_id or hashlib.sha256(
            json.dumps(payload, sort_keys=True, default=str).encode()
        ).hexdigest()
        dedupe_key = f"tiktok:{event_type.value}:{room_id or '-'}:{dedupe_seed}"

        occurred = _parse_timestamp(raw.get("timestamp") or raw.get("createTime"))
        latency_ms = None
        if received_at_ms is not None and occurred is not None:
            latency_ms = max(0, int(received_at_ms - occurred.timestamp() * 1000))

        confidence = float(raw.get("confidence") or 1.0)
        confidence = max(0.0, min(1.0, confidence))

        return TikTokNormalizedEvent(
            event_id=TikTokNormalizedEvent.new_id(),
            source=self.source,
            type=event_type,
            timestamp=occurred or TikTokNormalizedEvent.now(),
            room_id=room_id,
            user_id=user_id,
            username=username,
            display_name=display_name,
            payload=payload,
            raw_provider_event=dict(raw),
            deduplication_key=dedupe_key,
            sequence_number=sequence_number,
            confidence=confidence,
            provider_latency_ms=latency_ms,
        )


def _as_optional_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _parse_timestamp(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        # TikTok often uses ms epochs.
        ts = float(value)
        if ts > 10_000_000_000:
            ts /= 1000.0
        return datetime.fromtimestamp(ts, tz=UTC)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _safe_payload(raw: Mapping[str, Any]) -> dict[str, Any]:
    """Drop obvious secret-bearing keys from hub-facing payload."""
    blocked = {
        "cookie",
        "cookies",
        "sessionid",
        "session_id",
        "access_token",
        "refresh_token",
        "api_key",
        "authorization",
        "password",
        "secret",
    }
    payload: dict[str, Any] = {}
    for key, value in raw.items():
        if str(key).lower() in blocked:
            continue
        if key in {"type", "event", "eventType", "user", "timestamp", "createTime"}:
            # Keep structured copies below where useful.
            continue
        payload[str(key)] = value
    # Preserve commonly needed chat/gift fields explicitly.
    for key in (
        "comment",
        "text",
        "giftId",
        "giftName",
        "diamondCount",
        "repeatCount",
        "repeatEnd",
        "likeCount",
        "totalLikeCount",
        "viewerCount",
        "actionId",
        "code",
        "message",
    ):
        if key in raw:
            payload[key] = raw[key]
    if isinstance(raw.get("user"), Mapping):
        user = raw["user"]
        payload["user"] = {
            k: user.get(k)
            for k in ("userId", "id", "uniqueId", "username", "nickname", "displayName")
            if k in user
        }
    payload.setdefault("received_monotonic_ms", int(time.time() * 1000))
    return payload
