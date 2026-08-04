from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace

from celery import Celery
from sqlalchemy import select

from app.ai_providers import ProviderRegistry
from app.ai_service import process_generation_job
from app.config import get_settings
from app.database import create_engine, create_session_factory
from app.email import drain_outbox
from app.live_adapters import AdapterRegistry
from app.live_models import LiveSession, LiveSessionState
from app.live_service import (
    check_connection_health,
    process_webhook_delivery,
    reconcile_live_voice_turns,
    reconnect_session,
    refresh_due_connections,
)
from app.platform_service import expire_due_subscriptions, publish_scheduled_content
from app.storage import S3ObjectStorage

settings = get_settings()

celery_app = Celery(
    "sylora",
    broker=settings.effective_celery_broker_url,
    backend=settings.effective_celery_result_backend,
)
celery_app.conf.update(
    accept_content=["json"],
    task_serializer="json",
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "drain-email-outbox": {
            "task": "sylora.email.drain_outbox",
            "schedule": 30.0,
            "options": {"expires": 25},
        },
        "live-refresh-integration-tokens": {
            "task": "sylora.live.refresh_tokens",
            "schedule": 300.0,
            "options": {"expires": 240},
        },
        "live-integration-health": {
            "task": "sylora.live.health",
            "schedule": 120.0,
            "options": {"expires": 100},
        },
        "live-reconnect-destinations": {
            "task": "sylora.live.reconnect",
            "schedule": 30.0,
            "options": {"expires": 25},
        },
        "live-reconcile-voice-turns": {
            "task": "sylora.live.reconcile_voice",
            "schedule": 15.0,
            "options": {"expires": 12},
        },
        "creator-expire-subscriptions": {
            "task": "sylora.creator.expire_subscriptions",
            "schedule": 300.0,
            "options": {"expires": 240},
        },
        "owner-config-health": {
            "task": "sylora.owner_config.health",
            "schedule": 180.0,
            "options": {"expires": 150},
        },
    },
)


async def _drain_email_outbox(limit: int) -> dict[str, int]:
    engine = create_engine(settings)
    try:
        sent, failed = await drain_outbox(
            create_session_factory(engine),
            settings,
            limit=limit,
        )
        return {"sent": sent, "failed": failed}
    finally:
        await engine.dispose()


@celery_app.task(
    name="sylora.email.drain_outbox",
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=8,
)
def drain_email_outbox(limit: int = 50) -> dict[str, int]:
    """Deliver durable outbox messages through the configured real SMTP adapter."""
    if not 1 <= limit <= 1000:
        raise ValueError("limit must be between 1 and 1000")
    return asyncio.run(_drain_email_outbox(limit))


async def _process_generation_job(job_id: uuid.UUID) -> dict[str, str | int]:
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            registry = ProviderRegistry()
            await registry.refresh_from_database(session, settings)
            job = await process_generation_job(
                session,
                registry,
                S3ObjectStorage(settings),
                job_id,
            )
            return {
                "job_id": str(job.id),
                "status": job.status.value,
                "progress": job.progress,
            }
    finally:
        await engine.dispose()


@celery_app.task(
    name="sylora.ai.process_generation_job",
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def process_ai_generation_job(job_id: str) -> dict[str, str | int]:
    """Run a persisted generation job through a configured real provider and S3."""
    result = asyncio.run(_process_generation_job(uuid.UUID(job_id)))
    if result["status"] == "running":
        celery_app.send_task(
            "sylora.ai.process_generation_job",
            args=[job_id],
            countdown=10,
        )
    return result


async def _process_live_webhook(delivery_id: uuid.UUID) -> dict[str, str | int]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            registry = ProviderRegistry()
            await registry.refresh_from_database(session, settings)

            async def dispatch_ai_job(job_id: uuid.UUID) -> None:
                await asyncio.to_thread(
                    celery_app.send_task,
                    "sylora.ai.process_generation_job",
                    args=[str(job_id)],
                )

            request = SimpleNamespace(
                app=SimpleNamespace(
                    state=SimpleNamespace(
                        ai_provider_registry=registry,
                        ai_job_dispatcher=dispatch_ai_job,
                    )
                )
            )
            records = await process_webhook_delivery(
                session,
                delivery_id,
                request=request,
                settings=settings,
            )
            return {"delivery_id": str(delivery_id), "events": len(records)}
    finally:
        await engine.dispose()


@celery_app.task(
    name="sylora.live.process_webhook",
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=5,
)
def process_live_webhook(delivery_id: str) -> dict[str, str | int]:
    """Process a verified, deduplicated official integration webhook."""
    return asyncio.run(_process_live_webhook(uuid.UUID(delivery_id)))


async def _refresh_live_tokens() -> dict[str, int]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            return await refresh_due_connections(session, AdapterRegistry(settings), settings)
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.live.refresh_tokens")
def refresh_live_tokens() -> dict[str, int]:
    return asyncio.run(_refresh_live_tokens())


async def _check_live_health() -> dict[str, int]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            return await check_connection_health(session, AdapterRegistry(settings), settings)
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.live.health")
def check_live_health() -> dict[str, int]:
    return asyncio.run(_check_live_health())


async def _reconnect_live_sessions() -> dict[str, int]:
    engine = create_engine(settings)
    reconnected = 0
    pending = 0
    try:
        registry = AdapterRegistry(settings)
        async with create_session_factory(engine)() as session:
            records = list(
                (
                    await session.scalars(
                        select(LiveSession).where(
                            LiveSession.state == LiveSessionState.reconnecting
                        )
                    )
                ).all()
            )
            for record in records:
                result = await reconnect_session(session, registry, settings, record)
                if result.state == LiveSessionState.live:
                    reconnected += 1
                else:
                    pending += 1
        return {"reconnected": reconnected, "pending": pending}
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.live.reconnect")
def reconnect_live_sessions() -> dict[str, int]:
    return asyncio.run(_reconnect_live_sessions())


async def _reconcile_live_voice() -> dict[str, int]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            return await reconcile_live_voice_turns(session)
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.live.reconcile_voice")
def reconcile_live_voice() -> dict[str, int]:
    return asyncio.run(_reconcile_live_voice())


async def _publish_scheduled_content(content_id: uuid.UUID) -> dict[str, str]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            item = await publish_scheduled_content(session, content_id)
            return {"content_id": str(item.id), "state": item.state.value}
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.content.publish_scheduled")
def publish_content_on_schedule(content_id: str) -> dict[str, str]:
    """Publish a persisted due content version from a real Celery worker."""
    return asyncio.run(_publish_scheduled_content(uuid.UUID(content_id)))


async def _expire_creator_subscriptions() -> dict[str, int]:
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            return {"expired": await expire_due_subscriptions(session)}
    finally:
        await engine.dispose()


@celery_app.task(name="sylora.creator.expire_subscriptions")
def expire_creator_subscriptions() -> dict[str, int]:
    return asyncio.run(_expire_creator_subscriptions())


async def _owner_config_health() -> dict[str, object]:
    from app.owner_config_health import run_health_checks

    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            return await run_health_checks(session, settings)
    finally:
        await engine.dispose()


@celery_app.task(
    name="sylora.owner_config.health",
    autoretry_for=(ConnectionError, TimeoutError),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
)
def owner_config_health() -> dict[str, object]:
    """Probe owner-managed providers every few minutes; alert on failure/expiry."""
    return asyncio.run(_owner_config_health())
