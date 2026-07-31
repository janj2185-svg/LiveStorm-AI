from __future__ import annotations

import secrets
import time

from fastapi import Request

from app.errors import APIError
from app.security import ip_hash

SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
redis.call('ZADD', key, now, member)
local count = redis.call('ZCARD', key)
redis.call('PEXPIRE', key, window)
return count
"""


async def auth_rate_limit(request: Request) -> None:
    settings = request.app.state.settings
    redis_client = request.app.state.redis
    now_ms = int(time.time() * 1000)
    window_ms = settings.auth_rate_window_seconds * 1000
    client_ip = request.client.host if request.client else None
    key = f"sylora:rate:auth:{request.url.path}:{ip_hash(client_ip, settings)}"
    member = f"{now_ms}:{request.state.request_id}:{secrets.token_hex(4)}"
    try:
        if hasattr(redis_client, "sliding_window_hit"):
            count = await redis_client.sliding_window_hit(key, now_ms, window_ms, member)
        else:
            count = await redis_client.eval(SLIDING_WINDOW_LUA, 1, key, now_ms, window_ms, member)
    except Exception as exc:
        if settings.environment == "production":
            raise APIError(
                503,
                "rate_limit_unavailable",
                "Authentication temporarily unavailable",
                "Authentication safety controls are temporarily unavailable.",
            ) from exc
        return

    if int(count) > settings.auth_rate_limit:
        raise APIError(
            429,
            "rate_limit_exceeded",
            "Too many requests",
            "Try again after the rate-limit window has elapsed.",
            headers={"Retry-After": str(settings.auth_rate_window_seconds)},
        )
