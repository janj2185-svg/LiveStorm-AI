from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user
from platform_api.domains.identity.models import User
from platform_api.domains.media.service import MediaService
from platform_api.infrastructure.database import get_db
from platform_api.infrastructure.storage import get_storage

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    asset = await MediaService(db).upload_image(user, file)
    return {
        "id": str(asset.id),
        "kind": asset.kind.value,
        "status": asset.status.value,
        "url": asset.public_url,
        "mime_type": asset.mime_type,
    }


@router.post("/upload/clip")
async def upload_clip(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    asset = await MediaService(db).upload_clip(user, file, title=title)
    return {
        "id": str(asset.id),
        "kind": asset.kind.value,
        "status": asset.status.value,
        "url": asset.public_url,
        "title": asset.meta.get("title", ""),
    }


@router.get("/files/{file_path:path}")
async def serve_local_file(file_path: str) -> Response:
    storage = get_storage()
    data = await storage.read(file_path)
    return Response(content=data, media_type="application/octet-stream")


@router.get("/assets/{asset_id}")
async def get_asset(
    asset_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    asset = await MediaService(db).get_asset(asset_id, user.id)
    return {
        "id": str(asset.id),
        "kind": asset.kind.value,
        "status": asset.status.value,
        "url": asset.public_url,
        "meta": asset.meta,
    }
