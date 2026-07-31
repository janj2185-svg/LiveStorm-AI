from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import AuthContext, get_session, get_settings, require_permission
from app.errors import APIError
from app.models import Permission, Role, RolePermission, User, UserRole
from app.schemas import (
    MessageResponse,
    PermissionCreateRequest,
    PermissionResponse,
    RoleCreateRequest,
    RoleResponse,
)

router = APIRouter(prefix="/admin", tags=["Administration"])


async def role_response(db: AsyncSession, role: Role) -> RoleResponse:
    permissions = (
        await db.scalars(
            select(Permission.name)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role.id)
            .order_by(Permission.name)
        )
    ).all()
    return RoleResponse(
        id=role.id,
        name=role.name,
        description=role.description,
        is_system=role.is_system,
        permissions=list(permissions),
    )


@router.get("/roles", response_model=list[RoleResponse])
async def list_roles(
    _: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
) -> list[RoleResponse]:
    roles = (await db.scalars(select(Role).order_by(Role.name))).all()
    return [await role_response(db, role) for role in roles]


@router.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(
    payload: RoleCreateRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> RoleResponse:
    if await db.scalar(select(Role.id).where(Role.name == payload.name)):
        raise APIError(
            409,
            "role_exists",
            "Role already exists",
            "A role with this name already exists.",
        )
    role = Role(name=payload.name, description=payload.description, is_system=False)
    db.add(role)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "rbac.role_created",
        actor_user_id=auth.user.id,
        metadata={"role_id": str(role.id), "role_name": role.name},
    )
    await db.commit()
    return await role_response(db, role)


@router.delete("/roles/{role_id}", response_model=MessageResponse)
async def delete_role(
    role_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    role = await db.get(Role, role_id)
    if role is None:
        raise APIError(404, "role_not_found", "Role not found", "The role does not exist.")
    if role.is_system:
        raise APIError(
            409,
            "system_role_immutable",
            "System role cannot be deleted",
            "Built-in roles cannot be deleted.",
        )
    add_audit_event(
        db,
        request,
        settings,
        "rbac.role_deleted",
        actor_user_id=auth.user.id,
        metadata={"role_id": str(role.id), "role_name": role.name},
    )
    await db.delete(role)
    await db.commit()
    return MessageResponse(status="deleted")


@router.get("/permissions", response_model=list[PermissionResponse])
async def list_permissions(
    _: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
) -> list[Permission]:
    return list((await db.scalars(select(Permission).order_by(Permission.name))).all())


@router.post(
    "/permissions",
    response_model=PermissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_permission(
    payload: PermissionCreateRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Permission:
    if await db.scalar(select(Permission.id).where(Permission.name == payload.name)):
        raise APIError(
            409,
            "permission_exists",
            "Permission already exists",
            "A permission with this name already exists.",
        )
    permission = Permission(name=payload.name, description=payload.description)
    db.add(permission)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "rbac.permission_created",
        actor_user_id=auth.user.id,
        metadata={"permission_id": str(permission.id), "name": permission.name},
    )
    await db.commit()
    return permission


@router.put(
    "/roles/{role_id}/permissions/{permission_id}",
    response_model=MessageResponse,
)
async def assign_permission(
    role_id: uuid.UUID,
    permission_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    role = await db.get(Role, role_id)
    permission = await db.get(Permission, permission_id)
    if role is None or permission is None:
        raise APIError(
            404,
            "rbac_resource_not_found",
            "RBAC resource not found",
            "The role or permission does not exist.",
        )
    existing = await db.get(RolePermission, {"role_id": role_id, "permission_id": permission_id})
    if existing is None:
        db.add(RolePermission(role_id=role_id, permission_id=permission_id))
        add_audit_event(
            db,
            request,
            settings,
            "rbac.permission_assigned",
            actor_user_id=auth.user.id,
            metadata={"role_id": str(role_id), "permission_id": str(permission_id)},
        )
        await db.commit()
    return MessageResponse(status="assigned")


@router.delete(
    "/roles/{role_id}/permissions/{permission_id}",
    response_model=MessageResponse,
)
async def remove_permission(
    role_id: uuid.UUID,
    permission_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("roles:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    result = await db.execute(
        delete(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id,
        )
    )
    if getattr(result, "rowcount", 0):
        add_audit_event(
            db,
            request,
            settings,
            "rbac.permission_removed",
            actor_user_id=auth.user.id,
            metadata={"role_id": str(role_id), "permission_id": str(permission_id)},
        )
        await db.commit()
    return MessageResponse(status="removed")


@router.put("/users/{user_id}/roles/{role_id}", response_model=MessageResponse)
async def assign_user_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    user = await db.get(User, user_id)
    role = await db.get(Role, role_id)
    if user is None or role is None:
        raise APIError(
            404,
            "rbac_resource_not_found",
            "RBAC resource not found",
            "The user or role does not exist.",
        )
    existing = await db.get(UserRole, {"user_id": user_id, "role_id": role_id})
    if existing is None:
        db.add(UserRole(user_id=user_id, role_id=role_id, granted_by=auth.user.id))
        add_audit_event(
            db,
            request,
            settings,
            "rbac.role_assigned",
            actor_user_id=auth.user.id,
            target_user_id=user_id,
            metadata={"role_id": str(role_id)},
        )
        await db.commit()
    return MessageResponse(status="assigned")


@router.delete("/users/{user_id}/roles/{role_id}", response_model=MessageResponse)
async def remove_user_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    result = await db.execute(
        delete(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    if getattr(result, "rowcount", 0):
        add_audit_event(
            db,
            request,
            settings,
            "rbac.role_removed",
            actor_user_id=auth.user.id,
            target_user_id=user_id,
            metadata={"role_id": str(role_id)},
        )
        await db.commit()
    return MessageResponse(status="removed")
