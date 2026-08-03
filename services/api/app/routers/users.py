from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_service import scrub_ai_user_records
from app.audit import add_audit_event
from app.business_service import scrub_business_user_records
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings, has_permission
from app.errors import APIError
from app.live_service import scrub_live_user_records
from app.models import (
    AccessSession,
    AccountSettings,
    EmailOutbox,
    EmailVerificationToken,
    OAuthIdentity,
    PasswordResetToken,
    Profile,
    TOTPEnrollment,
    User,
    UserRole,
    UserStatus,
)
from app.platform_service import scrub_platform_user_records
from app.schemas import (
    AccountSettingsPatch,
    AccountSettingsResponse,
    MessageResponse,
    ProfilePatch,
    ProfileResponse,
    SoftDeleteRequest,
)
from app.security import utcnow, verify_password

router = APIRouter(tags=["Profiles"])


async def authorize_owner_or(
    db: AsyncSession,
    auth: AuthContext,
    target_user_id: uuid.UUID,
    permission: str,
) -> None:
    if auth.user.id != target_user_id and not await has_permission(db, auth.user.id, permission):
        raise APIError(
            403,
            "permission_denied",
            "Permission denied",
            "You do not have permission to access this account.",
        )


async def profile_for(db: AsyncSession, user_id: uuid.UUID) -> Profile:
    profile = await db.get(Profile, user_id)
    if profile is None:
        raise APIError(
            404,
            "profile_not_found",
            "Profile not found",
            "The requested profile does not exist.",
        )
    return profile


async def settings_for(db: AsyncSession, user_id: uuid.UUID) -> AccountSettings:
    account_settings = await db.get(AccountSettings, user_id)
    if account_settings is None:
        raise APIError(
            404,
            "settings_not_found",
            "Settings not found",
            "The requested account settings do not exist.",
        )
    return account_settings


@router.get("/profile", response_model=ProfileResponse)
async def get_own_profile(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Profile:
    return await profile_for(db, auth.user.id)


@router.patch("/profile", response_model=ProfileResponse)
async def patch_own_profile(
    payload: ProfilePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Profile:
    profile = await profile_for(db, auth.user.id)
    await ensure_handle_available(db, payload.handle, profile.user_id)
    apply_profile_patch(profile, payload)
    await commit_profile_patch(db)
    await db.refresh(profile)
    return profile


@router.get("/settings", response_model=AccountSettingsResponse)
async def get_own_settings(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AccountSettings:
    return await settings_for(db, auth.user.id)


@router.patch("/settings", response_model=AccountSettingsResponse)
async def patch_own_settings(
    payload: AccountSettingsPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AccountSettings:
    account_settings = await settings_for(db, auth.user.id)
    apply_settings_patch(account_settings, payload)
    await db.commit()
    await db.refresh(account_settings)
    return account_settings


@router.get("/users/{user_id}/profile", response_model=ProfileResponse)
async def get_user_profile(
    user_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Profile:
    await authorize_owner_or(db, auth, user_id, "profile:read:any")
    return await profile_for(db, user_id)


@router.patch("/users/{user_id}/profile", response_model=ProfileResponse)
async def patch_user_profile(
    user_id: uuid.UUID,
    payload: ProfilePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Profile:
    await authorize_owner_or(db, auth, user_id, "profile:write:any")
    profile = await profile_for(db, user_id)
    await ensure_handle_available(db, payload.handle, profile.user_id)
    apply_profile_patch(profile, payload)
    await commit_profile_patch(db)
    await db.refresh(profile)
    return profile


@router.get("/users/{user_id}/settings", response_model=AccountSettingsResponse)
async def get_user_settings(
    user_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AccountSettings:
    await authorize_owner_or(db, auth, user_id, "settings:read:any")
    return await settings_for(db, user_id)


@router.patch("/users/{user_id}/settings", response_model=AccountSettingsResponse)
async def patch_user_settings(
    user_id: uuid.UUID,
    payload: AccountSettingsPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AccountSettings:
    await authorize_owner_or(db, auth, user_id, "settings:write:any")
    account_settings = await settings_for(db, user_id)
    apply_settings_patch(account_settings, payload)
    await db.commit()
    await db.refresh(account_settings)
    return account_settings


def apply_profile_patch(profile: Profile, payload: ProfilePatch) -> None:
    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        if field in {"handle", "display_name", "locale", "timezone"} and value is None:
            continue
        setattr(profile, field, str(value) if field == "avatar_url" and value else value)


async def ensure_handle_available(
    db: AsyncSession, handle: str | None, target_user_id: uuid.UUID
) -> None:
    if handle is None:
        return
    owner_id = await db.scalar(select(Profile.user_id).where(Profile.handle == handle))
    if owner_id is not None and owner_id != target_user_id:
        raise APIError(
            409,
            "handle_unavailable",
            "Handle unavailable",
            "That public handle is already in use.",
        )


async def commit_profile_patch(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "handle_unavailable",
            "Handle unavailable",
            "That public handle is already in use.",
        ) from exc


def apply_settings_patch(account_settings: AccountSettings, payload: AccountSettingsPatch) -> None:
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(account_settings, field, value)


@router.delete("/users/me", response_model=MessageResponse, response_model_exclude_none=True)
async def delete_own_account(
    payload: SoftDeleteRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    user = await db.get(User, auth.user.id)
    if user is None or user.status == UserStatus.deleted:
        raise APIError(
            404,
            "user_not_found",
            "User not found",
            "The account does not exist.",
        )
    if user.password_hash and (
        not payload.password or not verify_password(user.password_hash, payload.password)
    ):
        raise APIError(
            401,
            "invalid_credentials",
            "Invalid credentials",
            "The password is incorrect.",
        )

    now = utcnow()
    original_email = user.email
    await scrub_business_user_records(db, user.id, original_email)
    add_audit_event(
        db,
        request,
        settings,
        "identity.account_deleted",
        actor_user_id=user.id,
        target_user_id=user.id,
    )
    user.email = f"deleted+{user.id}@deleted.invalid"
    user.password_hash = None
    user.status = UserStatus.deleted
    user.deleted_at = now
    user.token_version += 1

    profile = await db.get(Profile, user.id)
    if profile:
        profile.handle = None
        profile.display_name = "Deleted user"
        profile.bio = None
        profile.avatar_url = None
        profile.locale = "en"
        profile.timezone = "UTC"
    account_settings = await db.get(AccountSettings, user.id)
    if account_settings:
        account_settings.product_emails = False
        account_settings.marketing_emails = False
        account_settings.security_emails = False
        account_settings.profile_visibility = "private"

    await db.execute(
        update(AccessSession)
        .where(AccessSession.user_id == user.id)
        .values(
            revoked_at=now,
            device_label="Deleted session",
            user_agent="redacted",
            ip_hash="0" * 64,
        )
    )
    await db.execute(delete(OAuthIdentity).where(OAuthIdentity.user_id == user.id))
    await db.execute(delete(TOTPEnrollment).where(TOTPEnrollment.user_id == user.id))
    await db.execute(
        delete(EmailVerificationToken).where(EmailVerificationToken.user_id == user.id)
    )
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    await db.execute(
        delete(EmailOutbox).where(
            EmailOutbox.recipient == original_email,
            EmailOutbox.sent_at.is_(None),
        )
    )
    await scrub_ai_user_records(db, user.id, settings)
    await scrub_live_user_records(db, user.id, settings)
    await scrub_platform_user_records(db, user.id)
    await db.commit()
    return MessageResponse(status="deleted")
