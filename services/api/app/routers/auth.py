from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.auth_service import (
    authenticate_password,
    begin_totp_setup,
    confirm_totp,
    consume_password_reset,
    disable_totp,
    register_user,
    request_password_reset,
    resend_verification,
    rotate_refresh_token,
    verify_email_token,
    verify_mfa_challenge,
)
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.models import AccessSession
from app.rate_limit import auth_rate_limit
from app.schemas import (
    EmailRequest,
    LoginRequest,
    LoginResponse,
    MessageResponse,
    MFAVerifyRequest,
    PasswordResetConsumeRequest,
    RefreshRequest,
    RegisterRequest,
    SessionResponse,
    TokenConsumeRequest,
    TokenResponse,
    TOTPConfirmRequest,
    TOTPConfirmResponse,
    TOTPDisableRequest,
    TOTPSetupResponse,
    UserResponse,
)
from app.security import utcnow

router = APIRouter(prefix="/auth", tags=["Identity"])


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(auth_rate_limit)],
)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    user = await register_user(db, request, payload, settings)
    if settings.is_public_test_stand and settings.test_stand_auto_verify_email and user.email_verified_at:
        return MessageResponse(status="registered_verified")
    return MessageResponse(status="verification_queued")


@router.post(
    "/email-verification/request",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(auth_rate_limit)],
)
async def request_verification(
    payload: EmailRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await resend_verification(db, request, payload.email, settings)
    return MessageResponse(status="accepted")


@router.post("/email-verification/consume", response_model=MessageResponse)
async def consume_verification(
    payload: TokenConsumeRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await verify_email_token(db, request, payload.token, settings)
    return MessageResponse(status="verified")


@router.post(
    "/login",
    response_model=LoginResponse,
    dependencies=[Depends(auth_rate_limit)],
)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    tokens, challenge = await authenticate_password(db, request, payload, settings)
    if challenge:
        return LoginResponse(mfa_required=True, challenge_token=challenge)
    return LoginResponse(mfa_required=False, tokens=tokens)


@router.post(
    "/totp/verify",
    response_model=TokenResponse,
    dependencies=[Depends(auth_rate_limit)],
)
async def verify_totp_login(
    payload: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    return await verify_mfa_challenge(
        db,
        request,
        payload.challenge_token,
        payload.code,
        payload.device_label,
        settings,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TokenResponse:
    return await rotate_refresh_token(db, request, payload.refresh_token, settings)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    session = await db.get(AccessSession, auth.session.id)
    if session is not None and session.revoked_at is None:
        session.revoked_at = utcnow()
        add_audit_event(
            db,
            request,
            settings,
            "identity.logout",
            actor_user_id=auth.user.id,
            target_user_id=auth.user.id,
            metadata={"session_id": str(session.id)},
        )
        await db.commit()
    return MessageResponse(status="logged_out")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    now = utcnow()
    await db.execute(
        update(AccessSession)
        .where(AccessSession.user_id == auth.user.id, AccessSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    user = await db.get(type(auth.user), auth.user.id)
    if user is None:
        raise APIError(
            401,
            "invalid_token",
            "Invalid authentication token",
            "Authentication is required.",
        )
    user.token_version += 1
    add_audit_event(
        db,
        request,
        settings,
        "identity.logout_all",
        actor_user_id=user.id,
        target_user_id=user.id,
    )
    await db.commit()
    return MessageResponse(status="logged_out_all")


@router.post(
    "/password-reset/request",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(auth_rate_limit)],
)
async def reset_request(
    payload: EmailRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await request_password_reset(db, request, payload.email, settings)
    return MessageResponse(status="accepted")


@router.post(
    "/password-reset/consume",
    response_model=MessageResponse,
    dependencies=[Depends(auth_rate_limit)],
)
async def reset_consume(
    payload: PasswordResetConsumeRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await consume_password_reset(db, request, payload.token, payload.new_password, settings)
    return MessageResponse(status="password_reset")


@router.get("/me", response_model=UserResponse)
async def me(auth: AuthContext = Depends(current_auth)) -> UserResponse:
    return UserResponse(
        id=auth.user.id,
        email=auth.user.email,
        status=auth.user.status,
        email_verified_at=auth.user.email_verified_at,
        created_at=auth.user.created_at,
        roles=sorted(role.name for role in auth.user.roles),
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[SessionResponse]:
    sessions = (
        await db.scalars(
            select(AccessSession)
            .where(AccessSession.user_id == auth.user.id)
            .order_by(AccessSession.created_at.desc())
        )
    ).all()
    return [
        SessionResponse(
            id=item.id,
            device_label=item.device_label,
            user_agent=item.user_agent,
            created_at=item.created_at,
            last_used_at=item.last_used_at,
            expires_at=item.expires_at,
            revoked_at=item.revoked_at,
            current=item.id == auth.session.id,
        )
        for item in sessions
    ]


@router.delete(
    "/sessions/{session_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def revoke_session(
    session_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    access_session = await db.get(AccessSession, session_id)
    if access_session is None or access_session.user_id != auth.user.id:
        raise APIError(
            404,
            "session_not_found",
            "Session not found",
            "The requested session does not exist.",
        )
    if access_session.revoked_at is None:
        access_session.revoked_at = utcnow()
        add_audit_event(
            db,
            request,
            settings,
            "identity.session_revoked",
            actor_user_id=auth.user.id,
            target_user_id=auth.user.id,
            metadata={"session_id": str(access_session.id)},
        )
        await db.commit()
    return MessageResponse(status="revoked")


@router.post("/totp/setup", response_model=TOTPSetupResponse)
async def totp_setup(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TOTPSetupResponse:
    secret, uri = await begin_totp_setup(db, auth.user, settings)
    return TOTPSetupResponse(secret=secret, provisioning_uri=uri)


@router.post("/totp/confirm", response_model=TOTPConfirmResponse)
async def totp_confirm(
    payload: TOTPConfirmRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TOTPConfirmResponse:
    recovery_codes = await confirm_totp(db, request, auth.user, payload.code, settings)
    return TOTPConfirmResponse(recovery_codes=recovery_codes)


@router.post("/totp/disable", response_model=MessageResponse)
async def totp_disable(
    payload: TOTPDisableRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await disable_totp(
        db,
        request,
        auth.user,
        payload.password,
        payload.code,
        settings,
    )
    return MessageResponse(status="totp_disabled_sessions_revoked")
