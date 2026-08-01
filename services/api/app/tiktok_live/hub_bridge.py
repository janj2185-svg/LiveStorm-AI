"""Map TikTokNormalizedEvent → AdapterInboundEvent for LiveEventHub."""

from __future__ import annotations

from app.live_models import LiveNormalizedEventType
from app.tiktok_live.events import TikTokEventType, TikTokNormalizedEvent

_TYPE_MAP: dict[TikTokEventType, LiveNormalizedEventType] = {
    TikTokEventType.chat_message: LiveNormalizedEventType.chat,
    TikTokEventType.like: LiveNormalizedEventType.like,
    TikTokEventType.gift: LiveNormalizedEventType.platform_gift,
    TikTokEventType.gift_streak: LiveNormalizedEventType.platform_gift,
    TikTokEventType.follow: LiveNormalizedEventType.follow,
    TikTokEventType.share: LiveNormalizedEventType.custom,
    TikTokEventType.subscribe: LiveNormalizedEventType.subscription,
    TikTokEventType.viewer_join: LiveNormalizedEventType.viewer_join,
    TikTokEventType.viewer_leave: LiveNormalizedEventType.custom,
    TikTokEventType.room_statistics: LiveNormalizedEventType.custom,
    TikTokEventType.moderation: LiveNormalizedEventType.moderation,
    TikTokEventType.stream_ended: LiveNormalizedEventType.stream_status,
    TikTokEventType.connected: LiveNormalizedEventType.stream_status,
    TikTokEventType.disconnected: LiveNormalizedEventType.stream_status,
    TikTokEventType.reconnect: LiveNormalizedEventType.stream_status,
    TikTokEventType.provider_error: LiveNormalizedEventType.custom,
}


def to_adapter_inbound(event: TikTokNormalizedEvent):
    from app.live_adapters import AdapterInboundEvent

    event_type = _TYPE_MAP.get(event.type, LiveNormalizedEventType.custom)
    text = None
    if event.type is TikTokEventType.chat_message:
        text = _as_str(event.payload.get("comment") or event.payload.get("text"))
    monetary = None
    if event.type in {TikTokEventType.gift, TikTokEventType.gift_streak}:
        diamonds = event.payload.get("diamondCount")
        if isinstance(diamonds, int):
            monetary = diamonds
    metadata = {
        "source": event.source,
        "tiktok_event_type": event.type.value,
        "room_id": event.room_id,
        "username": event.username,
        "deduplication_key": event.deduplication_key,
        "sequence_number": event.sequence_number,
        "confidence": event.confidence,
        "provider_latency_ms": event.provider_latency_ms,
        "payload": event.payload,
        "raw_provider_event": event.raw_provider_event,
    }
    return AdapterInboundEvent(
        platform_event_id=event.deduplication_key,
        event_type=event_type,
        occurred_at=event.timestamp,
        actor_platform_id=event.user_id,
        actor_display_name=event.display_name,
        text=text,
        monetary_minor=monetary,
        currency="TD" if monetary is not None else None,
        safe_metadata=metadata,
    )


def _as_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
