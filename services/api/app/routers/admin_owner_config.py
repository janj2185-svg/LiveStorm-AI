"""Owner/Admin secure configuration for third-party integrations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import AuthContext, get_session, get_settings, require_permission
from app.errors import APIError
from app.owner_config_schemas import (
    OwnerCatalogResponse,
    OwnerConnectionTestResult,
    OwnerEnvExportResponse,
    OwnerProviderSummary,
    OwnerProviderUpsert,
)
from app.owner_config_service import (
    export_env_files,
    list_catalog,
    run_connection_test,
    upsert_provider,
)
from app.owner_config_validators import OwnerValidationError
from app.routers.admin_operations import admin_mutation_limit

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
) -> OwnerCatalogResponse:
    return await list_catalog(db, settings)


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
        )
    except OwnerValidationError as exc:
        raise _validation_error(exc) from exc


@router.get("/env-export", response_model=OwnerEnvExportResponse)
async def get_owner_env_export(
    _: AuthContext = Depends(require_permission("owner:config")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> OwnerEnvExportResponse:
    """Download generated .env fragments (contains secrets — owner/admin only)."""
    return await export_env_files(db, settings)
