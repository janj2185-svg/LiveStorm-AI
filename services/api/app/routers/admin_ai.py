from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import (
    AICapability,
    AIProviderConfiguration,
    AIUsageRecord,
    PromptTemplate,
    PromptTemplateState,
)
from app.ai_schemas import (
    AIUsageResponse,
    PromptTemplateCreate,
    PromptTemplateResponse,
    ProviderConfigurationCreate,
    ProviderConfigurationPatch,
    ProviderConfigurationResponse,
)
from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import AuthContext, get_session, get_settings, require_permission
from app.errors import APIError
from app.schemas import MessageResponse
from app.security import encrypt_secret, utcnow

router = APIRouter(prefix="/admin/ai", tags=["Administration"])


def provider_response(record: AIProviderConfiguration) -> ProviderConfigurationResponse:
    return ProviderConfigurationResponse(
        id=record.id,
        name=record.name,
        base_url=record.base_url,
        enabled=record.enabled,
        capabilities=[AICapability(value) for value in record.capabilities],
        model_mapping=record.model_mapping,
        pricing_config=record.pricing_config,
        credential_configured=bool(record.encrypted_api_credential),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _refresh_registry(request: Request, db: AsyncSession) -> None:
    await request.app.state.ai_provider_registry.refresh_from_database(
        db, request.app.state.settings
    )


@router.get("/providers", response_model=list[ProviderConfigurationResponse])
async def list_provider_configurations(
    _: AuthContext = Depends(require_permission("ai:providers:manage")),
    db: AsyncSession = Depends(get_session),
) -> list[ProviderConfigurationResponse]:
    records = (
        await db.scalars(select(AIProviderConfiguration).order_by(AIProviderConfiguration.name))
    ).all()
    return [provider_response(item) for item in records]


@router.post(
    "/providers",
    response_model=ProviderConfigurationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_provider_configuration(
    payload: ProviderConfigurationCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("ai:providers:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ProviderConfigurationResponse:
    if settings.environment == "production" and not payload.base_url.startswith("https://"):
        raise APIError(
            422,
            "ai_provider_https_required",
            "HTTPS provider URL required",
            "AI provider base URLs must use HTTPS in production.",
        )
    record = AIProviderConfiguration(
        name=payload.name,
        base_url=payload.base_url,
        encrypted_api_credential=encrypt_secret(payload.api_credential, settings),
        enabled=payload.enabled,
        capabilities=[item.value for item in payload.capabilities],
        model_mapping={
            capability.value: model for capability, model in payload.model_mapping.items()
        },
        pricing_config={
            key: value.model_dump(mode="json") for key, value in payload.pricing_config.items()
        },
        created_by_id=auth.user.id,
        updated_by_id=auth.user.id,
    )
    db.add(record)
    add_audit_event(
        db,
        request,
        settings,
        "ai.provider_created",
        actor_user_id=auth.user.id,
        metadata={
            "provider_name": payload.name,
            "enabled": payload.enabled,
            "capabilities": sorted(item.value for item in payload.capabilities),
        },
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "ai_provider_exists",
            "AI provider already exists",
            "A provider configuration with this name already exists.",
        ) from exc
    await db.refresh(record)
    await _refresh_registry(request, db)
    return provider_response(record)


@router.patch("/providers/{provider_id}", response_model=ProviderConfigurationResponse)
async def patch_provider_configuration(
    provider_id: uuid.UUID,
    payload: ProviderConfigurationPatch,
    request: Request,
    auth: AuthContext = Depends(require_permission("ai:providers:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ProviderConfigurationResponse:
    record = await db.get(AIProviderConfiguration, provider_id)
    if record is None:
        raise APIError(
            404,
            "ai_provider_not_found",
            "AI provider not found",
            "The provider configuration does not exist.",
        )
    values = payload.model_dump(exclude_unset=True)
    base_url = payload.base_url or record.base_url
    if settings.environment == "production" and not base_url.startswith("https://"):
        raise APIError(
            422,
            "ai_provider_https_required",
            "HTTPS provider URL required",
            "AI provider base URLs must use HTTPS in production.",
        )
    capabilities = (
        payload.capabilities
        if payload.capabilities is not None
        else [AICapability(item) for item in record.capabilities]
    )
    model_mapping = (
        payload.model_mapping if payload.model_mapping is not None else record.model_mapping
    )
    model_keys = {
        key if isinstance(key, AICapability) else AICapability(key) for key in model_mapping
    }
    if set(capabilities) - model_keys:
        raise APIError(
            422,
            "ai_provider_model_mapping_incomplete",
            "Provider model mapping incomplete",
            "Every configured capability requires an explicit model.",
        )
    if payload.base_url is not None:
        record.base_url = payload.base_url
    if payload.api_credential is not None:
        record.encrypted_api_credential = encrypt_secret(payload.api_credential, settings)
    if payload.enabled is not None:
        record.enabled = payload.enabled
    if payload.capabilities is not None:
        record.capabilities = [item.value for item in payload.capabilities]
    if payload.model_mapping is not None:
        record.model_mapping = {
            capability.value: model for capability, model in payload.model_mapping.items()
        }
    if payload.pricing_config is not None:
        record.pricing_config = {
            key: value.model_dump(mode="json") for key, value in payload.pricing_config.items()
        }
    record.updated_by_id = auth.user.id
    add_audit_event(
        db,
        request,
        settings,
        "ai.provider_updated",
        actor_user_id=auth.user.id,
        metadata={
            "provider_name": record.name,
            "changed_fields": sorted(values),
            "credential_rotated": payload.api_credential is not None,
        },
    )
    await db.commit()
    await db.refresh(record)
    await _refresh_registry(request, db)
    return provider_response(record)


@router.delete("/providers/{provider_id}", response_model=MessageResponse)
async def delete_provider_configuration(
    provider_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("ai:providers:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    record = await db.get(AIProviderConfiguration, provider_id)
    if record is None:
        raise APIError(
            404,
            "ai_provider_not_found",
            "AI provider not found",
            "The provider configuration does not exist.",
        )
    provider_name = record.name
    add_audit_event(
        db,
        request,
        settings,
        "ai.provider_deleted",
        actor_user_id=auth.user.id,
        metadata={"provider_name": provider_name},
    )
    await db.delete(record)
    await db.commit()
    await _refresh_registry(request, db)
    return MessageResponse(status="deleted")


@router.get("/prompts", response_model=list[PromptTemplateResponse])
async def list_prompt_templates(
    _: AuthContext = Depends(require_permission("ai:prompts:manage")),
    db: AsyncSession = Depends(get_session),
) -> list[PromptTemplate]:
    return list(
        (
            await db.scalars(
                select(PromptTemplate).order_by(
                    PromptTemplate.template_key,
                    PromptTemplate.locale,
                    PromptTemplate.version.desc(),
                )
            )
        ).all()
    )


@router.post(
    "/prompts",
    response_model=PromptTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_prompt_template(
    payload: PromptTemplateCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("ai:prompts:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PromptTemplate:
    record = PromptTemplate(
        template_key=payload.template_key,
        version=payload.version,
        locale=payload.locale,
        capability=payload.capability,
        content=payload.content,
        policy_metadata=payload.policy_metadata,
        state=PromptTemplateState.draft,
        created_by_id=auth.user.id,
    )
    db.add(record)
    add_audit_event(
        db,
        request,
        settings,
        "ai.prompt_created",
        actor_user_id=auth.user.id,
        metadata={
            "template_key": record.template_key,
            "version": record.version,
            "locale": record.locale,
            "capability": record.capability.value,
        },
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "ai_prompt_version_exists",
            "Prompt version already exists",
            "This prompt template version already exists for the locale and capability.",
        ) from exc
    await db.refresh(record)
    return record


@router.post("/prompts/{prompt_id}/publish", response_model=PromptTemplateResponse)
async def publish_prompt_template(
    prompt_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("ai:prompts:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PromptTemplate:
    record = await db.get(PromptTemplate, prompt_id)
    if record is None:
        raise APIError(
            404,
            "ai_prompt_not_found",
            "Prompt template not found",
            "The prompt template version does not exist.",
        )
    if record.state == PromptTemplateState.published:
        return record
    record.state = PromptTemplateState.published
    record.published_at = utcnow()
    record.published_by_id = auth.user.id
    add_audit_event(
        db,
        request,
        settings,
        "ai.prompt_published",
        actor_user_id=auth.user.id,
        metadata={
            "prompt_id": str(record.id),
            "template_key": record.template_key,
            "version": record.version,
        },
    )
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/usage", response_model=list[AIUsageResponse])
async def read_all_usage(
    user_id: uuid.UUID | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    _: AuthContext = Depends(require_permission("ai:usage:read:any")),
    db: AsyncSession = Depends(get_session),
) -> list[AIUsageRecord]:
    statement = select(AIUsageRecord)
    if user_id is not None:
        statement = statement.where(AIUsageRecord.user_id == user_id)
    return list(
        (await db.scalars(statement.order_by(AIUsageRecord.created_at.desc()).limit(limit))).all()
    )
