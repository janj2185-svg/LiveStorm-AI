from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from sqlalchemy import event, select, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import Settings
from app.models import Permission, Role, RolePermission

PERMISSION_DESCRIPTIONS = {
    "profile:read:any": "Read any user profile",
    "profile:write:any": "Update any user profile",
    "settings:read:any": "Read any account settings",
    "settings:write:any": "Update any account settings",
    "roles:manage": "Manage roles and permission assignments",
    "users:manage": "Manage user role assignments and account state",
    "users:read": "Read user administration data",
    "users:moderate": "Suspend or restore user accounts",
    "creator:access": "Access creator capabilities",
    "business:access": "Access business capabilities",
    "ledger:issue": "Issue and reverse platform credits",
    "ledger:read:any": "Read any user's ledger history",
    "gifts:author": "Author gift definitions and runtime versions",
    "gifts:review": "Review gift versions and publication validation",
    "gifts:publish": "Publish and retire gift versions",
    "gifts:refund": "Refund gift purchases and sends",
    "gifts:moderate": "Emergency-retire gift versions",
}

ROLE_MATRIX = {
    "user": set(),
    "creator": {"creator:access", "gifts:author"},
    "business": {"business:access"},
    "moderator": {
        "users:read",
        "users:moderate",
        "profile:read:any",
        "gifts:review",
        "gifts:moderate",
    },
    "admin": set(PERMISSION_DESCRIPTIONS),
}


def create_engine(settings: Settings) -> AsyncEngine:
    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )
    if settings.database_url.startswith("sqlite"):

        @event.listens_for(engine.sync_engine, "connect")
        def enable_sqlite_foreign_keys(dbapi_connection: Any, _: object) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

    return engine


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def check_database(engine: AsyncEngine) -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def seed_rbac(session: AsyncSession) -> None:
    permissions: dict[str, Permission] = {}
    for name, description in PERMISSION_DESCRIPTIONS.items():
        permission = await session.scalar(select(Permission).where(Permission.name == name))
        if permission is None:
            permission = Permission(name=name, description=description)
            session.add(permission)
            await session.flush()
        elif permission.description != description:
            permission.description = description
        permissions[name] = permission

    for role_name, permission_names in ROLE_MATRIX.items():
        role = await session.scalar(select(Role).where(Role.name == role_name))
        if role is None:
            role = Role(
                name=role_name,
                description=f"Built-in {role_name} role",
                is_system=True,
            )
            session.add(role)
            await session.flush()

        existing = set(
            (
                await session.scalars(
                    select(Permission.name)
                    .join(RolePermission, RolePermission.permission_id == Permission.id)
                    .where(RolePermission.role_id == role.id)
                )
            ).all()
        )
        for permission_name in permission_names - existing:
            session.add(
                RolePermission(
                    role_id=role.id,
                    permission_id=permissions[permission_name].id,
                )
            )
    await session.commit()


async def session_dependency(request: Request) -> AsyncIterator[AsyncSession]:
    factory = request.app.state.session_factory
    async with factory() as session:
        yield session
