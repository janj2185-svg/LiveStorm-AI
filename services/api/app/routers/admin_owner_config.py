"""Owner/Admin secure configuration for third-party integrations."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import AuthContext, get_session, get_settings, require_permission
from app.errors import APIError
from app.models import SecurityAuditEvent
from app.owner_config_backup import (
    create_backup,
    downloadable_backup_blob,
    list_backups,
    restore_backup,
)
from app.owner_config_health import run_health_checks
from app.owner_config_models import OwnerConfigAlert
from app.owner_config_schemas import (
    OwnerAlertView,
    OwnerAuditEventView,
    OwnerBackupCreate,
    OwnerBackupRestore,
    OwnerBackupView,
    OwnerCatalogResponse,
    OwnerConnectionTestResult,
    OwnerDeployReadiness,
    OwnerEnvExportResponse,
    OwnerHealthRunResult,
    OwnerProviderSummary,
    OwnerProviderUpsert,
    OwnerUsageStats,
)
from app.owner_config_service import (
    deploy_readiness,
    export_env_files,
    list_catalog,
    reconnect_provider,
    run_connection_test,
    upsert_provider,
)
from app.owner_config_stats import collect_usage_statistics
from app.owner_config_validators import OwnerValidationError
from app.routers.admin_operations import admin_mutation_limit
from app.security import utcnow

router = APIRouter(prefix="/admin/owner-config", tags=["Owner Configuration"])


def _validation_error(exc: OwnerValidationError) -> APIError:
    return APIError(
        422,
        "owner_config_invalid",
        "Owner configuration invalid",
        str(exc),
        extra=exc.details,
    )


@router.get("", response_model=OwnerCatalogResponse)
async def get_owner_config_catalog(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> OwnerCatalogResponse:
    return await list_catalog(db, settings, environment=environment)


@router.get("/deploy-readiness", response_model=OwnerDeployReadiness)
async def get_deploy_readiness(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> OwnerDeployReadiness:
    return await deploy_readiness(db, settings, environment=environment)


@router.put("/providers/{provider_key}", response_model=OwnerProviderSummary)
async def put_owner_provider(
    provider_key: str,
    payload: OwnerProviderUpsert,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> OwnerProviderSummary:
    await admin_mutation_limit(request, auth.user.id, "owner-config")
    try:
        summary, _ = await upsert_provider(
            db,
            settings,
            request,
            provider_key=provider_key,
            incoming=payload.values,
            expected_version=payload.expected_version,
            actor_id=auth.user.id,
            test_connection=payload.test_connection,
            enable_on_success=payload.enable_on_success,
            rotate=payload.rotate,
            key_expires_at=payload.key_expires_at,
            environment=payload.environment,
        )
    except OwnerValidationError as exc:
        raise _validation_error(exc) from exc
    return summary


@router.post(
    "/providers/{provider_key}/test",
    response_model=OwnerConnectionTestResult,
)
async def test_owner_provider(
    provider_key: str,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    enable_on_success: bool = True,
    environment: str | None = Query(default=None),
) -> OwnerConnectionTestResult:
    await admin_mutation_limit(request, auth.user.id, "owner-config-test")
    try:
        return await run_connection_test(
            db,
            settings,
            request,
            provider_key=provider_key,
            actor_id=auth.user.id,
            enable_on_success=enable_on_success,
            environment=environment,
        )
    except OwnerValidationError as exc:
        raise _validation_error(exc) from exc


@router.post(
    "/providers/{provider_key}/reconnect",
    response_model=OwnerConnectionTestResult,
)
async def reconnect_owner_provider(
    provider_key: str,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> OwnerConnectionTestResult:
    await admin_mutation_limit(request, auth.user.id, "owner-config-reconnect")
    try:
        return await reconnect_provider(
            db,
            settings,
            request,
            provider_key=provider_key,
            actor_id=auth.user.id,
            environment=environment,
        )
    except OwnerValidationError as exc:
        raise _validation_error(exc) from exc


@router.post("/health-checks/run", response_model=OwnerHealthRunResult)
async def run_owner_health_checks(
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> OwnerHealthRunResult:
    await admin_mutation_limit(request, auth.user.id, "owner-config-health")
    result = await run_health_checks(db, settings, environment=environment)
    return OwnerHealthRunResult(**result)


@router.get("/usage", response_model=OwnerUsageStats)
async def get_owner_usage_stats(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
    hours: int = Query(default=24, ge=1, le=720),
) -> OwnerUsageStats:
    payload = await collect_usage_statistics(
        db, settings, environment=environment, hours=hours
    )
    return OwnerUsageStats(**payload)


@router.get("/alerts", response_model=list[OwnerAlertView])
async def list_owner_alerts(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
    include_acknowledged: bool = False,
) -> list[OwnerAlertView]:
    from app.owner_config_service import resolve_environment

    profile = resolve_environment(settings, environment)
    statement = select(OwnerConfigAlert).where(OwnerConfigAlert.environment == profile)
    if not include_acknowledged:
        statement = statement.where(OwnerConfigAlert.acknowledged.is_(False))
    rows = (
        await db.scalars(statement.order_by(OwnerConfigAlert.created_at.desc()).limit(100))
    ).all()
    return [
        OwnerAlertView(
            id=row.id,
            provider_key=row.provider_key,
            environment=row.environment,
            severity=row.severity.value if hasattr(row.severity, "value") else str(row.severity),
            title=row.title,
            message=row.message,
            acknowledged=row.acknowledged,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/alerts/{alert_id}/acknowledge", response_model=OwnerAlertView)
async def acknowledge_owner_alert(
    alert_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
) -> OwnerAlertView:
    await admin_mutation_limit(request, auth.user.id, "owner-config-alert")
    alert = await db.get(OwnerConfigAlert, alert_id)
    if alert is None:
        raise APIError(404, "owner_alert_not_found", "Alert not found", "Unknown alert id.")
    alert.acknowledged = True
    alert.acknowledged_by_id = auth.user.id
    alert.acknowledged_at = utcnow()
    await db.commit()
    await db.refresh(alert)
    return OwnerAlertView(
        id=alert.id,
        provider_key=alert.provider_key,
        environment=alert.environment,
        severity=alert.severity.value if hasattr(alert.severity, "value") else str(alert.severity),
        title=alert.title,
        message=alert.message,
        acknowledged=alert.acknowledged,
        created_at=alert.created_at,
    )


@router.get("/audit", response_model=list[OwnerAuditEventView])
async def list_owner_config_audit(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[OwnerAuditEventView]:
    rows = (
        await db.scalars(
            select(SecurityAuditEvent)
            .where(SecurityAuditEvent.action.like("owner.config%"))
            .order_by(SecurityAuditEvent.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [
        OwnerAuditEventView(
            id=row.id,
            action=row.action,
            actor_user_id=row.actor_user_id,
            created_at=row.created_at,
            metadata=row.event_metadata or {},
        )
        for row in rows
    ]


@router.get("/backups", response_model=list[OwnerBackupView])
async def get_owner_backups(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> list[OwnerBackupView]:
    rows = await list_backups(db, environment=environment, settings=settings)
    return [
        OwnerBackupView(
            id=row.id,
            environment=row.environment,
            label=row.label,
            provider_count=row.provider_count,
            created_at=row.created_at,
            created_by_id=row.created_by_id,
        )
        for row in rows
    ]


@router.post("/backups", response_model=OwnerBackupView)
async def post_owner_backup(
    payload: OwnerBackupCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> OwnerBackupView:
    await admin_mutation_limit(request, auth.user.id, "owner-config-backup")
    backup = await create_backup(
        db,
        settings,
        request,
        actor_id=auth.user.id,
        environment=payload.environment,
        label=payload.label,
    )
    return OwnerBackupView(
        id=backup.id,
        environment=backup.environment,
        label=backup.label,
        provider_count=backup.provider_count,
        created_at=backup.created_at,
        created_by_id=backup.created_by_id,
    )


@router.get("/backups/{backup_id}/download")
async def download_owner_backup(
    backup_id: uuid.UUID,
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    from app.owner_config_models import OwnerConfigBackup

    backup = await db.get(OwnerConfigBackup, backup_id)
    if backup is None:
        raise APIError(404, "owner_backup_not_found", "Backup not found", "Unknown backup id.")
    return downloadable_backup_blob(backup)


@router.post("/backups/{backup_id}/restore")
async def restore_owner_backup(
    backup_id: uuid.UUID,
    payload: OwnerBackupRestore,
    request: Request,
    auth: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    await admin_mutation_limit(request, auth.user.id, "owner-config-restore")
    try:
        return await restore_backup(
            db,
            settings,
            request,
            backup_id=backup_id,
            actor_id=auth.user.id,
            rotate=payload.rotate,
        )
    except ValueError as exc:
        raise APIError(422, "owner_backup_restore_failed", "Restore failed", str(exc)) from exc


@router.get("/env-export", response_model=OwnerEnvExportResponse)
async def get_owner_env_export(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    environment: str | None = Query(default=None),
) -> OwnerEnvExportResponse:
    """Download generated .env fragments (contains secrets — owner/admin only)."""
    return await export_env_files(db, settings, environment=environment)
