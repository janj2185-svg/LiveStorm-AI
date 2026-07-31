from __future__ import annotations

import asyncio
import uuid

from celery import Celery

from app.ai_providers import ProviderRegistry
from app.ai_service import process_generation_job
from app.config import get_settings
from app.database import create_engine, create_session_factory
from app.email import drain_outbox
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
        }
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
