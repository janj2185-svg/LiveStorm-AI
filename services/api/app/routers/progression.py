from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.progression_models import Achievement
from app.progression_schemas import AchievementResponse, ProgressionResponse
from app.progression_service import progression_response

router = APIRouter(prefix="/progression", tags=["Progression"])


@router.get("/me", response_model=ProgressionResponse)
async def get_my_progression(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ProgressionResponse:
    response = await progression_response(db, auth.user.id)
    await db.commit()
    return response


@router.get("/achievements", response_model=list[AchievementResponse])
async def list_achievements(
    _: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[Achievement]:
    return list(
        (
            await db.scalars(
                select(Achievement).order_by(Achievement.created_at, Achievement.code)
            )
        ).all()
    )
