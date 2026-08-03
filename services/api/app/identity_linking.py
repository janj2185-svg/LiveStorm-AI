"""Shared account resolution / linking for email, phone, and OAuth identities."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import APIError
from app.models import (
    AccountSettings,
    Profile,
    Role,
    User,
    UserRole,
    UserStatus,
)
from app.security import utcnow


async def ensure_default_user_role(db: AsyncSession, user: User) -> None:
    default_role = await db.scalar(select(Role).where(Role.name == "user"))
    if default_role is None:
        raise APIError(
            503,
            "service_not_ready",
            "Service not ready",
            "Identity roles have not been initialized.",
        )
    existing = await db.scalar(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == default_role.id)
    )
    if existing is None:
        db.add(UserRole(user_id=user.id, role_id=default_role.id))


def assert_account_sign_in_allowed(user: User) -> None:
    if user.status in {UserStatus.suspended, UserStatus.deleted}:
        raise APIError(
            403,
            "account_unavailable",
            "Account unavailable",
            "This account cannot sign in.",
        )


async def find_linkable_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Return an existing user that may receive a verified-email identity merge."""
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        return None
    assert_account_sign_in_allowed(user)
    # Never merge into an unverified local email account.
    if user.email_verified_at is None:
        return None
    return user


async def find_linkable_user_by_phone(db: AsyncSession, phone_e164: str) -> User | None:
    user = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    if user is None:
        return None
    assert_account_sign_in_allowed(user)
    return user


async def create_consumer_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    phone_e164: str | None = None,
    display_name: str,
    email_verified: bool = False,
    phone_verified: bool = False,
) -> User:
    now = utcnow()
    user = User(
        email=email,
        password_hash=None,
        phone_e164=phone_e164,
        status=UserStatus.active,
        email_verified_at=now if email and email_verified else None,
        phone_verified_at=now if phone_e164 and phone_verified else None,
    )
    user.profile = Profile(display_name=display_name[:100], locale="uk")
    user.settings = AccountSettings()
    db.add(user)
    await db.flush()
    await ensure_default_user_role(db, user)
    return user


async def activate_verified_user(
    user: User,
    *,
    email: str | None = None,
    phone_e164: str | None = None,
) -> None:
    assert_account_sign_in_allowed(user)
    now = utcnow()
    if email:
        if user.email and user.email != email:
            raise APIError(
                409,
                "identity_conflict",
                "Identity conflict",
                "This account is already linked to a different email address.",
            )
        user.email = email
        user.email_verified_at = now
    if phone_e164:
        if user.phone_e164 and user.phone_e164 != phone_e164:
            raise APIError(
                409,
                "identity_conflict",
                "Identity conflict",
                "This account is already linked to a different phone number.",
            )
        user.phone_e164 = phone_e164
        user.phone_verified_at = now
    if user.status == UserStatus.pending:
        user.status = UserStatus.active


async def attach_phone_to_user(db: AsyncSession, user: User, phone_e164: str) -> User:
    """Link a verified phone to the authenticated user, merging if needed."""
    existing = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    if existing is not None and existing.id != user.id:
        raise APIError(
            409,
            "phone_already_linked",
            "Phone already linked",
            "This phone number is already used by another account.",
        )
    await activate_verified_user(user, phone_e164=phone_e164)
    return user


async def attach_email_to_user(db: AsyncSession, user: User, email: str) -> User:
    """Link a verified email to the authenticated user."""
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None and existing.id != user.id:
        raise APIError(
            409,
            "email_already_linked",
            "Email already linked",
            "This email is already used by another account.",
        )
    await activate_verified_user(user, email=email)
    return user
