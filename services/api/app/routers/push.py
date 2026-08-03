from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.errors import APIError
from app.push_models import DevicePushToken
from app.push_schemas import (
    DevicePushTokenRegister,
    DevicePushTokenResponse,
    DevicePushTokenUnregister,
)
from app.schemas import MessageResponse
from app.security import utcnow

router = APIRouter(prefix="/push", tags=["Push notifications"])


@router.get("/devices", response_model=list[DevicePushTokenResponse])
async def list_devices(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[DevicePushToken]:
    return list(
        (
            await db.scalars(
                select(DevicePushToken)
                .where(DevicePushToken.user_id == auth.user.id)
                .order_by(
                    DevicePushToken.revoked_at.asc().nulls_first(),
                    DevicePushToken.updated_at.desc(),
                    DevicePushToken.id.desc(),
                )
            )
        ).all()
    )


@router.post(
    "/devices",
    response_model=DevicePushTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_device(
    payload: DevicePushTokenRegister,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> DevicePushToken:
    record = await db.scalar(
        select(DevicePushToken).where(
            DevicePushToken.platform == payload.platform,
            DevicePushToken.token == payload.token,
        )
    )
    now = utcnow()
    if record is None:
        record = DevicePushToken(
            user_id=auth.user.id,
            platform=payload.platform,
            token=payload.token,
            updated_at=now,
        )
        db.add(record)
    else:
        record.user_id = auth.user.id
        record.revoked_at = None
        record.updated_at = now
    await db.commit()
    await db.refresh(record)
    return record


@router.post(
    "/devices/unregister",
    response_model=MessageResponse,
    response_model_exclude_none=True,
)
async def unregister_device(
    payload: DevicePushTokenUnregister,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    record = await db.scalar(
        select(DevicePushToken).where(
            DevicePushToken.user_id == auth.user.id,
            DevicePushToken.platform == payload.platform,
            DevicePushToken.token == payload.token,
        )
    )
    if record is not None and record.revoked_at is None:
        now = utcnow()
        record.revoked_at = now
        record.updated_at = now
        await db.commit()
    return MessageResponse(status="unregistered")


@router.delete(
    "/devices/{device_id}",
    response_model=MessageResponse,
    response_model_exclude_none=True,
)
async def revoke_device(
    device_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    record = await db.get(DevicePushToken, device_id)
    if record is None or record.user_id != auth.user.id:
        raise APIError(
            404,
            "push_device_not_found",
            "Push device not found",
            "The requested push device is not registered for your account.",
        )
    if record.revoked_at is None:
        now = utcnow()
        record.revoked_at = now
        record.updated_at = now
        await db.commit()
    return MessageResponse(status="revoked")
