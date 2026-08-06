import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from platform_api.config import get_settings
from platform_api.core.exceptions import bad_request, conflict, unauthorized
from platform_api.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from platform_api.domains.identity.models import (
    EmailVerificationToken,
    PasswordResetToken,
    Session,
    SystemRole,
    User,
    UserCredential,
    UserStatus,
)
from platform_api.domains.identity.schemas import AuthResponse, RegisterRequest, TokenResponse, UserPublic
from platform_api.infrastructure.email import send_email
from platform_api.domains.profile.models import Profile

HANDLE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,31}$")


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.settings = get_settings()

    async def register(
        self,
        payload: RegisterRequest,
        *,
        ip_address: str | None = None,
        device_name: str | None = None,
    ) -> AuthResponse:
        email = payload.email.lower().strip()
        if not HANDLE_PATTERN.match(payload.handle):
            raise bad_request("invalid_handle", "Invalid handle format")

        existing_email = await self.db.scalar(select(User.id).where(User.email == email))
        if existing_email:
            raise conflict("email_taken", "Email is already registered")

        existing_handle = await self.db.scalar(select(Profile.id).where(Profile.handle == payload.handle))
        if existing_handle:
            raise conflict("handle_taken", "Handle is already taken")

        user = User(email=email, status=UserStatus.ACTIVE)
        if self.settings.admin_bootstrap_email and email == self.settings.admin_bootstrap_email.lower():
            user.system_role = SystemRole.ADMIN
        credential = UserCredential(user=user, password_hash=hash_password(payload.password))
        profile = Profile(
            user=user,
            handle=payload.handle,
            display_name=payload.display_name.strip(),
            locale=payload.locale,
        )
        self.db.add_all([user, credential, profile])
        await self.db.flush()

        verification = await self._create_email_verification_token(user.id)
        tokens = await self._create_session(user, ip_address=ip_address, device_name=device_name)

        await self.db.commit()
        await self.db.refresh(user)
        await self.db.refresh(profile)

        response = AuthResponse(
            **tokens.model_dump(),
            user=self._to_user_public(user, profile),
            dev_verification_token=verification if self.settings.app_env == "development" else None,
        )
        return response

    async def login(
        self,
        email: str,
        password: str,
        *,
        ip_address: str | None = None,
        device_name: str | None = None,
    ) -> AuthResponse:
        normalized_email = email.lower().strip()
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.credential), selectinload(User.profile))
            .where(User.email == normalized_email)
        )
        user = result.scalar_one_or_none()
        if user is None or user.credential is None:
            raise unauthorized("Invalid email or password")
        if user.status != UserStatus.ACTIVE:
            raise unauthorized("Account is not active")
        if not verify_password(password, user.credential.password_hash):
            raise unauthorized("Invalid email or password")

        tokens = await self._create_session(user, ip_address=ip_address, device_name=device_name)
        await self.db.commit()

        return AuthResponse(**tokens.model_dump(), user=self._to_user_public(user, user.profile))

    async def refresh(self, refresh_token: str) -> TokenResponse:
        token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            select(Session).where(
                Session.refresh_token_hash == token_hash,
                Session.revoked_at.is_(None),
            )
        )
        session = result.scalar_one_or_none()
        if session is None or session.expires_at < datetime.now(UTC):
            raise unauthorized("Invalid or expired refresh token")

        session.revoked_at = datetime.now(UTC)
        user = await self.db.get(User, session.user_id)
        if user is None or user.status != UserStatus.ACTIVE:
            raise unauthorized("Account is not active")

        tokens = await self._create_session(
            user,
            family_id=session.family_id,
            ip_address=session.ip_address,
            device_name=session.device_name,
        )
        await self.db.commit()
        return tokens

    async def logout(self, refresh_token: str) -> None:
        token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            select(Session).where(Session.refresh_token_hash == token_hash)
        )
        session = result.scalar_one_or_none()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(UTC)
            await self.db.commit()

    async def verify_email(self, token: str) -> UserPublic:
        token_hash = hash_token(token)
        result = await self.db.execute(
            select(EmailVerificationToken)
            .where(
                EmailVerificationToken.token_hash == token_hash,
                EmailVerificationToken.used_at.is_(None),
            )
            .with_for_update()
        )
        record = result.scalar_one_or_none()
        if record is None or record.expires_at < datetime.now(UTC):
            raise bad_request("invalid_token", "Invalid or expired verification token")

        user = await self.db.get(User, record.user_id, options=[selectinload(User.profile)])
        if user is None:
            raise bad_request("invalid_token", "Invalid or expired verification token")

        user.email_verified_at = datetime.now(UTC)
        record.used_at = datetime.now(UTC)
        await self.db.commit()
        return self._to_user_public(user, user.profile)

    async def forgot_password(self, email: str) -> str | None:
        """Returns dev reset token in development when email is sent/logged."""
        normalized = email.lower().strip()
        user = await self.db.scalar(select(User).where(User.email == normalized))
        if user is None:
            return None

        token = secrets.token_urlsafe(32)
        self.db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(token),
                expires_at=datetime.now(UTC) + timedelta(hours=1),
            )
        )
        await self.db.commit()

        reset_url = f"http://localhost:3000/en/auth/reset?token={token}"
        await send_email(
            to=user.email,
            subject="SYLORA — Password reset",
            body_text=f"Reset your password: {reset_url}\n\nThis link expires in 1 hour.",
        )
        return token if self.settings.app_env == "development" else None

    async def reset_password(self, token: str, new_password: str) -> None:
        token_hash = hash_token(token)
        result = await self.db.execute(
            select(PasswordResetToken)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
            )
            .with_for_update()
        )
        record = result.scalar_one_or_none()
        if record is None or record.expires_at < datetime.now(UTC):
            raise bad_request("invalid_token", "Invalid or expired reset token")

        user = await self.db.get(User, record.user_id, options=[selectinload(User.credential)])
        if user is None or user.credential is None:
            raise bad_request("invalid_token", "Invalid or expired reset token")

        user.credential.password_hash = hash_password(new_password)
        record.used_at = datetime.now(UTC)
        await self.db.commit()

    async def _create_session(
        self,
        user: User,
        *,
        family_id: uuid.UUID | None = None,
        ip_address: str | None = None,
        device_name: str | None = None,
    ) -> TokenResponse:
        refresh_token = generate_refresh_token()
        session = Session(
            user_id=user.id,
            refresh_token_hash=hash_token(refresh_token),
            family_id=family_id or uuid.uuid4(),
            ip_address=ip_address,
            device_name=device_name,
            expires_at=datetime.now(UTC) + timedelta(seconds=self.settings.jwt_refresh_ttl_seconds),
        )
        self.db.add(session)
        await self.db.flush()

        access_token = create_access_token(user_id=user.id, session_id=session.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.settings.jwt_access_ttl_seconds,
        )

    async def _create_email_verification_token(self, user_id: uuid.UUID) -> str:
        token = secrets.token_urlsafe(32)
        record = EmailVerificationToken(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=datetime.now(UTC) + timedelta(hours=24),
        )
        self.db.add(record)
        return token

    @staticmethod
    def _to_user_public(user: User, profile: Profile) -> UserPublic:
        return UserPublic(
            id=user.id,
            email=user.email,
            email_verified=user.email_verified_at is not None,
            handle=profile.handle,
            display_name=profile.display_name,
            locale=profile.locale,
            created_at=user.created_at,
        )
