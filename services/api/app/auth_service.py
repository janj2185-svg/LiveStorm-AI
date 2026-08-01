from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

import pyotp
from fastapi import Request
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import aware
from app.email import (
    password_reset_message,
    require_email_capability,
    verification_message,
)
from app.errors import APIError
from app.models import (
    AccessSession,
    AccountSettings,
    EmailVerificationToken,
    PasswordResetToken,
    Profile,
    Role,
    TOTPEnrollment,
    User,
    UserRole,
    UserStatus,
)
from app.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.security import (
    create_access_token,
    create_mfa_challenge,
    decode_jwt,
    decrypt_secret,
    encrypt_secret,
    hash_password,
    hash_token,
    ip_hash,
    new_opaque_token,
    normalize_email,
    utcnow,
    validate_password,
    verify_password,
    verify_totp,
)


def client_context(request: Request, settings: Settings) -> tuple[str, str]:
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "Unknown")[:512]
    return ip_hash(client_ip, settings), user_agent


async def create_verification(db: AsyncSession, user: User, settings: Settings) -> None:
    now = utcnow()
    await db.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    raw_token = new_opaque_token()
    db.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now + timedelta(hours=settings.verification_token_hours),
        )
    )
    db.add(verification_message(user.email, raw_token, settings))


async def register_user(
    db: AsyncSession,
    request: Request,
    payload: RegisterRequest,
    settings: Settings,
) -> User:
    require_email_capability(settings)
    email = normalize_email(payload.email)
    validate_password(payload.password, email)
    existing = await db.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        raise APIError(
            409,
            "email_already_registered",
            "Email already registered",
            "An account already exists for this email address.",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        status=UserStatus.pending,
    )
    user.profile = Profile(display_name=payload.display_name)
    user.settings = AccountSettings()
    db.add(user)
    await db.flush()

    default_role = await db.scalar(select(Role).where(Role.name == "user"))
    if default_role is None:
        raise APIError(
            503,
            "service_not_ready",
            "Service not ready",
            "Identity roles have not been initialized.",
        )
    db.add(UserRole(user_id=user.id, role_id=default_role.id))
    if settings.is_public_test_stand and settings.test_stand_auto_verify_email:
        now = utcnow()
        user.email_verified_at = now
        user.status = UserStatus.active
        add_audit_event(
            db,
            request,
            settings,
            "identity.email_auto_verified_test_stand",
            actor_user_id=user.id,
            target_user_id=user.id,
        )
    else:
        await create_verification(db, user, settings)
    add_audit_event(
        db,
        request,
        settings,
        "identity.user_registered",
        actor_user_id=user.id,
        target_user_id=user.id,
    )
    await db.commit()
    await db.refresh(user)
    return user


async def resend_verification(
    db: AsyncSession, request: Request, email_value: str, settings: Settings
) -> None:
    require_email_capability(settings)
    try:
        email = normalize_email(email_value)
    except APIError:
        email = ""
    user = await db.scalar(select(User).where(User.email == email))
    if user is not None and user.status == UserStatus.pending:
        await create_verification(db, user, settings)
        add_audit_event(
            db,
            request,
            settings,
            "identity.verification_requested",
            actor_user_id=user.id,
            target_user_id=user.id,
        )
    await db.commit()


async def verify_email_token(
    db: AsyncSession, request: Request, raw_token: str, settings: Settings
) -> User:
    token = await db.scalar(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.token_hash == hash_token(raw_token))
        .with_for_update()
    )
    now = utcnow()
    if token is None or token.used_at is not None or aware(token.expires_at) <= now:
        raise APIError(
            400,
            "invalid_or_expired_token",
            "Invalid or expired token",
            "The verification token is invalid, expired, or already used.",
        )
    user = await db.get(User, token.user_id)
    if user is None or user.status not in {UserStatus.pending, UserStatus.active}:
        raise APIError(
            400,
            "invalid_or_expired_token",
            "Invalid or expired token",
            "The verification token is invalid, expired, or already used.",
        )
    token.used_at = now
    user.email_verified_at = now
    user.status = UserStatus.active
    add_audit_event(
        db,
        request,
        settings,
        "identity.email_verified",
        actor_user_id=user.id,
        target_user_id=user.id,
    )
    await db.commit()
    return user


async def issue_token_pair(
    db: AsyncSession,
    request: Request,
    user: User,
    settings: Settings,
    device_label: str,
    *,
    rotation_family: uuid.UUID | None = None,
    parent_session_id: uuid.UUID | None = None,
) -> tuple[TokenResponse, AccessSession]:
    raw_refresh = new_opaque_token()
    client_ip_hash, user_agent = client_context(request, settings)
    access_session = AccessSession(
        user_id=user.id,
        device_label=device_label[:100],
        ip_hash=client_ip_hash,
        user_agent=user_agent,
        refresh_token_hash=hash_token(raw_refresh),
        rotation_family=rotation_family or uuid.uuid4(),
        parent_session_id=parent_session_id,
        expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
    )
    db.add(access_session)
    await db.flush()
    access_token = create_access_token(user, access_session.id, settings)
    return (
        TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh,
            expires_in=settings.access_token_minutes * 60,
        ),
        access_session,
    )


def credential_error() -> APIError:
    return APIError(
        401,
        "invalid_credentials",
        "Invalid credentials",
        "The email address or password is incorrect.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def authenticate_password(
    db: AsyncSession,
    request: Request,
    payload: LoginRequest,
    settings: Settings,
) -> tuple[TokenResponse | None, str | None]:
    try:
        email = normalize_email(payload.email)
    except APIError:
        email = ""
    user = await db.scalar(select(User).where(User.email == email))
    valid = verify_password(user.password_hash if user else None, payload.password)
    if user is None or not valid or user.status == UserStatus.deleted:
        raise credential_error()
    if user.status == UserStatus.pending:
        raise APIError(
            403,
            "email_not_verified",
            "Email verification required",
            "Verify your email address before signing in.",
        )
    if user.status == UserStatus.suspended:
        raise APIError(
            403,
            "account_suspended",
            "Account suspended",
            "This account is suspended.",
        )

    enrollment = await db.get(TOTPEnrollment, user.id)
    if enrollment is not None and enrollment.confirmed_at is not None:
        add_audit_event(
            db,
            request,
            settings,
            "identity.mfa_challenge_created",
            actor_user_id=user.id,
            target_user_id=user.id,
        )
        await db.commit()
        return None, create_mfa_challenge(user, settings)

    tokens, access_session = await issue_token_pair(
        db, request, user, settings, payload.device_label
    )
    add_audit_event(
        db,
        request,
        settings,
        "identity.login_succeeded",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"session_id": str(access_session.id), "mfa": False},
    )
    await db.commit()
    return tokens, None


async def verify_mfa_challenge(
    db: AsyncSession,
    request: Request,
    challenge_token: str,
    code: str,
    device_label: str,
    settings: Settings,
) -> TokenResponse:
    payload = decode_jwt(challenge_token, settings, "mfa")
    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError, TypeError) as exc:
        raise credential_error() from exc
    user = await db.get(User, user_id)
    enrollment = await db.get(TOTPEnrollment, user_id)
    if (
        user is None
        or user.status != UserStatus.active
        or user.token_version != payload.get("ver")
        or enrollment is None
        or enrollment.confirmed_at is None
    ):
        raise credential_error()

    secret = decrypt_secret(enrollment.encrypted_secret, settings)
    used_recovery = False
    valid = verify_totp(secret, code)
    if not valid:
        candidate_hash = hash_token(code.upper())
        for stored_hash in enrollment.recovery_code_hashes:
            if secrets.compare_digest(candidate_hash, stored_hash):
                enrollment.recovery_code_hashes = [
                    item for item in enrollment.recovery_code_hashes if item != stored_hash
                ]
                used_recovery = True
                valid = True
                break
    if not valid:
        raise APIError(
            401,
            "invalid_mfa_code",
            "Invalid authentication code",
            "The authentication code is invalid.",
        )

    try:
        challenge_available = await request.app.state.redis.set(
            f"sylora:mfa-challenge:{payload['jti']}",
            "consumed",
            ex=300,
            nx=True,
        )
    except Exception as exc:
        if settings.environment == "production":
            raise APIError(
                503,
                "mfa_safety_unavailable",
                "Authentication temporarily unavailable",
                "MFA replay protection is temporarily unavailable.",
            ) from exc
        challenge_available = True
    if not challenge_available:
        raise APIError(
            401,
            "mfa_challenge_reused",
            "Authentication challenge already used",
            "Start a new sign-in attempt.",
        )

    tokens, access_session = await issue_token_pair(db, request, user, settings, device_label)
    add_audit_event(
        db,
        request,
        settings,
        "identity.login_succeeded",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={
            "session_id": str(access_session.id),
            "mfa": True,
            "recovery_code": used_recovery,
        },
    )
    await db.commit()
    return tokens


async def rotate_refresh_token(
    db: AsyncSession,
    request: Request,
    raw_refresh: str,
    settings: Settings,
) -> TokenResponse:
    old_session = await db.scalar(
        select(AccessSession)
        .where(AccessSession.refresh_token_hash == hash_token(raw_refresh))
        .with_for_update()
    )
    now = utcnow()
    if old_session is None:
        raise APIError(
            401,
            "invalid_refresh_token",
            "Invalid refresh token",
            "The refresh token is invalid or expired.",
        )
    if old_session.rotated_at is not None:
        await db.execute(
            update(AccessSession)
            .where(AccessSession.rotation_family == old_session.rotation_family)
            .values(revoked_at=now)
        )
        old_session.reuse_detected_at = now
        add_audit_event(
            db,
            request,
            settings,
            "identity.refresh_token_reuse",
            actor_user_id=old_session.user_id,
            target_user_id=old_session.user_id,
            metadata={"rotation_family": str(old_session.rotation_family)},
        )
        await db.commit()
        raise APIError(
            401,
            "refresh_token_reuse",
            "Refresh token reuse detected",
            "This session family has been revoked.",
        )
    if old_session.revoked_at is not None or aware(old_session.expires_at) <= now:
        raise APIError(
            401,
            "invalid_refresh_token",
            "Invalid refresh token",
            "The refresh token is invalid or expired.",
        )
    user = await db.get(User, old_session.user_id)
    if user is None or user.status != UserStatus.active:
        raise APIError(
            401,
            "invalid_refresh_token",
            "Invalid refresh token",
            "The refresh token is invalid or expired.",
        )

    old_session.rotated_at = now
    old_session.revoked_at = now
    old_session.last_used_at = now
    tokens, new_session = await issue_token_pair(
        db,
        request,
        user,
        settings,
        old_session.device_label,
        rotation_family=old_session.rotation_family,
        parent_session_id=old_session.id,
    )
    old_session.replaced_by_session_id = new_session.id
    add_audit_event(
        db,
        request,
        settings,
        "identity.refresh_rotated",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"session_id": str(new_session.id)},
    )
    await db.commit()
    return tokens


async def request_password_reset(
    db: AsyncSession, request: Request, email_value: str, settings: Settings
) -> None:
    require_email_capability(settings)
    try:
        email = normalize_email(email_value)
    except APIError:
        email = ""
    user = await db.scalar(select(User).where(User.email == email))
    if user is not None and user.status == UserStatus.active and user.password_hash:
        now = utcnow()
        await db.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=now)
        )
        raw_token = new_opaque_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=now + timedelta(minutes=settings.password_reset_minutes),
            )
        )
        db.add(password_reset_message(user.email, raw_token, settings))
        add_audit_event(
            db,
            request,
            settings,
            "identity.password_reset_requested",
            actor_user_id=user.id,
            target_user_id=user.id,
        )
    await db.commit()


async def consume_password_reset(
    db: AsyncSession,
    request: Request,
    raw_token: str,
    new_password: str,
    settings: Settings,
) -> None:
    reset = await db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_token(raw_token))
        .with_for_update()
    )
    now = utcnow()
    if reset is None or reset.used_at is not None or aware(reset.expires_at) <= now:
        raise APIError(
            400,
            "invalid_or_expired_token",
            "Invalid or expired token",
            "The password reset token is invalid, expired, or already used.",
        )
    user = await db.get(User, reset.user_id)
    if user is None or user.status != UserStatus.active:
        raise APIError(
            400,
            "invalid_or_expired_token",
            "Invalid or expired token",
            "The password reset token is invalid, expired, or already used.",
        )
    validate_password(new_password, user.email)
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    reset.used_at = now
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
    )
    await db.commit()


async def begin_totp_setup(db: AsyncSession, user: User, settings: Settings) -> tuple[str, str]:
    existing = await db.get(TOTPEnrollment, user.id)
    if existing is not None and existing.confirmed_at is not None:
        raise APIError(
            409,
            "totp_already_enabled",
            "Authenticator already enabled",
            "Disable the existing authenticator before enrolling a new one.",
        )
    secret = pyotp.random_base32()
    if existing is None:
        existing = TOTPEnrollment(
            user_id=user.id,
            encrypted_secret=encrypt_secret(secret, settings),
            recovery_code_hashes=[],
        )
        db.add(existing)
    else:
        existing.encrypted_secret = encrypt_secret(secret, settings)
        existing.recovery_code_hashes = []
        existing.confirmed_at = None
    await db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="SYLORA")
    return secret, uri


async def confirm_totp(
    db: AsyncSession,
    request: Request,
    user: User,
    code: str,
    settings: Settings,
) -> list[str]:
    enrollment = await db.get(TOTPEnrollment, user.id)
    if enrollment is None or enrollment.confirmed_at is not None:
        raise APIError(
            409,
            "totp_setup_not_pending",
            "No authenticator setup pending",
            "Start authenticator setup before confirming it.",
        )
    secret = decrypt_secret(enrollment.encrypted_secret, settings)
    if not verify_totp(secret, code):
        raise APIError(
            400,
            "invalid_mfa_code",
            "Invalid authentication code",
            "The authentication code is invalid.",
        )
    recovery_codes = [
        f"{secrets.token_hex(4)[:4]}-{secrets.token_hex(4)[:4]}".upper() for _ in range(10)
    ]
    enrollment.recovery_code_hashes = [hash_token(code) for code in recovery_codes]
    enrollment.confirmed_at = utcnow()
    add_audit_event(
        db,
        request,
        settings,
        "identity.totp_enabled",
        actor_user_id=user.id,
        target_user_id=user.id,
    )
    await db.commit()
    return recovery_codes


async def disable_totp(
    db: AsyncSession,
    request: Request,
    user: User,
    password: str | None,
    code: str,
    settings: Settings,
) -> None:
    enrollment = await db.get(TOTPEnrollment, user.id)
    if enrollment is None or enrollment.confirmed_at is None:
        raise APIError(
            409,
            "totp_not_enabled",
            "Authenticator is not enabled",
            "There is no active authenticator enrollment on this account.",
        )
    if user.password_hash and (
        password is None or not verify_password(user.password_hash, password)
    ):
        raise credential_error()

    secret = decrypt_secret(enrollment.encrypted_secret, settings)
    valid = verify_totp(secret, code)
    if not valid:
        candidate_hash = hash_token(code.upper())
        valid = any(
            secrets.compare_digest(candidate_hash, stored_hash)
            for stored_hash in enrollment.recovery_code_hashes
        )
    if not valid:
        raise APIError(
            401,
            "invalid_mfa_code",
            "Invalid authentication code",
            "The authentication code or recovery code is invalid.",
        )

    now = utcnow()
    await db.execute(delete(TOTPEnrollment).where(TOTPEnrollment.user_id == user.id))
    await db.execute(
        update(AccessSession)
        .where(AccessSession.user_id == user.id, AccessSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    user.token_version += 1
    add_audit_event(
        db,
        request,
        settings,
        "identity.totp_disabled",
        actor_user_id=user.id,
        target_user_id=user.id,
        metadata={"all_sessions_revoked": True},
    )
    await db.commit()
