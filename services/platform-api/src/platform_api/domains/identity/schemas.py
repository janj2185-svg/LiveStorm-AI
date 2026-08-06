from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator
import re


HANDLE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{2,31}$")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    handle: str = Field(min_length=3, max_length=32)
    display_name: str = Field(min_length=1, max_length=80)
    locale: str = Field(default="en", pattern=r"^[a-z]{2}$")

    @field_validator("handle")
    @classmethod
    def validate_handle(cls, value: str) -> str:
        normalized = value.lower().strip()
        if not HANDLE_PATTERN.match(normalized):
            raise ValueError("handle must be 3-32 chars, start with a letter, use a-z 0-9 _")
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=16)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthResponse(TokenResponse):
    user: "UserPublic"
    dev_verification_token: str | None = None


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    email_verified: bool
    handle: str
    display_name: str
    locale: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=16)


AuthResponse.model_rebuild()
