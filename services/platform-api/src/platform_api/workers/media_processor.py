import subprocess
import uuid
from datetime import UTC, datetime
from pathlib import Path

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from platform_api.config import get_settings
from platform_api.domains.media.models import MediaAsset, MediaKind, MediaStatus, VideoJob, VideoJobStatus
from platform_api.infrastructure.storage import LocalStorageBackend, get_storage

logger = structlog.get_logger()


async def process_pending_jobs(limit: int = 5) -> int:
    settings = get_settings()

    def _async_url(url: str) -> str:
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    engine = create_async_engine(_async_url(settings.database_url_str))
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    processed = 0
    async with session_factory() as db:
        jobs = (
            await db.execute(
                select(VideoJob)
                .where(VideoJob.status == VideoJobStatus.PENDING)
                .order_by(VideoJob.created_at.asc())
                .limit(limit)
            )
        ).scalars().all()

        for job in jobs:
            asset = await db.get(MediaAsset, job.asset_id)
            if asset is None:
                continue
            job.status = VideoJobStatus.PROCESSING
            asset.status = MediaStatus.PROCESSING
            await db.commit()

            try:
                await _process_asset(asset, job)
                job.status = VideoJobStatus.COMPLETED
                asset.status = MediaStatus.READY
                processed += 1
            except Exception as exc:  # noqa: BLE001 — worker logs and marks failed
                logger.exception("video_job.failed", job_id=str(job.id), error=str(exc))
                job.status = VideoJobStatus.FAILED
                job.error_message = str(exc)[:500]
                asset.status = MediaStatus.FAILED
            job.updated_at = datetime.now(UTC)
            asset.updated_at = datetime.now(UTC)
            await db.commit()

    await engine.dispose()
    return processed


async def _process_asset(asset: MediaAsset, job: VideoJob) -> None:
    storage = get_storage()
    if asset.kind == MediaKind.CLIP and isinstance(storage, LocalStorageBackend):
        source = Path(storage.base) / asset.storage_key
        if not source.exists():
            raise FileNotFoundError(f"Source not found: {source}")

        thumb_key = asset.storage_key.rsplit(".", 1)[0] + "_thumb.jpg"
        thumb_path = storage.base / thumb_key

        # Generate thumbnail with ffmpeg if available; otherwise mark ready without thumb
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(source),
                    "-ss",
                    "00:00:01",
                    "-vframes",
                    "1",
                    "-q:v",
                    "2",
                    str(thumb_path),
                ],
                check=True,
                capture_output=True,
                timeout=120,
            )
            job.output_meta = {"thumbnail_key": thumb_key}
        except (FileNotFoundError, subprocess.CalledProcessError):
            logger.warning("ffmpeg.unavailable_or_failed", asset_id=str(asset.id))
            job.output_meta = {"thumbnail_key": None, "note": "ffmpeg not available"}

        asset.public_url = storage.public_url(asset.storage_key)
        return

    asset.status = MediaStatus.READY
    asset.public_url = storage.public_url(asset.storage_key)


if __name__ == "__main__":
    import asyncio

    count = asyncio.run(process_pending_jobs())
    print(f"Processed {count} video jobs")
