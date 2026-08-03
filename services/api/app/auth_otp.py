"""Phone / email one-time-code challenges (hashed at rest)."""

from __future__ import annotations

import secrets
from datetime import timedelta

from fastapi import Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.auth_service import issue_token_pair
from app.config import Settings
from app.email import require_email_capability
from app.errors import APIError
from app.identity_linking import (
    activate_verified_user,
    attach_email_to_user,
    attach_phone_to_user,
    create_consumer_user,
    find_linkable_user_by_email,
    find_linkable_user_by_phone,
)
from app.models import (
    AccessSession,
    AuthOtpChallenge,
    AuthOtpChannel,
    AuthOtpPurpose,
    EmailOutbox,
    User,
    UserStatus,
)
from app.phone import normalize_phone_e164
from app.schemas import TokenResponse
from app.security import hash_password, hash_token, normalize_email, utcnow, validate_password
from app.sms import SmsProvider, require_sms_capability


def _generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _aware(value):
    from datetime import UTC

    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


async def _latest_open_challenge(
    db: AsyncSession,
    *,
    channel: AuthOtpChannel,
    destination: str,
    purpose: AuthOtpPurpose = AuthOtpPurpose.login,
) -> AuthOtpChallenge | None:
    return await db.scalar(
        select(AuthOtpChallenge)
        .where(
            AuthOtpChallenge.channel == channel,
            AuthOtpChallenge.destination == destination,
            AuthOtpChallenge.purpose == purpose,
            AuthOtpChallenge.consumed_at.is_(None),
        )
        .order_by(AuthOtpChallenge.created_at.desc())
        .limit(1)
    )


async def _enforce_resend_cooldown(
    existing: AuthOtpChallenge | None, settings: Settings
) -> None:
    if existing is None:
        return
    now = utcnow()
    elapsed = (now - _aware(existing.last_sent_at)).total_seconds()
    if elapsed < settings.auth_otp_resend_seconds:
        wait = int(settings.auth_otp_resend_seconds - elapsed)
        raise APIError(
            429,
            "otp_resend_cooldown",
            "Please wait before requesting another code",
            f"Try again in {wait} seconds.",
        )


async def _create_challenge(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    *,
    channel: AuthOtpChannel,
    destination: str,
    purpose: AuthOtpPurpose,
    code: str,
) -> AuthOtpChallenge:
    now = utcnow()
    challenge = AuthOtpChallenge(
        channel=channel,
        purpose=purpose,
        destination=destination,
        code_hash=hash_token(code),
        expires_at=now + timedelta(minutes=settings.auth_otp_minutes),
        max_attempts=settings.auth_otp_max_attempts,
        last_sent_at=now,
        ip_hash=getattr(request.state, "ip_hash", None),
    )
    db.add(challenge)
    return challenge


async def start_phone_otp(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    sms: SmsProvider,
    phone: str,
    *,
    purpose: AuthOtpPurpose = AuthOtpPurpose.login,
) -> dict[str, int | str]:
    require_sms_capability(settings)
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    existing = await _latest_open_challenge(
        db, channel=AuthOtpChannel.phone, destination=phone_e164, purpose=purpose
    )
    await _enforce_resend_cooldown(existing, settings)

    code = _generate_otp_code()
    await _create_challenge(
        db,
        request,
        settings,
        channel=AuthOtpChannel.phone,
        destination=phone_e164,
        purpose=purpose,
        code=code,
    )
    await sms.send_otp(
        phone_e164=phone_e164,
        message=f"SYLORA code: {code}. Valid {settings.auth_otp_minutes} min.",
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.phone_otp_requested",
        metadata={
            "destination_suffix": phone_e164[-4:],
            "purpose": purpose.value,
        },
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
    *,
    purpose: AuthOtpPurpose = AuthOtpPurpose.login,
) -> dict[str, int | str]:
    require_email_capability(settings)
    email = normalize_email(email_value)
    existing = await _latest_open_challenge(
        db, channel=AuthOtpChannel.email, destination=email, purpose=purpose
    )
    await _enforce_resend_cooldown(existing, settings)

    code = _generate_otp_code()
    await _create_challenge(
        db,
        request,
        settings,
        channel=AuthOtpChannel.email,
        destination=email,
        purpose=purpose,
        code=code,
    )
    subject = (
        "Confirm your SYLORA email"
        if purpose == AuthOtpPurpose.link
        else "Your SYLORA sign-in code"
    )
    db.add(
        EmailOutbox(
            message_type="email_otp",
            recipient=email,
            subject=subject,
            text_body=(
                f"Your SYLORA code is {code}.\n"
                f"It expires in {settings.auth_otp_minutes} minutes.\n"
                "If you did not request this, ignore this email."
            ),
            html_body=(
                f"<p>Your SYLORA code is <strong>{code}</strong>.</p>"
                f"<p>It expires in {settings.auth_otp_minutes} minutes.</p>"
            ),
        )
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.email_otp_requested",
        metadata={"email_domain": email.split("@", 1)[-1], "purpose": purpose.value},
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
    purpose: AuthOtpPurpose = AuthOtpPurpose.login,
) -> AuthOtpChallenge:
    challenge = await _latest_open_challenge(
        db, channel=channel, destination=destination, purpose=purpose
    )
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
        db,
        channel=AuthOtpChannel.phone,
        destination=phone_e164,
        code=code,
        purpose=AuthOtpPurpose.login,
    )
    user = await find_linkable_user_by_phone(db, phone_e164)
    if user is None:
        user = await create_consumer_user(
            db,
            phone_e164=phone_e164,
            display_name=f"User {phone_e164[-4:]}",
            phone_verified=True,
        )
    else:
        await activate_verified_user(user, phone_e164=phone_e164)
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
    await _verify_challenge(
        db,
        channel=AuthOtpChannel.email,
        destination=email,
        code=code,
        purpose=AuthOtpPurpose.login,
    )
    user = await find_linkable_user_by_email(db, email)
    if user is None:
        # Existing unverified email account: verify in place instead of duplicating.
        existing = await db.scalar(select(User).where(User.email == email))
        if existing is not None:
            from app.identity_linking import assert_account_sign_in_allowed

            assert_account_sign_in_allowed(existing)
            user = existing
            await activate_verified_user(user, email=email)
        else:
            user = await create_consumer_user(
                db,
                email=email,
                display_name=email.split("@", 1)[0][:100],
                email_verified=True,
            )
    else:
        await activate_verified_user(user, email=email)
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


async def start_phone_password_reset(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    sms: SmsProvider,
    phone: str,
) -> dict[str, int | str]:
    """Send a phone OTP that can reset a password (or bootstrap one)."""
    require_sms_capability(settings)
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    user = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    # Always return a generic accepted shape to avoid phone enumeration timing.
    if user is None or user.status != UserStatus.active:
        # Still create a short-lived challenge? Better: no-op commit for privacy.
        await db.commit()
        return {
            "status": "code_sent",
            "expires_in": settings.auth_otp_minutes * 60,
            "resend_after": settings.auth_otp_resend_seconds,
        }
    return await start_phone_otp(
        db, request, settings, sms, phone_e164, purpose=AuthOtpPurpose.password_reset
    )


async def consume_phone_password_reset(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    phone: str,
    code: str,
    new_password: str,
) -> None:
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    await _verify_challenge(
        db,
        channel=AuthOtpChannel.phone,
        destination=phone_e164,
        code=code,
        purpose=AuthOtpPurpose.password_reset,
    )
    user = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    if user is None or user.status != UserStatus.active:
        raise APIError(
            400,
            "invalid_or_expired_token",
            "Invalid or expired token",
            "The password reset code is invalid, expired, or already used.",
        )
    validate_password(new_password, user.email)
    user.password_hash = hash_password(new_password)
    user.phone_verified_at = utcnow()
    user.token_version += 1
    now = utcnow()
    await db.execute(
        update(AccessSession)
        .where(AccessSession.user_id == user.id, AccessSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.password_reset_completed",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"channel": "phone"},
    )
    await db.commit()


async def link_phone_start(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    sms: SmsProvider,
    user: User,
    phone: str,
) -> dict[str, int | str]:
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    existing = await db.scalar(select(User).where(User.phone_e164 == phone_e164))
    if existing is not None and existing.id != user.id:
        raise APIError(
            409,
            "phone_already_linked",
            "Phone already linked",
            "This phone number is already used by another account.",
        )
    return await start_phone_otp(
        db, request, settings, sms, phone_e164, purpose=AuthOtpPurpose.link
    )


async def link_phone_verify(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    user: User,
    phone: str,
    code: str,
) -> User:
    phone_e164 = normalize_phone_e164(phone, default_region=settings.phone_default_region)
    await _verify_challenge(
        db,
        channel=AuthOtpChannel.phone,
        destination=phone_e164,
        code=code,
        purpose=AuthOtpPurpose.link,
    )
    await attach_phone_to_user(db, user, phone_e164)
    add_audit_event(
        db,
        request,
        settings,
        "identity.phone_linked",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"destination_suffix": phone_e164[-4:]},
    )
    await db.commit()
    await db.refresh(user)
    return user


async def link_email_start(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    user: User,
    email_value: str,
) -> dict[str, int | str]:
    email = normalize_email(email_value)
    existing = await db.scalar(select(User).where(User.email == email))
    if existing is not None and existing.id != user.id:
        raise APIError(
            409,
            "email_already_linked",
            "Email already linked",
            "This email is already used by another account.",
        )
    return await start_email_otp(
        db, request, settings, email, purpose=AuthOtpPurpose.link
    )


async def link_email_verify(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    user: User,
    email_value: str,
    code: str,
) -> User:
    email = normalize_email(email_value)
    await _verify_challenge(
        db,
        channel=AuthOtpChannel.email,
        destination=email,
        code=code,
        purpose=AuthOtpPurpose.link,
    )
    await attach_email_to_user(db, user, email)
    add_audit_event(
        db,
        request,
        settings,
        "identity.email_linked",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"email_domain": email.split("@", 1)[-1]},
    )
    await db.commit()
    await db.refresh(user)
    return user
