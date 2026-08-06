from functools import lru_cache

import redis.asyncio as redis

from platform_api.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(str(settings.redis_url), decode_responses=True)


async def ping_redis() -> bool:
    client = get_redis()
    return bool(await client.ping())
