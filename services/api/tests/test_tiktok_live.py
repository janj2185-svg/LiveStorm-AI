"""Unit/contract tests for the new TikTok LIVE package (fake transport is test-only)."""

from __future__ import annotations

import asyncio
import time

import pytest

from app.live_models import LiveNormalizedEventType
from app.tiktok_live.auth import BlockedTikTokAuthProvider, ConfiguredApprovedAuthProvider
from app.tiktok_live.cohost import DialogueScheduler, SchedulerConfig
from app.tiktok_live.connection import TikTokLiveConnectionManager
from app.tiktok_live.events import TikTokEventType
from app.tiktok_live.hub_bridge import to_adapter_inbound
from app.tiktok_live.interfaces import TikTokAuthMaterial, TikTokConnectRequest
from app.tiktok_live.normalizer import DefaultTikTokEventNormalizer
from app.tiktok_live.output import CoHostOutputOrchestrator
from app.tiktok_live.reliability import (
    CircuitBreaker,
    EventDeduplicator,
    ExponentialBackoffReconnectManager,
    TokenBucketRateLimiter,
)
from app.tiktok_live.status import TikTokIntegrationStatus, current_status
from app.tiktok_live.transport import BlockedTikTokTransport, FakeTikTokTransport


def test_status_is_blocked_by_provider_access() -> None:
    assert current_status() is TikTokIntegrationStatus.BLOCKED_BY_PROVIDER_ACCESS


def test_fake_transport_forbidden_outside_tests() -> None:
    with pytest.raises(RuntimeError, match="forbidden"):
        TikTokLiveConnectionManager(
            auth_provider=ConfiguredApprovedAuthProvider(
                provider_name="test", api_key="k", approved=True
            ),
            transport=FakeTikTokTransport(),
            allow_test_transport=False,
        )


@pytest.mark.asyncio
async def test_blocked_auth_and_transport() -> None:
    auth = BlockedTikTokAuthProvider()
    assert auth.is_approved() is False
    with pytest.raises(PermissionError):
        await auth.resolve(TikTokConnectRequest(account="demo"))
    transport = BlockedTikTokTransport()
    with pytest.raises(PermissionError):
        await transport.connect(
            TikTokConnectRequest(account="demo"),
            TikTokAuthMaterial(provider="blocked"),
        )


def test_event_normalization_contract() -> None:
    normalizer = DefaultTikTokEventNormalizer()
    event = normalizer.normalize(
        {
            "type": "chat",
            "msgId": "m-1",
            "roomId": "room-9",
            "comment": "hello from chat",
            "user": {"userId": "u1", "uniqueId": "alice", "nickname": "Alice"},
            "timestamp": 1_700_000_000_000,
            "cookie": "SECRET_SHOULD_STRIP",
        },
        sequence_number=3,
        received_at_ms=1_700_000_000_500,
    )
    assert event is not None
    assert event.type is TikTokEventType.chat_message
    assert event.sequence_number == 3
    assert event.username == "alice"
    assert event.display_name == "Alice"
    assert event.room_id == "room-9"
    assert "cookie" not in event.payload
    assert event.provider_latency_ms == 500
    inbound = to_adapter_inbound(event)
    assert inbound.event_type is LiveNormalizedEventType.chat
    assert inbound.text == "hello from chat"
    assert inbound.actor_platform_id == "u1"


def test_gift_streak_and_like_normalization() -> None:
    normalizer = DefaultTikTokEventNormalizer()
    gift = normalizer.normalize(
        {
            "type": "gift_combo",
            "id": "g1",
            "giftName": "Rose",
            "diamondCount": 1,
            "repeatCount": 5,
            "repeatEnd": False,
            "user": {"id": "u2", "uniqueId": "bob"},
        },
        sequence_number=1,
    )
    assert gift is not None
    assert gift.type is TikTokEventType.gift_streak
    inbound = to_adapter_inbound(gift)
    assert inbound.event_type is LiveNormalizedEventType.platform_gift
    assert inbound.monetary_minor == 1


def test_deduplication() -> None:
    dedupe = EventDeduplicator(capacity=2)
    assert dedupe.seen_before("a") is False
    assert dedupe.seen_before("a") is True
    assert dedupe.duplicate_count == 1
    assert dedupe.seen_before("b") is False
    assert dedupe.seen_before("c") is False
    # capacity eviction
    assert dedupe.seen_before("a") is False


def test_reconnect_backoff_increases() -> None:
    mgr = ExponentialBackoffReconnectManager(base=1, maximum=30, jitter=0)
    d1 = mgr.next_delay_seconds(1)
    d3 = mgr.next_delay_seconds(3)
    assert d3 >= d1
    mgr.reset()
    assert mgr.next_delay_seconds(0) <= 1.0 + 1e-9


@pytest.mark.asyncio
async def test_rate_limiter() -> None:
    limiter = TokenBucketRateLimiter(rate_per_second=1, burst=1)
    assert await limiter.allow("k") is True
    assert await limiter.allow("k") is False


def test_circuit_breaker_opens() -> None:
    breaker = CircuitBreaker(failure_threshold=2, reset_timeout_s=60)
    assert breaker.allow() is True
    breaker.failure()
    breaker.failure()
    assert breaker.open is True
    breaker.success()
    assert breaker.open is False


@pytest.mark.asyncio
async def test_connection_manager_with_fake_events_and_dedupe() -> None:
    transport = FakeTikTokTransport(
        [
            {
                "type": "chat",
                "msgId": "dup-1",
                "comment": "hi",
                "user": {"userId": "1", "uniqueId": "n1", "nickname": "N1"},
                "roomId": "r1",
            },
            {
                "type": "chat",
                "msgId": "dup-1",
                "comment": "hi",
                "user": {"userId": "1", "uniqueId": "n1", "nickname": "N1"},
                "roomId": "r1",
            },
            {
                "type": "gift",
                "id": "gift-1",
                "giftName": "Rose",
                "diamondCount": 1,
                "user": {"userId": "2", "uniqueId": "n2"},
                "roomId": "r1",
            },
        ]
    )
    auth = ConfiguredApprovedAuthProvider(provider_name="test", api_key="k", approved=True)
    manager = TikTokLiveConnectionManager(
        auth_provider=auth,
        transport=transport,
        allow_test_transport=True,
    )
    await manager.start(TikTokConnectRequest(account="tester", room_id="r1"))
    events = []
    async def collect() -> None:
        async for event in manager.normalized_events():
            events.append(event)
            if len(events) >= 3:  # connected + chat + gift (dup skipped)
                break

    try:
        await asyncio.wait_for(collect(), timeout=2)
    finally:
        await manager.stop()
    types = [event.type for event in events]
    assert TikTokEventType.connected in types
    assert TikTokEventType.chat_message in types
    assert TikTokEventType.gift in types
    assert manager.diagnostics()["duplicates"] >= 1


def test_dialogue_scheduler_host_interrupt_and_gift() -> None:
    scheduler = DialogueScheduler(config=SchedulerConfig(respond_to_gifts=True))
    interrupt = scheduler.note_host_speaking(True, transcript="hold on")
    assert interrupt is not None
    assert interrupt.interrupt_tts is True
    normalizer = DefaultTikTokEventNormalizer()
    gift = normalizer.normalize(
        {
            "type": "gift",
            "id": "g",
            "giftName": "Rose",
            "diamondCount": 5,
            "user": {"userId": "u", "uniqueId": "giver", "nickname": "Giver"},
        },
        sequence_number=1,
    )
    assert gift is not None
    # Still host speaking → yield
    decision = scheduler.evaluate(gift, now=time.time())
    assert decision.should_respond is False
    assert decision.yield_to_host is True
    scheduler.note_host_speaking(False)
    decision = scheduler.evaluate(gift, now=time.time())
    assert decision.should_respond is True
    assert decision.priority == 1
    assert decision.avatar_reaction == "gift_react"


def test_dialogue_scheduler_skips_toxic_and_respects_mute() -> None:
    scheduler = DialogueScheduler()
    normalizer = DefaultTikTokEventNormalizer()
    toxic = normalizer.normalize(
        {
            "type": "chat",
            "msgId": "t1",
            "comment": "go kill yourself",
            "user": {"userId": "x", "uniqueId": "x"},
        },
        sequence_number=1,
    )
    assert toxic is not None
    assert scheduler.evaluate(toxic, now=time.time()).reason == "toxic_or_unsafe"
    scheduler.config.muted = True
    chat = normalizer.normalize(
        {
            "type": "chat",
            "msgId": "t2",
            "comment": "hello?",
            "user": {"userId": "y", "uniqueId": "y"},
        },
        sequence_number=2,
    )
    assert chat is not None
    assert scheduler.evaluate(chat, now=time.time()).reason == "muted"


@pytest.mark.asyncio
async def test_output_orchestrator_tts_interrupt_and_sync() -> None:
    orch = CoHostOutputOrchestrator()
    scheduler = DialogueScheduler()
    normalizer = DefaultTikTokEventNormalizer()
    chat = normalizer.normalize(
        {
            "type": "chat",
            "msgId": "c1",
            "comment": "how are you?",
            "user": {"userId": "u", "uniqueId": "viewer", "nickname": "Viewer"},
        },
        sequence_number=1,
    )
    assert chat is not None
    decision = scheduler.evaluate(chat, now=time.time())
    plan = await orch.apply(decision, reply_text="Hey Viewer, I'm great!")
    assert plan.audio_reference
    assert plan.avatar_reaction == "talk"
    assert plan.obs_event == "cohost.reply"
    interrupt = scheduler.note_host_speaking(True)
    assert interrupt is not None
    await orch.apply(interrupt, reply_text="")
    assert orch.tts.interrupted is True  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_load_chat_burst_rate_limit_does_not_crash() -> None:
    transport = FakeTikTokTransport(
        [
            {
                "type": "chat",
                "msgId": f"m-{i}",
                "comment": f"msg {i}",
                "user": {"userId": str(i), "uniqueId": f"u{i}"},
                "roomId": "r",
            }
            for i in range(200)
        ]
    )
    manager = TikTokLiveConnectionManager(
        auth_provider=ConfiguredApprovedAuthProvider(
            provider_name="test", api_key="k", approved=True
        ),
        transport=transport,
        allow_test_transport=True,
        rate_limiter=TokenBucketRateLimiter(rate_per_second=1000, burst=50),
    )
    await manager.start(TikTokConnectRequest(account="load", room_id="r"))
    seen = 0

    async def drain() -> None:
        nonlocal seen
        async for _event in manager.normalized_events():
            seen += 1
            if seen >= 40:
                break

    try:
        await asyncio.wait_for(drain(), timeout=3)
    finally:
        await manager.stop()
    assert seen >= 40
    # Some may be rate-limited depending on timing; ensure metrics exist.
    assert "rate_limited" in manager.metrics
