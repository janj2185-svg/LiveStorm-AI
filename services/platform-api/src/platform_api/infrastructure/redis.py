import json
from collections.abc import AsyncGenerator
from functools import lru_cache
from typing import Any

import redis.asyncio as redis

from platform_api.config import get_settings

NOTIFICATION_CHANNEL = "sylora:notifications"


@lru_cache
def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(str(settings.redis_url), decode_responses=True)


async def ping_redis() -> bool:
    client = get_redis()
    return bool(await client.ping())


async def publish_notification_event(user_id: str, payload: dict[str, Any]) -> None:
    client = get_redis()
    await client.publish(NOTIFICATION_CHANNEL, json.dumps({"user_id": user_id, "payload": payload}))


async def subscribe_notifications() -> AsyncGenerator[redis.client.PubSub, None]:
    client = get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe(NOTIFICATION_CHANNEL)
    yield pubsub
    await pubsub.unsubscribe(NOTIFICATION_CHANNEL)
    await pubsub.close()
