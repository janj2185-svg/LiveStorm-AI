"""Map NormalizedLiveEvent → AdapterInboundEvent for LiveEventHub."""

from __future__ import annotations

from app.live_models import LiveNormalizedEventType
from app.live_platforms.common.events import NormalizedLiveEvent, NormalizedLiveEventType

_TYPE_MAP: dict[NormalizedLiveEventType, LiveNormalizedEventType] = {
    NormalizedLiveEventType.chat_message: LiveNormalizedEventType.chat,
    NormalizedLiveEventType.like: LiveNormalizedEventType.like,
    NormalizedLiveEventType.gift: LiveNormalizedEventType.platform_gift,
    NormalizedLiveEventType.gift_streak: LiveNormalizedEventType.platform_gift,
    NormalizedLiveEventType.follow: LiveNormalizedEventType.follow,
    NormalizedLiveEventType.share: LiveNormalizedEventType.custom,
    NormalizedLiveEventType.subscribe: LiveNormalizedEventType.subscription,
    NormalizedLiveEventType.viewer_join: LiveNormalizedEventType.viewer_join,
    NormalizedLiveEventType.viewer_leave: LiveNormalizedEventType.custom,
    NormalizedLiveEventType.room_statistics: LiveNormalizedEventType.custom,
    NormalizedLiveEventType.moderation: LiveNormalizedEventType.moderation,
    NormalizedLiveEventType.stream_ended: LiveNormalizedEventType.stream_status,
    NormalizedLiveEventType.connected: LiveNormalizedEventType.stream_status,
    NormalizedLiveEventType.disconnected: LiveNormalizedEventType.stream_status,
    NormalizedLiveEventType.reconnect: LiveNormalizedEventType.stream_status,
    NormalizedLiveEventType.provider_error: LiveNormalizedEventType.custom,
    NormalizedLiveEventType.member: LiveNormalizedEventType.viewer_join,
    NormalizedLiveEventType.unknown: LiveNormalizedEventType.custom,
}


def to_adapter_inbound(event: NormalizedLiveEvent):
    from app.live_adapters import AdapterInboundEvent

    event_type = _TYPE_MAP.get(event.type, LiveNormalizedEventType.custom)
    text = None
    if event.type is NormalizedLiveEventType.chat_message:
        text = _as_str(event.payload.get("comment") or event.payload.get("text"))
    monetary = None
    if event.type in {NormalizedLiveEventType.gift, NormalizedLiveEventType.gift_streak}:
        diamonds = event.payload.get("diamondCount")
        if isinstance(diamonds, int):
            monetary = diamonds
    metadata = {
        "source": event.source,
        "platform_event_type": event.type.value,
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