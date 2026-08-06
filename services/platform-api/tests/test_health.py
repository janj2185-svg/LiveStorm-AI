import os

import pytest
from httpx import ASGITransport, AsyncClient

# Minimal env for tests before settings import
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://sylora:sylora@localhost:5433/sylora",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6380/0")
os.environ.setdefault(
    "JWT_SECRET",
    "test-jwt-secret-minimum-32-characters-long",
)

from platform_api.main import app  # noqa: E402


@pytest.mark.asyncio
async def test_health_returns_ok() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
