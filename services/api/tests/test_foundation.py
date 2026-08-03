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
    assert ready.headers["x-frame-options"] == "DENY"

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


def test_oauth_provider_accepts_aliases_and_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_GITHUB_ID", "github-client")
    monkeypatch.setenv("AUTH_GITHUB_SECRET", "github-secret")
    monkeypatch.delenv("OAUTH_GITHUB_CLIENT_ID", raising=False)
    monkeypatch.delenv("OAUTH_GITHUB_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("OAUTH_GITHUB_DISCOVERY_URL", raising=False)
    monkeypatch.delenv("OAUTH_GITHUB_REDIRECT_URI", raising=False)

    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///oauth-alias.db",
        redis_url="memory://",
        jwt_secret="unit-test-jwt-key-with-more-than-thirty-two-characters",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        web_base_url="https://getsylora.com",
    )
    github = settings.oauth_provider("github")
    assert github is not None
    assert github.client_id == "github-client"
    assert github.client_secret.get_secret_value() == "github-secret"
    assert github.discovery_url == "builtin:github"
    assert github.redirect_uri == "https://getsylora.com/v1/auth/oauth/github/callback"
    assert "user:email" in github.scopes

    monkeypatch.setenv("GOOGLE_CLIENT_ID", "google-client")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "google-secret")
    google = settings.oauth_provider("google")
    assert google is not None
    assert google.discovery_url.endswith("/.well-known/openid-configuration")
    assert google.redirect_uri.endswith("/v1/auth/oauth/google/callback")

    assert settings.oauth_provider("apple") is None


async def test_github_oauth_start_redirects_with_builtin_discovery(
    api_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AUTH_GITHUB_ID", "github-client")
    monkeypatch.setenv("AUTH_GITHUB_SECRET", "github-secret")
    async with api_factory() as harness:
        response = await harness.client.get(
            "/v1/auth/oauth/github/start", follow_redirects=False
        )
        assert response.status_code == 307
        location = response.headers["location"]
        assert location.startswith("https://github.com/login/oauth/authorize?")
        assert "client_id=github-client" in location
        assert "code_challenge=" in location
        assert "redirect_uri=" in location


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
