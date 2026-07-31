from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.models import UserStatus
from app.social_schemas import validate_handle


class MessageResponse(BaseModel):
    status: str


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=1024)
    display_name: str = Field(min_length=1, max_length=100)
    device_label: str | None = Field(default=None, max_length=100)


class EmailRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class TokenConsumeRequest(BaseModel):
    token: str = Field(min_length=32, max_length=256)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=1024)
    device_label: str = Field(default="Unknown device", min_length=1, max_length=100)


class MFAVerifyRequest(BaseModel):
    challenge_token: str = Field(min_length=32, max_length=4096)
    code: str = Field(min_length=6, max_length=32)
    device_label: str = Field(default="Unknown device", min_length=1, max_length=100)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=256)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int


class LoginResponse(BaseModel):
    mfa_required: bool
    challenge_token: str | None = None
    tokens: TokenResponse | None = None


class PasswordResetConsumeRequest(BaseModel):
    token: str = Field(min_length=32, max_length=256)
    new_password: str = Field(min_length=12, max_length=1024)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    status: UserStatus
    email_verified_at: datetime | None
    created_at: datetime
    roles: list[str]


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    device_label: str
    user_agent: str
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime
    revoked_at: datetime | None
    current: bool = False


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    handle: str | None
    display_name: str
    bio: str | None
    avatar_url: str | None
    locale: str
    timezone: str
    updated_at: datetime


class ProfilePatch(BaseModel):
    handle: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=2000)
    avatar_url: HttpUrl | None = None
    locale: str | None = Field(default=None, min_length=2, max_length=16)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    _valid_handle = field_validator("handle")(
        lambda value: validate_handle(value) if value else value
    )


class AccountSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    product_emails: bool
    marketing_emails: bool
    security_emails: bool
    profile_visibility: Literal["private", "public"]
    updated_at: datetime


class AccountSettingsPatch(BaseModel):
    product_emails: bool | None = None
    marketing_emails: bool | None = None
    security_emails: bool | None = None
    profile_visibility: Literal["private", "public"] | None = None


class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str


class TOTPConfirmRequest(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class TOTPConfirmResponse(BaseModel):
    recovery_codes: list[str]


class TOTPDisableRequest(BaseModel):
    password: str | None = Field(default=None, max_length=1024)
    code: str = Field(min_length=6, max_length=32)


class SoftDeleteRequest(BaseModel):
    password: str | None = Field(default=None, max_length=1024)


class RoleCreateRequest(BaseModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9:_-]{1,63}$")
    description: str = Field(min_length=1, max_length=255)


class PermissionCreateRequest(BaseModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9:_-]{1,95}$")
    description: str = Field(min_length=1, max_length=255)


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    is_system: bool
    permissions: list[str]


class PermissionResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
