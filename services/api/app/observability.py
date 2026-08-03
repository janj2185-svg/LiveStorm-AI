from __future__ import annotations

import logging
import re
import threading
import time
import uuid
from collections.abc import Mapping
from typing import Any

from fastapi import Request, Response
from prometheus_client import Counter, Histogram
from sqlalchemy import text

from app.config import Settings

logger = logging.getLogger("sylora.requests")

REQUESTS = Counter(
    "sylora_http_requests_total",
    "HTTP requests",
    ("method", "route", "status"),
)
LATENCY = Histogram(
    "sylora_http_request_duration_seconds",
    "HTTP request latency",
    ("method", "route"),
)

REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")
COUNTER_NAMES = (
    "http_requests",
    "ai_chat_turns",
    "gift_sends",
    "live_sessions_started",
    "push_skipped",
)


class InProcessMetrics:
    def __init__(self, names: tuple[str, ...]) -> None:
        self._lock = threading.Lock()
        self._started_at = time.time()
        self._counters = dict.fromkeys(names, 0)

    def increment(self, name: str, amount: int = 1) -> int:
        if name not in self._counters:
            raise KeyError(f"unknown metric counter: {name}")
        if amount < 0:
            raise ValueError("metric increments must be non-negative")
        with self._lock:
            self._counters[name] += amount
            return self._counters[name]

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return dict(self._counters)

    def uptime_seconds(self) -> float:
        return max(0.0, time.time() - self._started_at)


metrics = InProcessMetrics(COUNTER_NAMES)


def request_id_from_headers(headers: Mapping[str, str]) -> str:
    supplied = headers.get("x-request-id", "")
    return supplied if REQUEST_ID_PATTERN.fullmatch(supplied) else str(uuid.uuid4())


def route_for_request(request: Request) -> str:
    route_obj = request.scope.get("route")
    return getattr(route_obj, "path", request.url.path)


def record_http_request(method: str, route: str, status_code: int, duration_seconds: float) -> None:
    REQUESTS.labels(method, route, str(status_code)).inc()
    LATENCY.labels(method, route).observe(duration_seconds)
    metrics.increment("http_requests")


def log_request_completed(
    *,
    request_id: str,
    method: str,
    path: str,
    route: str,
    status: int,
    duration_ms: float,
) -> None:
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "method": method,
            "path": path,
            "route": route,
            "status": status,
            "duration_ms": round(duration_ms, 2),
        },
    )


def increment_counter(name: str, amount: int = 1) -> int:
    return metrics.increment(name, amount)


async def dependency_flags(request: Request) -> dict[str, dict[str, Any]]:
    settings: Settings = request.app.state.settings

    db_ok = False
    db_detail = "unknown"
    try:
        async with request.app.state.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
        db_detail = "connected"
    except Exception as exc:  # noqa: BLE001 - diagnostics should report, not raise
        db_detail = type(exc).__name__

    redis_ok = False
    redis_detail = "unknown"
    try:
        await request.app.state.redis.ping()
        redis_ok = True
        redis_detail = "pong"
    except Exception as exc:  # noqa: BLE001 - diagnostics should report, not raise
        redis_detail = type(exc).__name__

    storage_configured = settings.s3_configured
    payment_name = getattr(request.app.state.payment_provider, "name", "unconfigured")
    push_enabled = bool(settings.push_enabled)
    push_configured = bool(
        push_enabled
        and settings.fcm_project_id
        and settings.fcm_service_account_json is not None
    )
    ai_vector_configured = settings.ai_vector_backend != "none"

    return {
        "db": {"ok": db_ok, "detail": db_detail},
        "redis": {"ok": redis_ok, "detail": redis_detail},
        "s3": {
            "ok": storage_configured,
            "configured": storage_configured,
            "detail": "configured" if storage_configured else "not_configured",
        },
        "payments": {
            "ok": payment_name != "unconfigured",
            "configured": payment_name != "unconfigured",
            "detail": payment_name,
        },
        "push": {
            "ok": push_configured,
            "configured": push_configured,
            "detail": "configured" if push_configured else "not_configured",
        },
        "ai_vector": {
            "ok": ai_vector_configured and db_ok,
            "configured": ai_vector_configured,
            "detail": settings.ai_vector_backend,
        },
    }


async def slo_snapshot(request: Request) -> dict[str, Any]:
    settings: Settings = request.app.state.settings
    return {
        "service": settings.service_name,
        "environment": settings.environment,
        "uptime_seconds": round(metrics.uptime_seconds(), 3),
        "counters": metrics.snapshot(),
        "dependencies": await dependency_flags(request),
    }


def apply_security_headers(response: Response, request: Request, settings: Settings) -> None:
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store"
    # Flutter web asset loading and OAuth/provider redirects need a carefully tested CSP.
    # Keep strict CSP disabled here until a report-only policy is tuned per deployment.
    if settings.environment != "development" and request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
