from __future__ import annotations

import os
import re
from collections import defaultdict
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import select

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:6379/15")
os.environ.setdefault("JWT_SECRET", "unit-test-jwt-key-with-more-than-thirty-two-characters")
os.environ.setdefault("DATA_ENCRYPTION_KEY", "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=")

from app.config import Settings
from app.database import create_engine
from app.main import create_app
from app.models import Base, EmailOutbox, User


class FakeRedis:
    def __init__(self) -> None:
        self.windows: dict[str, list[tuple[int, str]]] = defaultdict(list)
        self.values: dict[str, str] = {}
        self.available = True

    async def ping(self) -> bool:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        return True

    async def sliding_window_hit(self, key: str, now_ms: int, window_ms: int, member: str) -> int:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        self.windows[key] = [item for item in self.windows[key] if item[0] > now_ms - window_ms]
        self.windows[key].append((now_ms, member))
        return len(self.windows[key])

    async def set(self, key: str, value: str, *, ex: int | None = None, nx: bool = False) -> bool:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        if nx and key in self.values:
            return False
        self.values[key] = value
        return True

    async def get(self, key: str) -> str | None:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        return self.values.get(key)

    async def delete(self, key: str) -> int:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        return 1 if self.values.pop(key, None) is not None else 0

    async def getdel(self, key: str) -> str | None:
        if not self.available:
            raise ConnectionError("test Redis unavailable")
        return self.values.pop(key, None)

    async def aclose(self) -> None:
        return None


@dataclass
class APIHarness:
    client: httpx.AsyncClient
    app: Any
    redis: FakeRedis

    async def outbox_token(self, message_type: str, recipient: str = "member@example.com") -> str:
        async with self.app.state.session_factory() as session:
            message = await session.scalar(
                select(EmailOutbox)
                .where(
                    EmailOutbox.message_type == message_type,
                    EmailOutbox.recipient == recipient.strip().lower(),
                )
                .order_by(EmailOutbox.created_at.desc())
            )
            assert message is not None
            match = re.search(
                r"(?:Verification|Password reset) token: ([A-Za-z0-9_-]+)",
                message.text_body,
            )
            assert match is not None
            return match.group(1)

    async def user(self, email: str) -> User:
        async with self.app.state.session_factory() as session:
            user = await session.scalar(select(User).where(User.email == email))
            assert user is not None
            return user


@pytest.fixture
def api_factory(tmp_path: Path):
    counter = 0

    @asynccontextmanager
    async def factory(**overrides: Any) -> AsyncIterator[APIHarness]:
        nonlocal counter
        counter += 1
        app_options = {
            key: overrides.pop(key)
            for key in (
                "ai_provider_registry",
                "ai_job_dispatcher",
                "live_adapter_registry",
                "live_webhook_dispatcher",
                "object_storage",
                "payment_provider",
                "content_processor",
                "certificate_renderer",
                "content_publish_dispatcher",
            )
            if key in overrides
        }
        database_path = tmp_path / f"api-{counter}.db"
        values: dict[str, Any] = {
            "environment": "test",
            "database_url": f"sqlite+aiosqlite:///{database_path}",
            "redis_url": "redis://127.0.0.1:6379/15",
            "jwt_secret": "unit-test-jwt-key-with-more-than-thirty-two-characters",
            "jwt_issuer": "https://api.test.sylora.local",
            "jwt_audience": "sylora-tests",
            "data_encryption_key": "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
            "cors_origins": ["https://web.test.sylora.local"],
            "allowed_hosts": ["testserver"],
            "smtp_host": "127.0.0.1",
            "smtp_port": 1025,
            "smtp_from_email": "no-reply@example.com",
            "smtp_start_tls": False,
            "web_base_url": "https://web.test.sylora.local",
            "auth_rate_limit": 100,
        }
        values.update(overrides)
        settings = Settings(_env_file=None, **values)
        engine = create_engine(settings)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        fake_redis = FakeRedis()
        application = create_app(
            settings,
            engine=engine,
            redis_client=fake_redis,
            **app_options,
        )
        async with application.router.lifespan_context(application):
            transport = httpx.ASGITransport(app=application)
            async with httpx.AsyncClient(
                transport=transport, base_url="http://testserver"
            ) as client:
                yield APIHarness(client=client, app=application, redis=fake_redis)

    return factory


@pytest_asyncio.fixture
async def api(api_factory: Any) -> AsyncIterator[APIHarness]:
    async with api_factory() as harness:
        yield harness


async def register_and_verify(
    api: APIHarness,
    email: str = "member@example.com",
    password: str = "CorrectHorse!2026",
    display_name: str = "Member",
) -> None:
    response = await api.client.post(
        "/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": display_name,
        },
    )
    assert response.status_code == 202, response.text
    assert "token" not in response.text.lower()
    token = await api.outbox_token("email_verification", email)
    response = await api.client.post("/v1/auth/email-verification/consume", json={"token": token})
    assert response.status_code == 200, response.text


async def login(
    api: APIHarness,
    email: str = "member@example.com",
    password: str = "CorrectHorse!2026",
    device_label: str = "Test browser",
) -> dict[str, Any]:
    response = await api.client.post(
        "/v1/auth/login",
        json={
            "email": email,
            "password": password,
            "device_label": device_label,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["mfa_required"] is False
    return body["tokens"]


def bearer(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}
