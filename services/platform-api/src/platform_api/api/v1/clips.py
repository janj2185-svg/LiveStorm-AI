from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user
from platform_api.domains.identity.models import User
from platform_api.domains.media.service import MediaService
from platform_api.infrastructure.database import get_db

router = APIRouter(prefix="/clips", tags=["clips"])


@router.get("/feed")
async def clips_feed(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict:
    assets = await MediaService(db).clips_feed(limit=limit)
    return {
        "items": [
            {
                "id": str(a.id),
                "url": a.public_url,
                "title": a.meta.get("title", ""),
                "owner_id": str(a.owner_id),
                "created_at": a.created_at.isoformat(),
            }
            for a in assets
        ]
    }
