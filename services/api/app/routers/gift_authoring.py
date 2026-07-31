from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import (
    AuthContext,
    get_session,
    get_settings,
    has_permission,
    require_permission,
)
from app.errors import APIError
from app.gift_models import (
    GiftAsset,
    GiftAssetState,
    GiftCategory,
    GiftCollection,
    GiftCollectionItem,
    GiftDefinition,
    GiftLifecycle,
    GiftTier,
    GiftVersion,
)
from app.gift_schemas import (
    GiftAssetDownloadResponse,
    GiftAssetResponse,
    GiftAssetUploadRequest,
    GiftAssetUploadResponse,
    GiftCategoryCreate,
    GiftCategoryResponse,
    GiftCollectionCreate,
    GiftCollectionItemRequest,
    GiftCollectionResponse,
    GiftDefinitionCreate,
    GiftDefinitionResponse,
    GiftManifestPatch,
    GiftValidationResponse,
    GiftVersionCreate,
    GiftVersionResponse,
    RuntimeManifest,
)
from app.gift_service import validate_publishable_version
from app.security import utcnow
from app.storage import S3ObjectStorage

router = APIRouter(prefix="/gifts", tags=["Gift authoring"])


async def authored_definition(
    db: AsyncSession,
    gift_definition_id: uuid.UUID,
    auth: AuthContext,
) -> GiftDefinition:
    gift = await db.get(GiftDefinition, gift_definition_id)
    if gift is None:
        raise APIError(
            404,
            "gift_definition_not_found",
            "Gift definition not found",
            "The requested gift definition does not exist.",
        )
    if gift.author_user_id != auth.user.id and not await has_permission(
        db, auth.user.id, "gifts:publish"
    ):
        raise APIError(
            403,
            "gift_authoring_denied",
            "Gift authoring denied",
            "You can edit only gift definitions you author.",
        )
    return gift


async def authored_version(
    db: AsyncSession,
    version_id: uuid.UUID,
    auth: AuthContext,
) -> tuple[GiftVersion, GiftDefinition]:
    version = await db.get(GiftVersion, version_id)
    if version is None:
        raise APIError(
            404,
            "gift_version_not_found",
            "Gift version not found",
            "The requested gift version does not exist.",
        )
    gift = await authored_definition(db, version.gift_definition_id, auth)
    return version, gift


def ensure_draft(version: GiftVersion) -> None:
    if version.state != GiftLifecycle.draft:
        raise APIError(
            409,
            "gift_version_not_editable",
            "Gift version is not editable",
            "Only a draft gift version can be edited.",
        )


@router.get("/author/categories", response_model=list[GiftCategoryResponse])
async def list_author_categories(
    include_inactive: bool = False,
    _: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> list[GiftCategory]:
    statement = select(GiftCategory)
    if not include_inactive:
        statement = statement.where(GiftCategory.active.is_(True))
    return list((await db.scalars(statement.order_by(GiftCategory.name))).all())


@router.get("/author/definitions", response_model=list[GiftDefinitionResponse])
async def list_authored_definitions(
    state: GiftLifecycle | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> list[GiftDefinition]:
    statement = select(GiftDefinition)
    if not await has_permission(db, auth.user.id, "gifts:publish"):
        statement = statement.where(GiftDefinition.author_user_id == auth.user.id)
    if state is not None:
        statement = statement.where(GiftDefinition.state == state)
    return list(
        (
            await db.scalars(
                statement.order_by(
                    GiftDefinition.updated_at.desc(),
                    GiftDefinition.id.desc(),
                ).limit(limit)
            )
        ).all()
    )


@router.get(
    "/author/definitions/{gift_definition_id}",
    response_model=GiftDefinitionResponse,
)
async def get_authored_definition(
    gift_definition_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftDefinition:
    return await authored_definition(db, gift_definition_id, auth)


@router.get(
    "/author/definitions/{gift_definition_id}/versions",
    response_model=list[GiftVersionResponse],
)
async def list_authored_versions(
    gift_definition_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> list[GiftVersion]:
    gift = await authored_definition(db, gift_definition_id, auth)
    return list(
        (
            await db.scalars(
                select(GiftVersion)
                .where(GiftVersion.gift_definition_id == gift.id)
                .order_by(GiftVersion.version_number.desc())
            )
        ).all()
    )


@router.get("/author/versions/{version_id}", response_model=GiftVersionResponse)
async def get_authored_version(
    version_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftVersion:
    version, _ = await authored_version(db, version_id, auth)
    return version


@router.get(
    "/author/versions/{version_id}/assets",
    response_model=list[GiftAssetResponse],
)
async def list_authored_assets(
    version_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> list[GiftAsset]:
    version, _ = await authored_version(db, version_id, auth)
    return list(
        (
            await db.scalars(
                select(GiftAsset)
                .where(GiftAsset.gift_version_id == version.id)
                .order_by(GiftAsset.created_at, GiftAsset.id)
            )
        ).all()
    )


@router.post(
    "/author/categories",
    response_model=GiftCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: GiftCategoryCreate,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftCategory:
    if await db.scalar(select(GiftCategory.id).where(GiftCategory.slug == payload.slug)):
        raise APIError(
            409,
            "gift_category_exists",
            "Gift category already exists",
            "A gift category already uses this slug.",
        )
    category = GiftCategory(
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
        created_by_id=auth.user.id,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.post(
    "/author/definitions",
    response_model=GiftDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_definition(
    payload: GiftDefinitionCreate,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftDefinition:
    category = await db.get(GiftCategory, payload.category_id)
    if category is None or not category.active:
        raise APIError(
            422,
            "gift_category_invalid",
            "Gift category invalid",
            "Select an active gift category.",
        )
    if await db.scalar(select(GiftDefinition.id).where(GiftDefinition.slug == payload.slug)):
        raise APIError(
            409,
            "gift_definition_exists",
            "Gift definition already exists",
            "A gift definition already uses this slug.",
        )
    values = payload.model_dump()
    gift = GiftDefinition(
        author_user_id=auth.user.id,
        state=GiftLifecycle.draft,
        sold_count=0,
        **values,
    )
    db.add(gift)
    await db.commit()
    await db.refresh(gift)
    return gift


@router.post(
    "/author/definitions/{gift_definition_id}/versions",
    response_model=GiftVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_version(
    gift_definition_id: uuid.UUID,
    payload: GiftVersionCreate,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftVersion:
    gift = await authored_definition(db, gift_definition_id, auth)
    if gift.state == GiftLifecycle.retired:
        raise APIError(
            409,
            "gift_definition_retired",
            "Gift definition retired",
            "A retired gift definition cannot receive new versions.",
        )
    latest = await db.scalar(
        select(func.coalesce(func.max(GiftVersion.version_number), 0)).where(
            GiftVersion.gift_definition_id == gift.id
        )
    )
    version = GiftVersion(
        gift_definition_id=gift.id,
        version_number=int(latest or 0) + 1,
        state=GiftLifecycle.draft,
        runtime_manifest=(
            payload.manifest.model_dump(mode="json") if payload.manifest is not None else {}
        ),
        created_by_id=auth.user.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version


@router.patch(
    "/author/versions/{version_id}/manifest",
    response_model=GiftVersionResponse,
)
async def patch_manifest(
    version_id: uuid.UUID,
    payload: GiftManifestPatch,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftVersion:
    version, _ = await authored_version(db, version_id, auth)
    ensure_draft(version)
    version.runtime_manifest = payload.manifest.model_dump(mode="json")
    await db.commit()
    await db.refresh(version)
    return version


@router.post(
    "/author/versions/{version_id}/assets/upload",
    response_model=GiftAssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def request_asset_upload(
    version_id: uuid.UUID,
    payload: GiftAssetUploadRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftAssetUploadResponse:
    version, gift = await authored_version(db, version_id, auth)
    ensure_draft(version)
    storage: S3ObjectStorage = request.app.state.object_storage
    storage.require_configured()
    asset_id = uuid.uuid4()
    object_key = (
        f"gifts/{gift.id}/versions/{version.id}/assets/{asset_id}.{payload.filename_extension}"
    )
    asset = GiftAsset(
        id=asset_id,
        gift_version_id=version.id,
        object_key=object_key,
        content_type=payload.content_type.lower(),
        byte_size=payload.byte_size,
        sha256=payload.sha256,
        platform=payload.platform,
        quality_tier=payload.quality_tier,
        state=GiftAssetState.pending,
    )
    db.add(asset)
    upload = await storage.presign_put(
        object_key=object_key,
        content_type=asset.content_type,
        sha256_hex=asset.sha256,
    )
    await db.commit()
    await db.refresh(asset)
    return GiftAssetUploadResponse(
        asset=GiftAssetResponse.model_validate(asset),
        upload_url=upload.url,
        required_headers=upload.headers,
        expires_in_seconds=upload.expires_in_seconds,
    )


@router.post(
    "/author/assets/{asset_id}/complete",
    response_model=GiftAssetResponse,
)
async def complete_asset_upload(
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftAsset:
    asset = await db.get(GiftAsset, asset_id)
    if asset is None:
        raise APIError(
            404,
            "gift_asset_not_found",
            "Gift asset not found",
            "The requested gift asset does not exist.",
        )
    version, _ = await authored_version(db, asset.gift_version_id, auth)
    ensure_draft(version)
    if asset.state == GiftAssetState.verified:
        return asset
    storage: S3ObjectStorage = request.app.state.object_storage
    await storage.verify_object(
        object_key=asset.object_key,
        expected_content_type=asset.content_type,
        expected_byte_size=asset.byte_size,
        expected_sha256=asset.sha256,
    )
    asset.state = GiftAssetState.verified
    asset.verified_at = utcnow()
    asset.rejection_code = None
    await db.commit()
    await db.refresh(asset)
    return asset


@router.get(
    "/author/assets/{asset_id}/download",
    response_model=GiftAssetDownloadResponse,
)
async def download_asset(
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftAssetDownloadResponse:
    asset = await db.get(GiftAsset, asset_id)
    if asset is None or asset.state != GiftAssetState.verified:
        raise APIError(
            404,
            "gift_asset_not_found",
            "Gift asset not found",
            "The requested verified gift asset does not exist.",
        )
    await authored_version(db, asset.gift_version_id, auth)
    storage: S3ObjectStorage = request.app.state.object_storage
    return GiftAssetDownloadResponse(
        download_url=await storage.presign_get(object_key=asset.object_key),
        expires_in_seconds=settings.s3_presign_seconds,
    )


@router.post(
    "/author/versions/{version_id}/submit",
    response_model=GiftVersionResponse,
)
async def submit_version(
    version_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftVersion:
    version, gift = await authored_version(db, version_id, auth)
    ensure_draft(version)
    try:
        RuntimeManifest.model_validate(version.runtime_manifest)
    except ValueError as exc:
        raise APIError(
            422,
            "invalid_runtime_manifest",
            "Runtime manifest required",
            "Attach a complete, strictly valid RuntimeManifest before review.",
        ) from exc
    version.state = GiftLifecycle.review
    version.submitted_by_id = auth.user.id
    version.submitted_at = utcnow()
    current_published = await db.scalar(
        select(GiftVersion.id).where(
            GiftVersion.gift_definition_id == gift.id,
            GiftVersion.state == GiftLifecycle.published,
            GiftVersion.id != version.id,
        )
    )
    if current_published is None:
        gift.state = GiftLifecycle.review
    await db.commit()
    await db.refresh(version)
    return version


async def review_version(db: AsyncSession, version_id: uuid.UUID) -> GiftVersion:
    version = await db.get(GiftVersion, version_id)
    if version is None:
        raise APIError(
            404,
            "gift_version_not_found",
            "Gift version not found",
            "The requested gift version does not exist.",
        )
    return version


@router.post(
    "/review/versions/{version_id}/validate",
    response_model=GiftValidationResponse,
)
async def validate_version(
    version_id: uuid.UUID,
    _: AuthContext = Depends(require_permission("gifts:review")),
    db: AsyncSession = Depends(get_session),
) -> GiftValidationResponse:
    version = await review_version(db, version_id)
    checks = await validate_publishable_version(db, version)
    return GiftValidationResponse(valid=True, checks=checks)


@router.post(
    "/review/versions/{version_id}/publish",
    response_model=GiftVersionResponse,
)
async def publish_version(
    version_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:publish")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftVersion:
    version = await review_version(db, version_id)
    gift = await db.get(GiftDefinition, version.gift_definition_id)
    if gift is None:
        raise APIError(
            404,
            "gift_definition_not_found",
            "Gift definition not found",
            "The requested gift definition does not exist.",
        )
    if gift.tier == GiftTier.ultra_premium and version.created_by_id == auth.user.id:
        raise APIError(
            403,
            "ultra_premium_separation_required",
            "Independent ultra-premium review required",
            "An ultra-premium version must be approved by someone other than its author.",
        )
    await validate_publishable_version(db, version)
    prior_versions = list(
        (
            await db.scalars(
                select(GiftVersion).where(
                    GiftVersion.gift_definition_id == gift.id,
                    GiftVersion.state == GiftLifecycle.published,
                    GiftVersion.id != version.id,
                )
            )
        ).all()
    )
    now = utcnow()
    for prior in prior_versions:
        prior.state = GiftLifecycle.retired
        prior.retired_at = now
    version.state = GiftLifecycle.published
    version.reviewed_by_id = auth.user.id
    version.published_at = now
    gift.state = GiftLifecycle.published
    add_audit_event(
        db,
        request,
        settings,
        "gifts.version_published",
        actor_user_id=auth.user.id,
        metadata={
            "gift_definition_id": str(gift.id),
            "gift_version_id": str(version.id),
            "version_number": version.version_number,
        },
    )
    await db.commit()
    await db.refresh(version)
    return version


async def retire_version_record(
    *,
    db: AsyncSession,
    version_id: uuid.UUID,
    request: Request,
    auth: AuthContext,
    settings: Settings,
    action: str,
) -> GiftVersion:
    version = await review_version(db, version_id)
    if version.state == GiftLifecycle.retired:
        return version
    if version.state != GiftLifecycle.published:
        raise APIError(
            409,
            "gift_version_not_published",
            "Gift version is not published",
            "Only a published version can be retired.",
        )
    version.state = GiftLifecycle.retired
    version.retired_at = utcnow()
    gift = await db.get(GiftDefinition, version.gift_definition_id)
    assert gift is not None
    other = await db.scalar(
        select(GiftVersion.id).where(
            GiftVersion.gift_definition_id == gift.id,
            GiftVersion.state == GiftLifecycle.published,
            GiftVersion.id != version.id,
        )
    )
    if other is None:
        gift.state = GiftLifecycle.retired
        gift.retired_at = utcnow()
    add_audit_event(
        db,
        request,
        settings,
        action,
        actor_user_id=auth.user.id,
        metadata={
            "gift_definition_id": str(gift.id),
            "gift_version_id": str(version.id),
        },
    )
    await db.commit()
    await db.refresh(version)
    return version


@router.post(
    "/review/versions/{version_id}/retire",
    response_model=GiftVersionResponse,
)
async def retire_version(
    version_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:publish")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftVersion:
    return await retire_version_record(
        db=db,
        version_id=version_id,
        request=request,
        auth=auth,
        settings=settings,
        action="gifts.version_retired",
    )


@router.post(
    "/moderation/versions/{version_id}/emergency-retire",
    response_model=GiftVersionResponse,
)
async def emergency_retire_version(
    version_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftVersion:
    return await retire_version_record(
        db=db,
        version_id=version_id,
        request=request,
        auth=auth,
        settings=settings,
        action="gifts.version_emergency_retired",
    )


@router.post(
    "/author/collections",
    response_model=GiftCollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_collection(
    payload: GiftCollectionCreate,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> GiftCollection:
    if await db.scalar(select(GiftCollection.id).where(GiftCollection.slug == payload.slug)):
        raise APIError(
            409,
            "gift_collection_exists",
            "Gift collection already exists",
            "A gift collection already uses this slug.",
        )
    collection = GiftCollection(
        **payload.model_dump(),
        created_by_id=auth.user.id,
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return collection


@router.post(
    "/author/collections/{collection_id}/items",
    status_code=status.HTTP_201_CREATED,
)
async def add_collection_item(
    collection_id: uuid.UUID,
    payload: GiftCollectionItemRequest,
    auth: AuthContext = Depends(require_permission("gifts:author")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    collection = await db.get(GiftCollection, collection_id)
    gift = await db.get(GiftDefinition, payload.gift_definition_id)
    if collection is None or gift is None:
        raise APIError(
            404,
            "gift_collection_resource_not_found",
            "Gift collection resource not found",
            "The collection or gift definition does not exist.",
        )
    if collection.created_by_id != auth.user.id and not await has_permission(
        db, auth.user.id, "gifts:publish"
    ):
        raise APIError(
            403,
            "gift_collection_authoring_denied",
            "Gift collection authoring denied",
            "You can edit only collections you created.",
        )
    existing = await db.scalar(
        select(GiftCollectionItem).where(
            GiftCollectionItem.collection_id == collection_id,
            GiftCollectionItem.gift_definition_id == gift.id,
        )
    )
    if existing is None:
        existing = GiftCollectionItem(
            collection_id=collection_id,
            gift_definition_id=gift.id,
            position=payload.position,
        )
        db.add(existing)
        await db.commit()
        await db.refresh(existing)
    return {
        "id": str(existing.id),
        "collection_id": str(existing.collection_id),
        "gift_definition_id": str(existing.gift_definition_id),
        "position": existing.position,
    }
