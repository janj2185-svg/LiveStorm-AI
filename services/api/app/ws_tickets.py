"""One-time WebSocket tickets for browser clients that cannot set Authorization headers."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from typing import Any

from fastapi import Request, WebSocket

from app.errors import APIError
from app.gift_schemas import WebSocketTicketResponse
from app.rate_limit import rate_limit


async def mint_websocket_ticket(
    request: Request,
    *,
    user_id: uuid.UUID,
    namespace: str,
    rate_bucket: str,
    unavailable_code: str,
    unavailable_title: str,
    limit: int = 20,
    window_seconds: int = 60,
    ttl_seconds: int = 60,
) -> WebSocketTicketResponse:
    await rate_limit(
        request,
        bucket=rate_bucket,
        subject=str(user_id),
        limit=limit,
        window_seconds=window_seconds,
        unavailable_detail=f"{unavailable_title} is temporarily unavailable.",
    )
    raw_ticket = secrets.token_urlsafe(32)
    digest = hashlib.sha256(raw_ticket.encode()).hexdigest()
    key = f"sylora:{namespace}-ws-ticket:{digest}"
    try:
        stored = await request.app.state.redis.set(key, str(user_id), ex=ttl_seconds, nx=True)
    except Exception as exc:
        raise APIError(
            503,
            unavailable_code,
            unavailable_title,
            "The one-time realtime ticket store is unavailable.",
        ) from exc
    if not stored:
        raise APIError(
            503,
            unavailable_code,
            unavailable_title,
            "A one-time realtime ticket could not be issued.",
        )
    return WebSocketTicketResponse(ticket=raw_ticket, expires_in_seconds=ttl_seconds)


async def consume_websocket_ticket(
    websocket: WebSocket,
    ticket: str,
    *,
    namespace: str,
    unavailable_code: str,
    unavailable_title: str,
) -> uuid.UUID:
    digest = hashlib.sha256(ticket.encode()).hexdigest()
    key = f"sylora:{namespace}-ws-ticket:{digest}"
    redis: Any = websocket.app.state.redis
    try:
        if hasattr(redis, "getdel"):
            value = await redis.getdel(key)
        else:
            value = await redis.get(key)
            if value is not None:
                await redis.delete(key)
    except Exception as exc:
        raise APIError(
            503,
            unavailable_code,
            unavailable_title,
            "The one-time realtime ticket could not be consumed.",
        ) from exc
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise APIError(
            401,
            "invalid_realtime_ticket",
            "Invalid realtime ticket",
            "Request a new one-time realtime ticket.",
        ) from exc
