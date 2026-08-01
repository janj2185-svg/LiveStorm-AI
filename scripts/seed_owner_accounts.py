#!/usr/bin/env python3
"""Seed safe local owner-testing accounts for SYLORA.

Idempotent. Does not print passwords (documented in OWNER_TESTING_GUIDE.md).
Only runs meaningfully when ENVIRONMENT=development|test.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "services" / "api"
sys.path.insert(0, str(API))

# Load local env before importing app settings.
# Prefer file values over a polluted shell env (bash `source` mangled JSON lists).
for candidate in (ROOT / ".env.local", API / ".env"):
    if candidate.exists():
        os.environ["DOTENV_PATH"] = str(candidate)
        for line in candidate.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            os.environ[key] = value

os.environ.setdefault("ENVIRONMENT", "development")

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.database import create_engine, create_session_factory, seed_rbac  # noqa: E402
from app.ledger_service import seed_platform_accounts  # noqa: E402
from app.models import AccountSettings, Profile, Role, User, UserRole, UserStatus  # noqa: E402
from app.security import hash_password, utcnow  # noqa: E402

# Local-only credentials — documented in OWNER_TESTING_GUIDE.md (not production).
ACCOUNTS = [
    {
        "email": "owner@sylora.dev",
        "password": "OwnerTest!2026Local",
        "display_name": "SYLORA Owner",
        "roles": ["admin", "moderator", "creator", "user"],
    },
    {
        "email": "creator@sylora.dev",
        "password": "CreatorTest!2026Local",
        "display_name": "Test Creator",
        "roles": ["creator", "user"],
    },
    {
        "email": "streamer@sylora.dev",
        "password": "StreamerTest!2026Local",
        "display_name": "Test Streamer",
        "roles": ["creator", "user"],
    },
    {
        "email": "user@sylora.dev",
        "password": "UserTest!2026Local",
        "display_name": "Regular User",
        "roles": ["user"],
    },
    {
        "email": "viewer@sylora.dev",
        "password": "ViewerTest!2026Local",
        "display_name": "Gift Receiver",
        "roles": ["user"],
    },
]


async def ensure_user(session, email: str, password: str, display_name: str, role_names: list[str]) -> str:
    user = await session.scalar(
        select(User)
        .where(User.email == email)
        .options(selectinload(User.profile), selectinload(User.settings))
    )
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(password),
            status=UserStatus.active,
            email_verified_at=utcnow(),
        )
        user.profile = Profile(display_name=display_name)
        user.settings = AccountSettings()
        session.add(user)
        await session.flush()
        action = "created"
    else:
        user.password_hash = hash_password(password)
        user.status = UserStatus.active
        if user.email_verified_at is None:
            user.email_verified_at = utcnow()
        if user.profile is None:
            user.profile = Profile(display_name=display_name)
        else:
            user.profile.display_name = display_name
        if user.settings is None:
            user.settings = AccountSettings()
        action = "updated"

    for role_name in role_names:
        role = await session.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            continue
        existing = await session.get(UserRole, {"user_id": user.id, "role_id": role.id})
        if existing is None:
            session.add(UserRole(user_id=user.id, role_id=role.id, granted_by=user.id))
    await session.flush()
    return action


async def main() -> None:
    settings = get_settings()
    if settings.environment == "production":
        print("Refusing to seed owner accounts in production.")
        sys.exit(2)

    engine = create_engine(settings)
    factory = create_session_factory(engine)
    try:
        async with factory() as session:
            await seed_rbac(session)
        async with factory() as session:
            await seed_platform_accounts(session)
        async with factory() as session:
            results = []
            for account in ACCOUNTS:
                action = await ensure_user(
                    session,
                    account["email"],
                    account["password"],
                    account["display_name"],
                    account["roles"],
                )
                results.append(f"{account['email']}:{action}")
            await session.commit()
        print("Seeded owner test accounts:")
        for line in results:
            print(f"  - {line}")
        print("Passwords: see OWNER_TESTING_GUIDE.md (local-only).")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
