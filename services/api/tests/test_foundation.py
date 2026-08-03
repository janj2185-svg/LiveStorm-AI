from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi import Request
from pydantic import ValidationError

from app.config import Settings
from app.errors import APIError
from app.rate_limit import auth_rate_limit
from tests.conftest import FakeRedis


async def test_health_metrics_problem_details_and_security_headers(api) -> None:
    live = await api.client.get("/health/live")
    ready = await api.client.get("/health/ready")
    assert live.json() == {"status": "live"}
    assert ready.json() == {"status": "ready"}
    assert ready.headers["x-content-type-options"] == "nosniff"
    assert ready.headers["x-frame-options"] == "DENY"
    assert ready.headers["referrer-policy"] == "no-referrer"
    assert ready.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
    assert "content-security-policy" not in ready.headers
    assert "strict-transport-security" not in ready.headers

    invalid = await api.client.post("/v1/auth/login", json={"email": "bad"})
    assert invalid.status_code == 422
    assert invalid.headers["content-type"].startswith("application/problem+json")
    assert invalid.json()["type"].endswith("/validation_error")
    assert invalid.json()["request_id"]

    metrics = await api.client.get("/metrics")
    assert metrics.status_code == 200
    assert "sylora_http_requests_total" in metrics.text
    assert 'route="/health/live"' in metrics.text
    assert "sylora_http_request_duration_seconds" in metrics.text


async def test_slo_snapshot_increments_http_counter_and_reports_dependencies(api) -> None:
    baseline = await api.client.get("/v1/diagnostics/slo")
    assert baseline.status_code == 200, baseline.text
    assert baseline.headers["x-frame-options"] == "DENY"
    baseline_body = baseline.json()
    baseline_requests = baseline_body["counters"]["http_requests"]

    health = await api.client.get("/health/live")
    assert health.status_code == 200

    updated = await api.client.get("/v1/diagnostics/slo")
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["counters"]["http_requests"] >= baseline_requests + 2
    assert set(body["counters"]) == {
        "http_requests",
        "ai_chat_turns",
        "gift_sends",
        "live_sessions_started",
        "push_skipped",
    }
    assert body["uptime_seconds"] >= 0
    assert body["dependencies"]["db"]["ok"] is True
    assert body["dependencies"]["redis"]["ok"] is True
    assert set(body["dependencies"]) == {"db", "redis", "s3", "payments", "push", "ai_vector"}


async def test_body_size_limit_is_enforced(api_factory) -> None:
    async with api_factory(max_body_bytes=16_384) as limited:
        response = await limited.client.post(
            "/v1/auth/login",
            content=b"x" * 16_385,
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 413
        assert response.json()["code"] == "body_too_large"


async def test_auth_rate_limit_sliding_window(api_factory) -> None:
    async with api_factory(auth_rate_limit=2) as limited:
        payload = {
            "email": "unknown@example.com",
            "password": "CorrectHorse!2026",
        }
        first = await limited.client.post("/v1/auth/login", json=payload)
        second = await limited.client.post("/v1/auth/login", json=payload)
        third = await limited.client.post("/v1/auth/login", json=payload)
        assert first.status_code == second.status_code == 401
        assert third.status_code == 429
        assert third.json()["code"] == "rate_limit_exceeded"
        assert third.headers["retry-after"] == "60"


async def test_production_rate_limiter_fails_closed_when_redis_is_down() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        database_url="postgresql+asyncpg://sylora:db-password@db:5432/sylora",
        redis_url="rediss://redis:6379/0",
        jwt_secret="production-signing-key-with-high-entropy-value-2026",
        jwt_issuer="https://api.sylora.example",
        jwt_audience="sylora-api",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        ip_hash_key="separate-production-ip-hash-key-material",
        cors_origins=["https://app.sylora.example"],
        allowed_hosts=["api.sylora.example"],
        smtp_host="smtp.sylora.example",
        smtp_from_email="no-reply@sylora.com",
        smtp_start_tls=True,
        web_base_url="https://app.sylora.example",
    )
    redis = FakeRedis()
    redis.available = False
    application = SimpleNamespace(state=SimpleNamespace(settings=settings, redis=redis))
    scope = {
        "type": "http",
        "method": "POST",
        "scheme": "https",
        "path": "/v1/auth/login",
        "raw_path": b"/v1/auth/login",
        "query_string": b"",
        "headers": [],
        "client": ("203.0.113.10", 443),
        "server": ("api.sylora.example", 443),
        "app": application,
    }
    request = Request(scope)
    request.state.request_id = "rate-test"
    with pytest.raises(APIError) as error:
        await auth_rate_limit(request)
    assert error.value.status_code == 503
    assert error.value.code == "rate_limit_unavailable"


async def test_unconfigured_oauth_provider_returns_capability_error(api) -> None:
    response = await api.client.get("/v1/auth/oauth/unconfigured/start", follow_redirects=False)
    assert response.status_code == 503
    assert response.json()["code"] == "oauth_provider_unavailable"


def test_production_configuration_rejects_missing_capabilities() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url="sqlite+aiosqlite:///not-production.db",
            redis_url="memory://",
            jwt_secret="weak-secret",
            data_encryption_key="not-a-fernet-key",
            cors_origins=["*"],
            allowed_hosts=["*"],
        )
