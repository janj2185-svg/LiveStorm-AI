from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user, require_admin
from platform_api.domains.admin.service import AdminService
from platform_api.domains.identity.models import User
from platform_api.infrastructure.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def admin_stats(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> dict:
    return await AdminService(db).stats()


@router.get("/users")
async def admin_users(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict:
    users = await AdminService(db).list_users(limit=limit, offset=offset)
    return {"items": users}
