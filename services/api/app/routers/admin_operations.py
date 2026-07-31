from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import false, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import AIUsageRecord
from app.audit import add_audit_event
from app.business_models import (
    AccountAdministrationAction,
    BusinessAuditEvent,
    FeatureFlag,
    PlatformSetting,
    ServiceHealthReport,
    WorkspaceMembership,
)
from app.business_schemas import (
    AdminUserAction,
    FeatureFlagCreate,
    FeatureFlagEvaluation,
    FeatureFlagPatch,
    PlatformSettingUpdate,
    ServiceHealthIngest,
)
from app.business_service import page_result, stable_feature_bucket
from app.config import Settings
from app.dependencies import AuthContext, get_session, get_settings, require_permission
from app.errors import APIError
from app.gift_models import GiftSend
from app.live_models import IntegrationConnection, LiveSession, LiveSessionState
from app.models import (
    AccessSession,
    Profile,
    Role,
    SecurityAuditEvent,
    User,
    UserRole,
    UserStatus,
)
from app.platform_models import ContentItem, ContentState, Order, OrderState
from app.rate_limit import rate_limit
from app.security import encrypt_secret, utcnow
from app.social_models import ContentReport, ModerationAction, ReportStatus
from app.social_service import apply_cursor, decode_cursor, encode_cursor

router = APIRouter(prefix="/admin", tags=["Administration"])


async def admin_mutation_limit(request: Request, user_id: uuid.UUID, bucket: str) -> None:
    settings: Settings = request.app.state.settings
    await rate_limit(
        request,
        bucket=f"admin:{bucket}",
        subject=str(user_id),
        limit=settings.admin_mutation_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )


def flag_response(flag: FeatureFlag) -> dict[str, Any]:
    return {
        "id": flag.id,
        "key": flag.key,
        "environments": flag.environments,
        "enabled": flag.enabled,
        "rollout_bps": flag.rollout_bps,
        "allow_subjects": flag.allow_subjects,
        "deny_subjects": flag.deny_subjects,
        "version": flag.version,
        "created_at": flag.created_at,
        "updated_at": flag.updated_at,
    }


async def user_roles(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    return list(
        (
            await db.scalars(
                select(Role.name)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.user_id == user_id)
                .order_by(Role.name)
            )
        ).all()
    )


async def admin_user_response(
    db: AsyncSession, user: User, *, detailed: bool = False
) -> dict[str, Any]:
    profile = await db.get(Profile, user.id)
    response: dict[str, Any] = {
        "id": user.id,
        "email": user.email,
        "status": user.status,
        "email_verified_at": user.email_verified_at,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "deleted_at": user.deleted_at,
        "roles": await user_roles(db, user.id),
        "profile": (
            {
                "handle": profile.handle,
                "display_name": profile.display_name,
                "locale": profile.locale,
                "timezone": profile.timezone,
            }
            if profile
            else None
        ),
    }
    if detailed:
        response["sessions"] = [
            {
                "id": item.id,
                "device_label": item.device_label,
                "created_at": item.created_at,
                "last_used_at": item.last_used_at,
                "expires_at": item.expires_at,
                "revoked_at": item.revoked_at,
            }
            for item in (
                await db.scalars(
                    select(AccessSession)
                    .where(AccessSession.user_id == user.id)
                    .order_by(AccessSession.created_at.desc(), AccessSession.id.desc())
                    .limit(100)
                )
            ).all()
        ]
        response["workspace_memberships"] = [
            {
                "workspace_id": item.workspace_id,
                "role": item.role,
                "status": item.status,
            }
            for item in (
                await db.scalars(
                    select(WorkspaceMembership)
                    .where(WorkspaceMembership.user_id == user.id)
                    .order_by(WorkspaceMembership.created_at, WorkspaceMembership.id)
                )
            ).all()
        ]
        response["administration_actions"] = [
            {
                "id": item.id,
                "action": item.action,
                "reason": item.reason,
                "actor_user_id": item.actor_user_id,
                "created_at": item.created_at,
            }
            for item in (
                await db.scalars(
                    select(AccountAdministrationAction)
                    .where(AccountAdministrationAction.target_user_id == user.id)
                    .order_by(
                        AccountAdministrationAction.created_at.desc(),
                        AccountAdministrationAction.id.desc(),
                    )
                    .limit(100)
                )
            ).all()
        ]
    return response


@router.get("/users")
async def list_admin_users(
    q: Annotated[str | None, Query(max_length=200)] = None,
    account_status: UserStatus | None = Query(default=None, alias="status"),
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    _: AuthContext = Depends(require_permission("admin:users")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    statement = select(User)
    if account_status is not None:
        statement = statement.where(User.status == account_status)
    if q:
        profile_match = select(Profile.user_id).where(
            or_(Profile.handle.ilike(f"%{q}%"), Profile.display_name.ilike(f"%{q}%"))
        )
        statement = statement.where(
            or_(User.email.ilike(f"%{q}%"), User.id.in_(profile_match))
        )
    scope = f"admin-users:{account_status}:{q or ''}"
    statement = apply_cursor(
        statement,
        User.created_at,
        User.id,
        decode_cursor(settings, scope, cursor),
    ).order_by(User.created_at.desc(), User.id.desc()).limit(limit + 1)
    rows = list((await db.scalars(statement)).all())
    visible, next_cursor = page_result(
        rows,
        settings,
        scope=scope,
        limit=limit,
        created_at=lambda item: item.created_at,
        record_id=lambda item: item.id,
    )
    return {
        "items": [await admin_user_response(db, user) for user in visible],
        "next_cursor": next_cursor,
    }


@router.get("/users/{user_id}")
async def get_admin_user(
    user_id: uuid.UUID,
    _: AuthContext = Depends(require_permission("admin:users")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    user = await db.get(User, user_id)
    if user is None:
        raise APIError(404, "user_not_found", "User not found", "The account does not exist.")
    return await admin_user_response(db, user, detailed=True)


async def active_admin_count(db: AsyncSession) -> int:
    return int(
        await db.scalar(
            select(func.count(func.distinct(User.id)))
            .select_from(User)
            .join(UserRole, UserRole.user_id == User.id)
            .join(Role, Role.id == UserRole.role_id)
            .where(User.status == UserStatus.active, Role.name == "admin")
        )
        or 0
    )


async def target_is_admin(db: AsyncSession, user_id: uuid.UUID) -> bool:
    return (
        await db.scalar(
            select(UserRole.user_id)
            .join(Role, Role.id == UserRole.role_id)
            .where(UserRole.user_id == user_id, Role.name == "admin")
            .limit(1)
        )
        is not None
    )


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: uuid.UUID,
    payload: AdminUserAction,
    request: Request,
    auth: AuthContext = Depends(require_permission("admin:users")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await admin_mutation_limit(request, auth.user.id, "user-suspend")
    if user_id == auth.user.id:
        raise APIError(
            409,
            "admin_self_suspension_forbidden",
            "Self-suspension forbidden",
            "Administrators cannot suspend their own account.",
        )
    user = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None or user.status == UserStatus.deleted:
        raise APIError(404, "user_not_found", "User not found", "The account does not exist.")
    if user.status == UserStatus.suspended:
        return await admin_user_response(db, user)
    if (
        user.status == UserStatus.active
        and await target_is_admin(db, user.id)
        and await active_admin_count(db) <= 1
    ):
        raise APIError(
            409,
            "last_active_admin",
            "Last active admin",
            "The last active platform administrator cannot be suspended.",
        )
    now = utcnow()
    user.status = UserStatus.suspended
    user.token_version += 1
    await db.execute(
        update(AccessSession)
        .where(AccessSession.user_id == user.id, AccessSession.revoked_at.is_(None))
        .values(revoked_at=now)
    )
    db.add(
        AccountAdministrationAction(
            target_user_id=user.id,
            actor_user_id=auth.user.id,
            action="suspended",
            reason=payload.reason,
        )
    )
    add_audit_event(
        db,
        request,
        settings,
        "admin.user_suspended",
        actor_user_id=auth.user.id,
        target_user_id=user.id,
        metadata={"reason": payload.reason},
    )
    await db.commit()
    await db.refresh(user)
    return await admin_user_response(db, user)


@router.post("/users/{user_id}/restore")
async def restore_user(
    user_id: uuid.UUID,
    payload: AdminUserAction,
    request: Request,
    auth: AuthContext = Depends(require_permission("admin:users")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await admin_mutation_limit(request, auth.user.id, "user-restore")
    user = await db.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None or user.status == UserStatus.deleted:
        raise APIError(404, "user_not_found", "User not found", "The account does not exist.")
    if user.status != UserStatus.suspended:
        raise APIError(
            409,
            "user_not_suspended",
            "User is not suspended",
            "Only suspended accounts can be restored.",
        )
    user.status = UserStatus.active
    user.token_version += 1
    db.add(
        AccountAdministrationAction(
            target_user_id=user.id,
            actor_user_id=auth.user.id,
            action="restored",
            reason=payload.reason,
        )
    )
    add_audit_event(
        db,
        request,
        settings,
        "admin.user_restored",
        actor_user_id=auth.user.id,
        target_user_id=user.id,
        metadata={"reason": payload.reason},
    )
    await db.commit()
    await db.refresh(user)
    return await admin_user_response(db, user)


@router.get("/feature-flags")
async def list_feature_flags(
    _: AuthContext = Depends(require_permission("admin:feature-flags")),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    flags = list((await db.scalars(select(FeatureFlag).order_by(FeatureFlag.key))).all())
    return [flag_response(item) for item in flags]


@router.post("/feature-flags", status_code=status.HTTP_201_CREATED)
async def create_feature_flag(
    payload: FeatureFlagCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("admin:feature-flags")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await admin_mutation_limit(request, auth.user.id, "feature-flag-create")
    if await db.scalar(select(FeatureFlag.id).where(FeatureFlag.key == payload.key)):
        raise APIError(
            409,
            "feature_flag_exists",
            "Feature flag already exists",
            "A feature flag with this key already exists.",
        )
    flag = FeatureFlag(
        **payload.model_dump(),
        created_by_id=auth.user.id,
        updated_by_id=auth.user.id,
    )
    db.add(flag)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "admin.feature_flag_created",
        actor_user_id=auth.user.id,
        metadata={"flag_id": str(flag.id), "key": flag.key, "version": flag.version},
    )
    await db.commit()
    await db.refresh(flag)
    return flag_response(flag)


@router.get("/feature-flags/{key}")
async def get_feature_flag(
    key: str,
    _: AuthContext = Depends(require_permission("admin:feature-flags")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    flag = await db.scalar(select(FeatureFlag).where(FeatureFlag.key == key))
    if flag is None:
        raise APIError(
            404,
            "feature_flag_not_found",
            "Feature flag not found",
            "The feature flag does not exist.",
        )
    return flag_response(flag)


@router.patch("/feature-flags/{key}")
async def patch_feature_flag(
    key: str,
    payload: FeatureFlagPatch,
    request: Request,
    auth: AuthContext = Depends(require_permission("admin:feature-flags")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await admin_mutation_limit(request, auth.user.id, "feature-flag-update")
    flag = await db.scalar(select(FeatureFlag).where(FeatureFlag.key == key).with_for_update())
    if flag is None:
        raise APIError(
            404,
            "feature_flag_not_found",
            "Feature flag not found",
            "The feature flag does not exist.",
        )
    if flag.version != payload.expected_version:
        raise APIError(
            409,
            "feature_flag_version_conflict",
            "Feature flag version conflict",
            "Reload the feature flag before updating it.",
            extra={"current_version": flag.version},
        )
    values = payload.model_dump(exclude={"expected_version"}, exclude_unset=True)
    for field, value in values.items():
        if value is not None:
            setattr(flag, field, value)
    flag.version += 1
    flag.updated_by_id = auth.user.id
    add_audit_event(
        db,
        request,
        settings,
        "admin.feature_flag_updated",
        actor_user_id=auth.user.id,
        metadata={
            "flag_id": str(flag.id),
            "key": flag.key,
            "version": flag.version,
            "fields": sorted(values),
        },
    )
    await db.commit()
    await db.refresh(flag)
    return flag_response(flag)


@router.post("/feature-flags/{key}/evaluate")
async def evaluate_feature_flag(
    key: str,
    payload: FeatureFlagEvaluation,
    _: AuthContext = Depends(require_permission("admin:feature-flags")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    flag = await db.scalar(select(FeatureFlag).where(FeatureFlag.key == key))
    if flag is None:
        raise APIError(
            404,
            "feature_flag_not_found",
            "Feature flag not found",
            "The feature flag does not exist.",
        )
    bucket = stable_feature_bucket(settings, flag.key, payload.subject)
    reason = "disabled"
    enabled = False
    if payload.environment not in flag.environments:
        reason = "environment_not_enabled"
    elif payload.subject in flag.deny_subjects:
        reason = "deny_subject"
    elif payload.subject in flag.allow_subjects:
        enabled = True
        reason = "allow_subject"
    elif flag.enabled and bucket < flag.rollout_bps:
        enabled = True
        reason = "rollout"
    elif flag.enabled:
        reason = "outside_rollout"
    return {
        "key": flag.key,
        "enabled": enabled,
        "reason": reason,
        "bucket": bucket,
        "rollout_bps": flag.rollout_bps,
        "version": flag.version,
        "environment": payload.environment,
    }


@router.get("/settings")
async def list_platform_settings(
    _: AuthContext = Depends(require_permission("admin:settings")),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    latest_versions = (
        select(PlatformSetting.key, func.max(PlatformSetting.version).label("version"))
        .group_by(PlatformSetting.key)
        .subquery()
    )
    records = (
        await db.scalars(
            select(PlatformSetting)
            .join(
                latest_versions,
                (PlatformSetting.key == latest_versions.c.key)
                & (PlatformSetting.version == latest_versions.c.version),
            )
            .order_by(PlatformSetting.key)
        )
    ).all()
    return [
        {
            "id": item.id,
            "key": item.key,
            "version": item.version,
            "value": None if item.is_secret else item.value,
            "secret": item.is_secret,
            "configured": bool(item.encrypted_value) if item.is_secret else True,
            "created_at": item.created_at,
        }
        for item in records
    ]


@router.put("/settings/{key}")
async def update_platform_setting(
    key: str,
    payload: PlatformSettingUpdate,
    request: Request,
    auth: AuthContext = Depends(require_permission("admin:settings")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await admin_mutation_limit(request, auth.user.id, "platform-setting")
    latest = await db.scalar(
        select(PlatformSetting)
        .where(PlatformSetting.key == key)
        .order_by(PlatformSetting.version.desc())
        .limit(1)
        .with_for_update()
    )
    if latest is None:
        if payload.expected_version is not None:
            raise APIError(
                409,
                "platform_setting_version_conflict",
                "Platform setting version conflict",
                "The setting does not yet exist.",
                extra={"current_version": None},
            )
        version = 1
    else:
        if payload.expected_version != latest.version:
            raise APIError(
                409,
                "platform_setting_version_conflict",
                "Platform setting version conflict",
                "Reload the setting before updating it.",
                extra={"current_version": latest.version},
            )
        version = latest.version + 1
    serialized = json.dumps(payload.value, separators=(",", ":"), sort_keys=True)
    record = PlatformSetting(
        key=key,
        version=version,
        value=None if payload.secret else payload.value,
        encrypted_value=encrypt_secret(serialized, settings) if payload.secret else None,
        is_secret=payload.secret,
        created_by_id=auth.user.id,
    )
    db.add(record)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "admin.platform_setting_updated",
        actor_user_id=auth.user.id,
        metadata={
            "setting_id": str(record.id),
            "key": key,
            "version": version,
            "secret": payload.secret,
        },
    )
    await db.commit()
    return {
        "id": record.id,
        "key": key,
        "version": version,
        "value": None if payload.secret else payload.value,
        "secret": payload.secret,
        "configured": True,
        "created_at": record.created_at,
    }


@router.get("/audit")
async def list_audit_events(
    action: Annotated[str | None, Query(max_length=96)] = None,
    actor_user_id: uuid.UUID | None = None,
    target_user_id: uuid.UUID | None = None,
    workspace_id: uuid.UUID | None = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    _: AuthContext = Depends(require_permission("admin:audit")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    scope = f"admin-audit:{action}:{actor_user_id}:{target_user_id}:{workspace_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    security_statement = select(SecurityAuditEvent)
    business_statement = select(BusinessAuditEvent)
    if action:
        security_statement = security_statement.where(SecurityAuditEvent.action == action)
        business_statement = business_statement.where(BusinessAuditEvent.action == action)
    if actor_user_id:
        security_statement = security_statement.where(
            SecurityAuditEvent.actor_user_id == actor_user_id
        )
        business_statement = business_statement.where(
            BusinessAuditEvent.actor_user_id == actor_user_id
        )
    if target_user_id:
        security_statement = security_statement.where(
            SecurityAuditEvent.target_user_id == target_user_id
        )
        business_statement = business_statement.where(false())
    if workspace_id:
        security_statement = security_statement.where(false())
        business_statement = business_statement.where(
            BusinessAuditEvent.workspace_id == workspace_id
        )
    security_statement = apply_cursor(
        security_statement,
        SecurityAuditEvent.created_at,
        SecurityAuditEvent.id,
        cursor_value,
    ).order_by(SecurityAuditEvent.created_at.desc(), SecurityAuditEvent.id.desc()).limit(limit + 1)
    business_statement = apply_cursor(
        business_statement,
        BusinessAuditEvent.created_at,
        BusinessAuditEvent.id,
        cursor_value,
    ).order_by(BusinessAuditEvent.created_at.desc(), BusinessAuditEvent.id.desc()).limit(limit + 1)
    security_rows = list((await db.scalars(security_statement)).all())
    business_rows = list((await db.scalars(business_statement)).all())
    combined: list[dict[str, Any]] = [
        {
            "id": item.id,
            "source": "security",
            "workspace_id": None,
            "actor_user_id": item.actor_user_id,
            "target_user_id": item.target_user_id,
            "action": item.action,
            "aggregate_type": "user" if item.target_user_id else None,
            "aggregate_id": item.target_user_id,
            "request_id": item.request_id,
            "metadata": item.event_metadata,
            "created_at": item.created_at,
        }
        for item in security_rows
    ] + [
        {
            "id": item.id,
            "source": "business",
            "workspace_id": item.workspace_id,
            "actor_user_id": item.actor_user_id,
            "target_user_id": None,
            "action": item.action,
            "aggregate_type": item.aggregate_type,
            "aggregate_id": item.aggregate_id,
            "request_id": item.request_id,
            "metadata": item.event_metadata,
            "created_at": item.created_at,
        }
        for item in business_rows
    ]
    combined.sort(key=lambda item: (item["created_at"], item["id"]), reverse=True)
    visible = combined[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1]["created_at"], visible[-1]["id"])
        if len(combined) > limit and visible
        else None
    )
    return {"items": visible, "next_cursor": next_cursor}


async def count(db: AsyncSession, model: type[Any], *filters: Any) -> int:
    return int(
        await db.scalar(select(func.count()).select_from(model).where(*filters))
        or 0
    )


@router.get("/analytics")
async def platform_analytics(
    _: AuthContext = Depends(require_permission("admin:analytics")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    user_rows = (
        await db.execute(select(User.status, func.count()).group_by(User.status))
    ).all()
    ai = (
        await db.execute(
            select(
                func.count(AIUsageRecord.id),
                func.coalesce(func.sum(AIUsageRecord.prompt_units), 0),
                func.coalesce(func.sum(AIUsageRecord.completion_units), 0),
                func.coalesce(func.sum(AIUsageRecord.cost_micros), 0),
            )
        )
    ).one()
    order_value = int(
        await db.scalar(
            select(func.coalesce(func.sum(Order.total_minor), 0)).where(
                Order.state.in_(
                    [
                        OrderState.paid,
                        OrderState.fulfilling,
                        OrderState.completed,
                        OrderState.refunded,
                    ]
                )
            )
        )
        or 0
    )
    return {
        "users": {str(row[0].value): int(row[1]) for row in user_rows},
        "content": {
            "total": await count(db, ContentItem),
            "published": await count(db, ContentItem, ContentItem.state == ContentState.published),
        },
        "live": {
            "total": await count(db, LiveSession),
            "active": await count(db, LiveSession, LiveSession.state == LiveSessionState.live),
        },
        "orders": {
            "total": await count(db, Order),
            "paid_or_fulfilled": await count(
                db,
                Order,
                Order.state.in_([OrderState.paid, OrderState.fulfilling, OrderState.completed]),
            ),
            "gross_minor": order_value,
        },
        "gifts": {"total": await count(db, GiftSend)},
        "ai_usage": {
            "requests": int(ai[0]),
            "prompt_units": int(ai[1]),
            "completion_units": int(ai[2]),
            "cost_micros": int(ai[3]),
        },
        "moderation": {
            "open_reports": await count(
                db, ContentReport, ContentReport.status == ReportStatus.open
            ),
            "decisions": await count(db, ModerationAction),
        },
        "basis": "persisted_platform_records",
    }


def verify_health_signature(
    settings: Settings, raw_body: bytes, timestamp: str, supplied_signature: str
) -> None:
    if settings.service_health_hmac_secret is None:
        raise APIError(
            503,
            "service_health_ingestion_unavailable",
            "Service health ingestion unavailable",
            "No service health HMAC secret is configured for this deployment.",
        )
    try:
        timestamp_value = int(timestamp)
    except ValueError as exc:
        raise APIError(
            401,
            "service_health_signature_invalid",
            "Invalid service health signature",
            "The service health request signature is invalid.",
        ) from exc
    if abs(int(time.time()) - timestamp_value) > settings.service_health_max_clock_skew_seconds:
        raise APIError(
            401,
            "service_health_signature_expired",
            "Expired service health signature",
            "The service health request timestamp is outside the accepted clock window.",
        )
    expected = hmac.new(
        settings.service_health_hmac_secret.get_secret_value().encode(),
        timestamp.encode() + b"." + raw_body,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected, supplied_signature.lower()):
        raise APIError(
            401,
            "service_health_signature_invalid",
            "Invalid service health signature",
            "The service health request signature is invalid.",
        )


@router.post("/service-health", status_code=status.HTTP_202_ACCEPTED)
async def ingest_service_health(
    payload: ServiceHealthIngest,
    request: Request,
    signature: Annotated[str, Header(alias="X-Service-Signature", min_length=64, max_length=64)],
    timestamp_header: Annotated[str, Header(alias="X-Service-Timestamp", min_length=1)],
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    verify_health_signature(settings, await request.body(), timestamp_header, signature)
    report = ServiceHealthReport(**payload.model_dump())
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return {"status": "accepted", "report_id": report.id}


@router.get("/service-health")
async def read_service_health(
    _: AuthContext = Depends(require_permission("admin:analytics")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    rows = (
        await db.scalars(
            select(ServiceHealthReport)
            .order_by(
                ServiceHealthReport.received_at.desc(),
                ServiceHealthReport.id.desc(),
            )
        )
    ).all()
    latest: dict[tuple[str, str], ServiceHealthReport] = {}
    for row in rows:
        latest.setdefault((row.service, row.instance), row)
    reports = sorted(latest.values(), key=lambda item: (item.service, item.instance))
    return {
        "reports": [
            {
                "id": item.id,
                "service": item.service,
                "instance": item.instance,
                "status": item.status,
                "checks": item.checks,
                "observed_at": item.observed_at,
                "received_at": item.received_at,
            }
            for item in reports
        ],
        "scope": "application_submitted_reports",
        "prometheus_replacement": False,
    }


@router.get("/security")
async def security_dashboard(
    _: AuthContext = Depends(require_permission("admin:audit")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    now = utcnow()
    status_rows = (
        await db.execute(select(User.status, func.count()).group_by(User.status))
    ).all()
    integration_rows = (
        await db.execute(
            select(IntegrationConnection.state, func.count()).group_by(
                IntegrationConnection.state
            )
        )
    ).all()
    failed_actions = [
        "identity.login_failed",
        "identity.refresh_reuse_detected",
        "identity.mfa_failed",
    ]
    return {
        "sessions": {
            "active": await count(
                db,
                AccessSession,
                AccessSession.revoked_at.is_(None),
                AccessSession.expires_at > now,
            ),
            "revoked": await count(db, AccessSession, AccessSession.revoked_at.is_not(None)),
            "reuse_detected": await count(
                db, AccessSession, AccessSession.reuse_detected_at.is_not(None)
            ),
        },
        "security_events": {
            "total": await count(db, SecurityAuditEvent),
            "failed_or_suspicious": await count(
                db, SecurityAuditEvent, SecurityAuditEvent.action.in_(failed_actions)
            ),
            "persisted_action_filter": failed_actions,
        },
        "account_statuses": {str(row[0].value): int(row[1]) for row in status_rows},
        "integrations": {str(row[0].value): int(row[1]) for row in integration_rows},
        "moderation": {
            "open": await count(db, ContentReport, ContentReport.status == ReportStatus.open),
            "decisions": await count(db, ModerationAction),
        },
        "basis": "persisted_security_and_integration_records",
    }


@router.get("/moderation/summary")
async def moderation_summary(
    _: AuthContext = Depends(require_permission("admin:audit")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    queue = (
        await db.execute(select(ContentReport.status, func.count()).group_by(ContentReport.status))
    ).all()
    actions = (
        await db.execute(
            select(ModerationAction.action, func.count()).group_by(ModerationAction.action)
        )
    ).all()
    return {
        "queue": {str(row[0].value): int(row[1]) for row in queue},
        "decisions": {str(row[0]): int(row[1]) for row in actions},
    }
