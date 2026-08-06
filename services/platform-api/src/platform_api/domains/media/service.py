import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.core.exceptions import bad_request
from platform_api.domains.identity.models import User
from platform_api.domains.media.models import MediaAsset, MediaKind, MediaStatus, VideoJob, VideoJobStatus
from platform_api.config import get_settings
from platform_api.infrastructure.storage import build_storage_key, get_storage, validate_upload


class MediaService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def upload_image(self, user: User, file: UploadFile) -> MediaAsset:
        data = await file.read()
        content_type = file.content_type or "application/octet-stream"
        validate_upload(content_type, len(data), is_video=False)
        return await self._save(user, data, content_type, file.filename or "upload", MediaKind.IMAGE)

    async def upload_clip(self, user: User, file: UploadFile, *, title: str | None = None) -> MediaAsset:
        data = await file.read()
        content_type = file.content_type or "application/octet-stream"
        validate_upload(content_type, len(data), is_video=True)
        asset = await self._save(user, data, content_type, file.filename or "clip.mp4", MediaKind.CLIP)
        asset.meta = {"title": title or ""}
        job = VideoJob(asset_id=asset.id, status=VideoJobStatus.PENDING)
        self.db.add(job)
        settings = get_settings()
        if settings.app_env == "development":
            asset.status = MediaStatus.READY
            job.status = VideoJobStatus.COMPLETED
        await self.db.commit()
        await self.db.refresh(asset)
        return asset

    async def get_asset(self, asset_id: uuid.UUID, viewer_id: uuid.UUID | None) -> MediaAsset:
        from platform_api.core.exceptions import SyloraHTTPException
        from fastapi import status

        asset = await self.db.get(MediaAsset, asset_id)
        if asset is None:
            raise SyloraHTTPException(status.HTTP_404_NOT_FOUND, "not_found", "Media not found")
        if asset.status != MediaStatus.READY and asset.owner_id != viewer_id:
            raise bad_request("not_ready", "Media is still processing")
        return asset

    async def clips_feed(self, *, limit: int = 20) -> list[MediaAsset]:
        result = await self.db.execute(
            select(MediaAsset)
            .where(
                MediaAsset.kind == MediaKind.CLIP,
                MediaAsset.status == MediaStatus.READY,
            )
            .order_by(MediaAsset.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _save(
        self,
        user: User,
        data: bytes,
        content_type: str,
        filename: str,
        kind: MediaKind,
    ) -> MediaAsset:
        storage = get_storage()
        settings_storage = kind.value
        key = build_storage_key(user.id, filename)
        public_url = await storage.save(key=key, data=data, content_type=content_type)
        asset = MediaAsset(
            owner_id=user.id,
            kind=kind,
            status=MediaStatus.READY if kind == MediaKind.IMAGE else MediaStatus.PROCESSING,
            storage_backend="local" if storage.__class__.__name__ == "LocalStorageBackend" else "s3",
            storage_key=key,
            public_url=public_url,
            mime_type=content_type,
            file_size=len(data),
        )
        self.db.add(asset)
        await self.db.commit()
        await self.db.refresh(asset)
        return asset
