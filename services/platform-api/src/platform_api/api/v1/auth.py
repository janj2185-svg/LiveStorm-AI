from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user
from platform_api.domains.identity.models import User
from platform_api.domains.identity.schemas import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
    VerifyEmailRequest,
)
from platform_api.domains.identity.service import AuthService
from platform_api.infrastructure.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    service = AuthService(db)
    response = await service.register(
        payload,
        ip_address=_client_ip(request),
        device_name=request.headers.get("user-agent"),
    )
    return response


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    service = AuthService(db)
    return await service.login(
        payload.email,
        payload.password,
        ip_address=_client_ip(request),
        device_name=request.headers.get("user-agent"),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    return await service.refresh(payload.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> None:
    service = AuthService(db)
    await service.logout(payload.refresh_token)


@router.post("/verify-email", response_model=UserPublic)
async def verify_email(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)) -> UserPublic:
    service = AuthService(db)
    return await service.verify_email(payload.token)


@router.get("/me", response_model=UserPublic)
async def auth_me(user: User = Depends(get_current_user)) -> UserPublic:
    profile = user.profile
    return UserPublic(
        id=user.id,
        email=user.email,
        email_verified=user.email_verified_at is not None,
        handle=profile.handle,
        display_name=profile.display_name,
        locale=profile.locale,
        created_at=user.created_at,
    )
