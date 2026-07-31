from __future__ import annotations

import os
import re
import uuid

import httpx
import pytest
from redis.asyncio import from_url as redis_from_url
from sqlalchemy import select

from app.config import Settings
from app.main import create_app
from app.models import EmailOutbox

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_EXTERNAL_INTEGRATION_TESTS") != "1",
    reason="requires a migrated PostgreSQL database and a live Redis server",
)


@pytest.mark.asyncio
async def test_real_postgres_redis_identity_social_vertical() -> None:
    database_url = os.environ["SYLORA_INTEGRATION_DATABASE_URL"]
    redis_url = os.environ["SYLORA_INTEGRATION_REDIS_URL"]
    suffix = uuid.uuid4().hex
    email = f"integration-{suffix}@sylora.dev"
    handle = f"int.{suffix[:16]}"
    password = f"PostgresHorse!{suffix[:12]}"

    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        redis_url=redis_url,
        jwt_secret="postgres-redis-integration-key-more-than-thirty-two-characters",
        jwt_issuer="https://api.integration.sylora.invalid",
        jwt_audience="sylora-integration",
        data_encryption_key="MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=",
        allowed_hosts=["testserver"],
        cors_origins=["https://app.integration.sylora.invalid"],
        smtp_host="127.0.0.1",
        smtp_port=1025,
        smtp_from_email="no-reply@sylora.dev",
        smtp_start_tls=False,
        web_base_url="https://app.integration.sylora.invalid",
        auth_rate_limit=100,
    )
    redis = redis_from_url(redis_url, encoding="utf-8", decode_responses=True)
    await redis.flushdb()
    application = create_app(settings, redis_client=redis)

    async with application.router.lifespan_context(application):
        transport = httpx.ASGITransport(app=application)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            ready = await client.get("/health/ready")
            assert ready.status_code == 200
            assert ready.json()["status"] == "ready"

            registered = await client.post(
                "/v1/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "display_name": "PostgreSQL Integration",
                    "device_label": "Integration runner",
                },
            )
            assert registered.status_code == 202, registered.text

            async with application.state.session_factory() as db:
                outbox = await db.scalar(
                    select(EmailOutbox)
                    .where(
                        EmailOutbox.recipient == email,
                        EmailOutbox.message_type == "email_verification",
                    )
                    .order_by(EmailOutbox.created_at.desc())
                )
                assert outbox is not None
                match = re.search(
                    r"Verification token: ([A-Za-z0-9_-]+)",
                    outbox.text_body,
                )
                assert match is not None
                verification_token = match.group(1)

            verified = await client.post(
                "/v1/auth/email-verification/consume",
                json={"token": verification_token},
            )
            assert verified.status_code == 200, verified.text
            login = await client.post(
                "/v1/auth/login",
                json={
                    "email": email,
                    "password": password,
                    "device_label": "Integration runner",
                },
            )
            assert login.status_code == 200, login.text
            access = login.json()["tokens"]["access_token"]
            headers = {"Authorization": f"Bearer {access}"}

            profile = await client.patch(
                "/v1/profile",
                headers=headers,
                json={"handle": handle, "bio": "Persisted in PostgreSQL."},
            )
            assert profile.status_code == 200, profile.text
            assert profile.json()["handle"] == handle

            post = await client.post(
                "/v1/social/posts",
                headers=headers,
                json={
                    "kind": "text",
                    "body": "PostgreSQL and Redis integration is live.",
                    "visibility": "public",
                    "lifecycle": "published",
                },
            )
            assert post.status_code == 201, post.text
            feed = await client.get(
                "/v1/social/feed",
                headers=headers,
                params={"mode": "chronological"},
            )
            assert feed.status_code == 200, feed.text
            assert any(item["id"] == post.json()["id"] for item in feed.json()["items"])

            wallet = await client.get("/v1/wallet/balance", headers=headers)
            assert wallet.status_code == 200, wallet.text
            assert wallet.json()["spendable_minor"] == 0

            ai_status = await client.get("/v1/ai/providers/status", headers=headers)
            assert ai_status.status_code == 200, ai_status.text
            assert not any(ai_status.json()["capabilities"].values())

            deleted = await client.request(
                "DELETE",
                "/v1/users/me",
                headers=headers,
                json={"password": password},
            )
            assert deleted.status_code == 200, deleted.text

    await redis.aclose()
