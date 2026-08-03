"""Phone / email one-time-code challenges (hashed at rest)."""

from __future__ import annotations

import secrets
from datetime import timedelta

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.auth_service import issue_token_pair
from app.config import Settings
from app.email import require_email_capability
from app.errors import APIError
from app.models import (
    AccountSettings,
    AuthOtpChallenge,
    AuthOtpChannel,
    EmailOutbox,
    Profile,
    Role,
    User,
    UserRole,
    UserStatus,
)
from app.phone import normalize_phone_e164
from app.schemas import TokenResponse
from app.security import hash_token, normalize_email, utcnow
from app.sms import SmsProvider, require_sms_capability


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _aware(value):
    from datetime import UTC

    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


async def _latest_open_challenge(
    db: AsyncSession, *, channel: AuthOtpChannel, destination: str
) -> AuthOtpChallenge | None:
    return await db.scalar(
        select(AuthOtpChallenge)
        .where(
            AuthOtpChallenge.channel == channel,
            AuthOtpChallenge.destination == destination,
            AuthOtpChallenge.consumed_at.is_(None),
        )
        .order_by(AuthOtpChallenge.created_at.desc())
        .limit(1)
    )


async def start_phone_otp(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    sms: SmsProvider,
    phone: str,
) -> dict[str, int | str]:
    require_sms_capability(settings)
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    existing = await _latest_open_challenge(
        db, channel=AuthOtpChannel.phone, destination=phone_e164
    )
    now = utcnow()
    if existing is not None:
        elapsed = (now - _aware(existing.last_sent_at)).total_seconds()
        if elapsed < settings.auth_otp_resend_seconds:
            wait = int(settings.auth_otp_resend_seconds - elapsed)
            raise APIError(
                429,
                "otp_resend_cooldown",
                "Please wait before requesting another code",
                f"Try again in {wait} seconds.",
            )

    code = _generate_otp_code()
    challenge = AuthOtpChallenge(
        channel=AuthOtpChannel.phone,
        destination=phone_e164,
        code_hash=hash_token(code),
        expires_at=now + timedelta(minutes=settings.auth_otp_minutes),
        max_attempts=settings.auth_otp_max_attempts,
        last_sent_at=now,
        ip_hash=getattr(request.state, "ip_hash", None),
    )
    db.add(challenge)
    # Send before commit so a provider failure does not leave a usable challenge.
    await sms.send_otp(
        phone_e164=phone_e164,
        message=f"SYLORA code: {code}. Valid {settings.auth_otp_minutes} min.",
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.phone_otp_requested",
        metadata={"destination_suffix": phone_e164[-4:]},
    )
    await db.commit()
    return {
        "status": "code_sent",
        "expires_in": settings.auth_otp_minutes * 60,
        "resend_after": settings.auth_otp_resend_seconds,
    }


async def start_email_otp(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    email_value: str,
) -> dict[str, int | str]:
    require_email_capability(settings)
    email = normalize_email(email_value)
    existing = await _latest_open_challenge(
        db, channel=AuthOtpChannel.email, destination=email
    )
    now = utcnow()
    if existing is not None:
        elapsed = (now - _aware(existing.last_sent_at)).total_seconds()
        if elapsed < settings.auth_otp_resend_seconds:
            wait = int(settings.auth_otp_resend_seconds - elapsed)
            raise APIError(
                429,
                "otp_resend_cooldown",
                "Please wait before requesting another code",
                f"Try again in {wait} seconds.",
            )

    code = _generate_otp_code()
    challenge = AuthOtpChallenge(
        channel=AuthOtpChannel.email,
        destination=email,
        code_hash=hash_token(code),
        expires_at=now + timedelta(minutes=settings.auth_otp_minutes),
        max_attempts=settings.auth_otp_max_attempts,
        last_sent_at=now,
        ip_hash=getattr(request.state, "ip_hash", None),
    )
    db.add(challenge)
    db.add(
        EmailOutbox(
            message_type="email_otp",
            recipient=email,
            subject="Your SYLORA sign-in code",
            text_body=(
                f"Your SYLORA sign-in code is {code}.\n"
                f"It expires in {settings.auth_otp_minutes} minutes.\n"
                "If you did not request this, ignore this email."
            ),
            html_body=(
                f"<p>Your SYLORA sign-in code is <strong>{code}</strong>.</p>"
                f"<p>It expires in {settings.auth_otp_minutes} minutes.</p>"
            ),
        )
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.email_otp_requested",
        metadata={"email_domain": email.split("@", 1)[-1]},
    )
    await db.commit()
    return {
        "status": "code_sent",
        "expires_in": settings.auth_otp_minutes * 60,
        "resend_after": settings.auth_otp_resend_seconds,
    }


async def _verify_challenge(
    db: AsyncSession,
    *,
    channel: AuthOtpChannel,
    destination: str,
    code: str,
) -> AuthOtpChallenge:
    challenge = await _latest_open_challenge(db, channel=channel, destination=destination)
    if challenge is None or _aware(challenge.expires_at) <= utcnow():
        raise APIError(
            401,
            "otp_invalid",
            "Invalid or expired code",
            "Request a new code and try again.",
        )
    if challenge.attempts >= challenge.max_attempts:
        raise APIError(
            429,
            "otp_attempts_exceeded",
            "Too many attempts",
            "Request a new code and try again.",
        )
    challenge.attempts += 1
    if not secrets.compare_digest(challenge.code_hash, hash_token(code.strip())):
        await db.commit()
        raise APIError(
            401,
            "otp_invalid",
            "Invalid or expired code",
            "Request a new code and try again.",
        )
    challenge.consumed_at = utcnow()
    return challenge


async def _ensure_user_role(db: AsyncSession, user: User) -> None:
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


async def verify_phone_otp(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    phone: str,
    code: str,
    device_label: str,
) -> TokenResponse:
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    await _verify_challenge(
        db, channel=AuthOtpChannel.phone, destination=phone_e164, code=code
    )
    user = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    if user is None:
        user = User(
            email=None,
            password_hash=None,
            phone_e164=phone_e164,
            phone_verified_at=utcnow(),
            status=UserStatus.active,
        )
        user.profile = Profile(display_name=f"User {phone_e164[-4:]}", locale="uk")
        user.settings = AccountSettings()
        db.add(user)
        await db.flush()
        await _ensure_user_role(db, user)
    else:
        if user.status in {UserStatus.suspended, UserStatus.deleted}:
            raise APIError(
                403,
                "account_unavailable",
                "Account unavailable",
                "This account cannot sign in.",
            )
        user.phone_verified_at = utcnow()
        if user.status == UserStatus.pending:
            user.status = UserStatus.active
    tokens, access_session = await issue_token_pair(
        db, request, user, settings, device_label or "Phone"
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.phone_otp_verified",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"session_id": str(access_session.id)},
    )
    await db.commit()
    return tokens


async def verify_email_otp(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    email_value: str,
    code: str,
    device_label: str,
) -> TokenResponse:
    email = normalize_email(email_value)
    await _verify_challenge(db, channel=AuthOtpChannel.email, destination=email, code=code)
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            password_hash=None,
            status=UserStatus.active,
            email_verified_at=utcnow(),
        )
        user.profile = Profile(display_name=email.split("@", 1)[0][:100], locale="uk")
        user.settings = AccountSettings()
        db.add(user)
        await db.flush()
        await _ensure_user_role(db, user)
    else:
        if user.status in {UserStatus.suspended, UserStatus.deleted}:
            raise APIError(
                403,
                "account_unavailable",
                "Account unavailable",
                "This account cannot sign in.",
            )
        user.email_verified_at = utcnow()
        if user.status == UserStatus.pending:
            user.status = UserStatus.active
    tokens, access_session = await issue_token_pair(
        db, request, user, settings, device_label or "Email"
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.email_otp_verified",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"session_id": str(access_session.id)},
    )
    await db.commit()
    return tokens
