"""Create local friend-testing accounts without pretending external providers work.

This module is intentionally development-oriented. It writes verified users,
RBAC roles, and test credit issuance directly through the same ledger and
identity models used by production APIs. It never marks payment processors,
OAuth providers, live platforms, or AAA gift assets as configured.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.ledger_models import LedgerAccountType, LedgerSide, LedgerTransactionType
from app.ledger_schemas import LedgerPosting
from app.ledger_service import post_transaction, system_account, user_account
from app.models import (
    AccountSettings,
    Profile,
    Role,
    User,
    UserRole,
    UserStatus,
)
from app.security import hash_password, normalize_email, utcnow, validate_password


@dataclass(frozen=True)
class DemoAccountSpec:
    email: str
    password: str
    display_name: str
    handle: str
    roles: tuple[str, ...]
    credits_minor: int
    notes: str


DEMO_ACCOUNTS: tuple[DemoAccountSpec, ...] = (
    DemoAccountSpec(
        email="admin@example.com",
        password="HorseBattery!2026",
        display_name="SYLORA Admin",
        handle="sylora_admin",
        roles=("user", "admin", "moderator"),
        credits_minor=500_000,
        notes="Full admin + moderator access for friend testing.",
    ),
    DemoAccountSpec(
        email="creator@example.com",
        password="StudioLaunch!2026",
        display_name="SYLORA Creator",
        handle="sylora_creator",
        roles=("user", "creator"),
        credits_minor=250_000,
        notes="Creator role for studio, gifts authoring, subscriptions.",
    ),
    DemoAccountSpec(
        email="business@example.com",
        password="CrmWorkspace!2026",
        display_name="SYLORA Business",
        handle="sylora_business",
        roles=("user", "business"),
        credits_minor=100_000,
        notes="Business CRM / workspace operator.",
    ),
    DemoAccountSpec(
        email="demo@example.com",
        password="FriendWatch!2026",
        display_name="SYLORA Demo Friend",
        handle="sylora_demo",
        roles=("user",),
        credits_minor=50_000,
        notes="Regular viewer/friend account.",
    ),
)


async def _ensure_user(session: AsyncSession, spec: DemoAccountSpec) -> User:
    email = normalize_email(spec.email)
    validate_password(spec.password, email)
    user = await session.scalar(select(User).where(User.email == email))
    now = utcnow()
    if user is None:
        user = User(
            email=email,
            password_hash=hash_password(spec.password),
            status=UserStatus.active,
            email_verified_at=now,
        )
        user.profile = Profile(
            display_name=spec.display_name,
            handle=spec.handle,
        )
        user.settings = AccountSettings()
        session.add(user)
        await session.flush()
    else:
        user.password_hash = hash_password(spec.password)
        user.status = UserStatus.active
        user.email_verified_at = user.email_verified_at or now
        if user.profile is None:
            user.profile = Profile(
                display_name=spec.display_name,
                handle=spec.handle,
            )
        else:
            user.profile.display_name = spec.display_name
            if not user.profile.handle:
                user.profile.handle = spec.handle
        if user.settings is None:
            user.settings = AccountSettings()
        await session.flush()

    existing_roles = {
        role_name
        for role_name in (
            await session.scalars(
                select(Role.name)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.user_id == user.id)
            )
        ).all()
    }
    for role_name in spec.roles:
        if role_name in existing_roles:
            continue
        role = await session.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            raise RuntimeError(f"Built-in role {role_name!r} is missing; start the API once first.")
        session.add(UserRole(user_id=user.id, role_id=role.id, granted_by=user.id))
    await session.flush()
    return user


async def _ensure_credits(session: AsyncSession, user: User, amount_minor: int) -> None:
    if amount_minor <= 0:
        return
    wallet = await user_account(session, user.id, LedgerAccountType.user_wallet)
    issuance = await system_account(session, "system:platform_issuance")
    await post_transaction(
        session,
        transaction_type=LedgerTransactionType.issuance,
        actor_user_id=user.id,
        idempotency_scope=f"demo-seed-issuance:{user.id}",
        idempotency_key="demo-seed-v1",
        postings=[
            LedgerPosting(
                account_id=issuance.id,
                side=LedgerSide.debit,
                amount_minor=amount_minor,
            ),
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.credit,
                amount_minor=amount_minor,
            ),
        ],
        metadata={"source": "seed_demo", "reason": "local friend-testing credits"},
    )


async def seed_demo_accounts(
    session_factory: async_sessionmaker[AsyncSession],
) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    async with session_factory() as session:
        for spec in DEMO_ACCOUNTS:
            user = await _ensure_user(session, spec)
            await _ensure_credits(session, user, spec.credits_minor)
            results.append(
                {
                    "email": spec.email,
                    "password": spec.password,
                    "display_name": spec.display_name,
                    "roles": list(spec.roles),
                    "credits_minor": spec.credits_minor,
                    "user_id": str(user.id),
                    "notes": spec.notes,
                }
            )
        await session.commit()
    return results
