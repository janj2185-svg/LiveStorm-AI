from __future__ import annotations

import pytest

from sylora_companion.events import EventBus


@pytest.mark.asyncio
async def test_event_sequence_replay_and_gap() -> None:
    events = EventBus(replay_limit=2, subscriber_queue_limit=1)
    first = await events.publish("obs.First", {"value": 1})
    second = await events.publish("obs.Second", {"value": 2})
    third = await events.publish("obs.Third", {"value": 3})
    assert [first.sequence, second.sequence, third.sequence] == [1, 2, 3]

    replay = await events.replay(0)
    assert replay.truncated is True
    assert replay.oldest_sequence == 2
    assert replay.latest_sequence == 3
    assert [event.sequence for event in replay.events] == [2, 3]

    incremental = await events.replay(2)
    assert incremental.truncated is False
    assert [event.type for event in incremental.events] == ["obs.Third"]


@pytest.mark.asyncio
async def test_subscriber_queue_drops_oldest_when_bounded() -> None:
    events = EventBus(replay_limit=4, subscriber_queue_limit=1)
    queue = await events.subscribe()
    await events.publish("obs.First", {})
    latest = await events.publish("obs.Latest", {})
    assert await queue.get() == latest
    await events.unsubscribe(queue)
