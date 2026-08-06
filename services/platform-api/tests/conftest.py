import os

import psycopg2
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ.setdefault("DATABASE_URL", "postgresql://sylora:sylora@localhost:5432/sylora")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-minimum-32-characters-long")
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DEBUG", "false")

from platform_api.config import get_settings  # noqa: E402
from platform_api.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_db_engine() -> None:
    from platform_api.infrastructure.database import get_engine, get_session_factory

    get_session_factory.cache_clear()
    get_engine.cache_clear()


@pytest.fixture(autouse=True)
def clean_tables() -> None:
    settings = get_settings()
    conn = psycopg2.connect(settings.database_url_str)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute(
            "TRUNCATE TABLE email_verification_tokens, sessions, user_credentials, "
            "profiles, users RESTART IDENTITY CASCADE"
        )
    conn.close()


@pytest_asyncio.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
