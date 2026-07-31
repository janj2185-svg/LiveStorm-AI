from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken
from email_validator import EmailNotValidError, validate_email

from app.config import Settings
from app.errors import APIError
from app.models import User

PASSWORD_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)
COMMON_PASSWORDS = {
    "123456789012",
    "adminadminadmin",
    "changeme12345",
    "iloveyou12345",
    "letmein123456",
    "password1234",
    "password12345",
    "qwerty123456",
    "welcome123456",
}
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash(secrets.token_urlsafe(32))


def utcnow() -> datetime:
    return datetime.now(UTC)


def normalize_email(value: str) -> str:
    try:
        return validate_email(value.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        raise APIError(
            422,
            "invalid_email",
            "Invalid email address",
            "Enter a valid email address.",
        ) from exc


def validate_password(password: str, email: str | None = None) -> None:
    if len(password) < 12:
        raise APIError(
            422,
            "weak_password",
            "Password is too weak",
            "Password must contain at least 12 characters.",
        )
    lowered = password.casefold()
    if lowered in COMMON_PASSWORDS or lowered.strip("!@#$%^&*0123456789") in {
        "password",
        "qwerty",
        "letmein",
        "welcome",
        "changeme",
    }:
        raise APIError(
            422,
            "compromised_password",
            "Password is not allowed",
            "Choose a password that is not commonly compromised.",
        )
    if email:
        local_part = email.split("@", 1)[0].casefold()
        if len(local_part) >= 4 and local_part in lowered:
            raise APIError(
                422,
                "weak_password",
                "Password is too weak",
                "Password must not contain your email name.",
            )


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str | None, password: str) -> bool:
    candidate = password_hash or DUMMY_PASSWORD_HASH
    try:
        valid: bool = PASSWORD_HASHER.verify(candidate, password)
    except (VerifyMismatchError, InvalidHashError):
        valid = False
    return bool(valid and password_hash)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def ip_hash(ip_address: str | None, settings: Settings) -> str:
    key = (
        settings.ip_hash_key.get_secret_value()
        if settings.ip_hash_key
        else settings.jwt_secret.get_secret_value()
    )
    return hmac.new(
        key.encode("utf-8"),
        (ip_address or "unknown").encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_access_token(user: User, session_id: uuid.UUID, settings: Settings) -> str:
    now = utcnow()
    payload = {
        "sub": str(user.id),
        "sid": str(session_id),
        "ver": user.token_version,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")


def create_mfa_challenge(user: User, settings: Settings) -> str:
    now = utcnow()
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "type": "mfa",
        "jti": str(uuid.uuid4()),
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=5),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm="HS256")


def decode_jwt(token: str, settings: Settings, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "type", "jti", "iat", "nbf", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise APIError(
            401,
            "invalid_token",
            "Invalid authentication token",
            "Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if payload.get("type") != expected_type:
        raise APIError(
            401,
            "invalid_token",
            "Invalid authentication token",
            "Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def fernet(settings: Settings) -> Fernet:
    return Fernet(settings.data_encryption_key.get_secret_value().encode("ascii"))


def encrypt_secret(secret: str, settings: Settings) -> str:
    return fernet(settings).encrypt(secret.encode("utf-8")).decode("ascii")


def decrypt_secret(encrypted: str, settings: Settings) -> str:
    try:
        return fernet(settings).decrypt(encrypted.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise APIError(
            500,
            "encrypted_data_invalid",
            "Security data unavailable",
            "The security operation could not be completed.",
        ) from exc


def create_oauth_state(payload: dict[str, Any], settings: Settings) -> str:
    return (
        fernet(settings)
        .encrypt(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        .decode("ascii")
    )


def decode_oauth_state(token: str, settings: Settings) -> dict[str, Any]:
    try:
        raw = fernet(settings).decrypt(token.encode("ascii"), ttl=600)
        return json.loads(raw)
    except (InvalidToken, ValueError, json.JSONDecodeError) as exc:
        raise APIError(
            400,
            "invalid_oauth_state",
            "Invalid OAuth state",
            "The OAuth authorization request is invalid or expired.",
        ) from exc


def verify_totp(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=1)
