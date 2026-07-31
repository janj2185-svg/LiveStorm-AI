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
    client_ip = request.client.host if request.client else None
    await rate_limit(
        request,
        bucket=f"auth:{request.url.path}",
        subject=ip_hash(client_ip, settings),
        limit=settings.auth_rate_limit,
        window_seconds=settings.auth_rate_window_seconds,
        unavailable_detail="Authentication safety controls are temporarily unavailable.",
    )


async def rate_limit(
    request: Request,
    *,
    bucket: str,
    subject: str,
    limit: int,
    window_seconds: int,
    unavailable_detail: str = "Abuse-prevention controls are temporarily unavailable.",
) -> None:
    settings = request.app.state.settings
    redis_client = request.app.state.redis
    now_ms = int(time.time() * 1000)
    window_ms = window_seconds * 1000
    key = f"sylora:rate:{bucket}:{subject}"
    request_id = getattr(request.state, "request_id", "unknown")
    member = f"{now_ms}:{request_id}:{secrets.token_hex(4)}"
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
                "Service temporarily unavailable",
                unavailable_detail,
            ) from exc
        return

    if int(count) > limit:
        raise APIError(
            429,
            "rate_limit_exceeded",
            "Too many requests",
            "Try again after the rate-limit window has elapsed.",
            headers={"Retry-After": str(window_seconds)},
        )
