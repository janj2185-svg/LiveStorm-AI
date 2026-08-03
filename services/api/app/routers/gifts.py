from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    Header,
    Query,
    Request,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy import String, and_, cast, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.errors import APIError
from app.gift_commerce import (
    purchase_inventory,
    refund_gift_send,
    refund_inventory_item,
    retry_gift_delivery,
    send_gift,
)
from app.gift_models import (
    CreatorMonetizationSetting,
    GiftAffinity,
    GiftAsset,
    GiftAssetState,
    GiftCategory,
    GiftCollection,
    GiftCollectionItem,
    GiftDefinition,
    GiftEvent,
    GiftLifecycle,
    GiftSend,
    GiftSendStatus,
    GiftTier,
    GiftVersion,
    InventoryItem,
)
from app.gift_schemas import (
    CatalogGiftResponse,
    CatalogPage,
    CreatorMonetizationPatch,
    CreatorMonetizationResponse,
    GiftAssetDownloadResponse,
    GiftCategoryResponse,
    GiftCollectionResponse,
    GiftEventPage,
    GiftPreferencePatch,
    GiftPreferenceResponse,
    GiftPurchaseRequest,
    GiftRefundRequest,
    GiftRefundResponse,
    GiftRuntimeAsset,
    GiftRuntimeResponse,
    GiftSendPage,
    GiftSendRequest,
    GiftSendResponse,
    InventoryItemResponse,
    InventoryPage,
    RecommendationItem,
    RecommendationResponse,
    RuntimeManifest,
    WebSocketTicketResponse,
)
from app.gift_service import (
    GiftConnectionHub,
    catalog_gift_response,
    creator_monetization,
    event_response,
    gift_is_eligible,
    gift_preference,
    is_available,
    manifest_asset_ids,
    published_version,
    record_affinity,
)
from app.push_service import PushMessage, dispatch_push_best_effort
from app.rate_limit import rate_limit
from app.routers.messaging import websocket_user
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor
from app.storage import S3ObjectStorage

router = APIRouter(prefix="/gifts", tags=["Gifts"])
websocket_router = APIRouter(tags=["Gifts"])
admin_router = APIRouter(prefix="/admin/gifts", tags=["Administration"])
IdempotencyHeader = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


async def visible_catalog_gifts(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    query: str | None = None,
    category_slug: str | None = None,
    tier: GiftTier | None = None,
    collection_slug: str | None = None,
    cursor_value: tuple[datetime, uuid.UUID] | None = None,
) -> list[GiftDefinition]:
    now = utcnow()
    statement = select(GiftDefinition).where(
        GiftDefinition.state == GiftLifecycle.published,
        or_(
            GiftDefinition.available_from.is_(None),
            GiftDefinition.available_from <= now,
        ),
        or_(
            GiftDefinition.available_until.is_(None),
            GiftDefinition.available_until > now,
        ),
        or_(
            GiftDefinition.supply_cap.is_(None),
            GiftDefinition.sold_count < GiftDefinition.supply_cap,
        ),
    )
    if category_slug is not None:
        statement = statement.join(
            GiftCategory, GiftCategory.id == GiftDefinition.category_id
        ).where(GiftCategory.slug == category_slug, GiftCategory.active.is_(True))
    if tier is not None:
        statement = statement.where(GiftDefinition.tier == tier)
    if collection_slug is not None:
        statement = (
            statement.join(
                GiftCollectionItem,
                GiftCollectionItem.gift_definition_id == GiftDefinition.id,
            )
            .join(
                GiftCollection,
                GiftCollection.id == GiftCollectionItem.collection_id,
            )
            .where(
                GiftCollection.slug == collection_slug,
                GiftCollection.active.is_(True),
                or_(
                    GiftCollection.available_from.is_(None),
                    GiftCollection.available_from <= now,
                ),
                or_(
                    GiftCollection.available_until.is_(None),
                    GiftCollection.available_until > now,
                ),
            )
        )
    if query:
        pattern = f"%{query.strip()}%"
        statement = statement.where(
            or_(
                GiftDefinition.name.ilike(pattern),
                GiftDefinition.description.ilike(pattern),
                GiftDefinition.slug.ilike(pattern),
                cast(GiftDefinition.search_tags, String).ilike(pattern),
            )
        )
    statement = apply_cursor(
        statement,
        GiftDefinition.created_at,
        GiftDefinition.id,
        cursor_value,
    )
    candidates = list(
        (
            await db.scalars(
                statement.order_by(
                    GiftDefinition.created_at.desc(),
                    GiftDefinition.id.desc(),
                ).limit(500)
            )
        ).all()
    )
    visible: list[GiftDefinition] = []
    for gift in candidates:
        eligible, _ = await gift_is_eligible(db, user_id, gift)
        if eligible:
            try:
                await published_version(db, gift.id)
            except APIError:
                continue
            visible.append(gift)
    return visible


@router.get("/catalog", response_model=CatalogPage)
async def browse_catalog(
    q: str | None = Query(default=None, min_length=1, max_length=100),
    category: str | None = Query(default=None, min_length=3, max_length=64),
    tier: GiftTier | None = None,
    collection: str | None = Query(default=None, min_length=3, max_length=80),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CatalogPage:
    scope = f"gift-catalog:{q}:{category}:{tier}:{collection}"
    cursor_value = decode_cursor(settings, scope, cursor)
    gifts = await visible_catalog_gifts(
        db,
        user_id=auth.user.id,
        query=q,
        category_slug=category,
        tier=tier,
        collection_slug=collection,
        cursor_value=cursor_value,
    )
    page = gifts[: limit + 1]
    visible = page[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(page) > limit and visible
        else None
    )
    return CatalogPage(
        items=[await catalog_gift_response(db, gift) for gift in visible],
        next_cursor=next_cursor,
    )


@router.get("/catalog/{slug}", response_model=CatalogGiftResponse)
async def catalog_detail(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CatalogGiftResponse:
    gift = await db.scalar(select(GiftDefinition).where(GiftDefinition.slug == slug))
    if gift is None or not is_available(gift):
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    eligible, _ = await gift_is_eligible(db, auth.user.id, gift)
    if not eligible:
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    return await catalog_gift_response(db, gift)


@router.get("/catalog/{slug}/runtime", response_model=GiftRuntimeResponse)
async def catalog_runtime(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> GiftRuntimeResponse:
    gift = await db.scalar(select(GiftDefinition).where(GiftDefinition.slug == slug))
    if gift is None or not is_available(gift):
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    eligible, _ = await gift_is_eligible(db, auth.user.id, gift)
    if not eligible:
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    version = await published_version(db, gift.id)
    manifest = RuntimeManifest.model_validate(version.runtime_manifest)
    asset_ids = manifest_asset_ids(manifest)
    assets = list(
        (
            await db.scalars(
                select(GiftAsset)
                .where(
                    GiftAsset.gift_version_id == version.id,
                    GiftAsset.id.in_(asset_ids),
                    GiftAsset.state == GiftAssetState.verified,
                )
                .order_by(GiftAsset.id)
            )
        ).all()
    )
    if {asset.id for asset in assets} != asset_ids:
        raise APIError(
            503,
            "gift_runtime_incomplete",
            "Gift runtime unavailable",
            "One or more verified runtime assets are unavailable.",
        )
    return GiftRuntimeResponse(
        gift_definition_id=gift.id,
        gift_version_id=version.id,
        version_number=version.version_number,
        manifest=manifest,
        assets=[
            GiftRuntimeAsset(
                id=asset.id,
                content_type=asset.content_type,
                byte_size=asset.byte_size,
                sha256=asset.sha256,
                platform=asset.platform,
                quality_tier=asset.quality_tier,
            )
            for asset in assets
        ],
    )


@router.post("/catalog/{slug}/view", response_model=CatalogGiftResponse)
async def record_catalog_view(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CatalogGiftResponse:
    gift = await db.scalar(select(GiftDefinition).where(GiftDefinition.slug == slug))
    if gift is None or not is_available(gift):
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    eligible, _ = await gift_is_eligible(db, auth.user.id, gift)
    if not eligible:
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    await record_affinity(
        db,
        user_id=auth.user.id,
        category_id=gift.category_id,
        view_increment=1,
    )
    await db.commit()
    return await catalog_gift_response(db, gift)


@router.get("/categories", response_model=list[GiftCategoryResponse])
async def list_categories(
    _: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[GiftCategory]:
    return list(
        (
            await db.scalars(
                select(GiftCategory)
                .where(GiftCategory.active.is_(True))
                .order_by(GiftCategory.name)
            )
        ).all()
    )


@router.get("/collections", response_model=list[GiftCollectionResponse])
async def list_collections(
    _: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[GiftCollection]:
    now = utcnow()
    return list(
        (
            await db.scalars(
                select(GiftCollection)
                .where(
                    GiftCollection.active.is_(True),
                    or_(
                        GiftCollection.available_from.is_(None),
                        GiftCollection.available_from <= now,
                    ),
                    or_(
                        GiftCollection.available_until.is_(None),
                        GiftCollection.available_until > now,
                    ),
                )
                .order_by(GiftCollection.created_at.desc())
            )
        ).all()
    )


@router.get("/collections/{slug}", response_model=CatalogPage)
async def collection_catalog(
    slug: str,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CatalogPage:
    return await browse_catalog(
        q=None,
        category=None,
        tier=None,
        collection=slug,
        cursor=cursor,
        limit=limit,
        auth=auth,
        db=db,
        settings=settings,
    )


@router.get("/assets/{asset_id}/download", response_model=GiftAssetDownloadResponse)
async def public_asset_download(
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftAssetDownloadResponse:
    row = (
        await db.execute(
            select(GiftAsset, GiftDefinition)
            .join(GiftVersion, GiftVersion.id == GiftAsset.gift_version_id)
            .join(
                GiftDefinition,
                GiftDefinition.id == GiftVersion.gift_definition_id,
            )
            .where(
                GiftAsset.id == asset_id,
                GiftAsset.state == GiftAssetState.verified,
                GiftVersion.state == GiftLifecycle.published,
            )
        )
    ).one_or_none()
    asset = row[0] if row is not None else None
    gift = row[1] if row is not None else None
    if gift is not None:
        assert asset is not None
        eligible, _ = await gift_is_eligible(db, auth.user.id, gift)
        delivered_access = await db.scalar(
            select(GiftSend.id)
            .where(
                GiftSend.gift_version_id == asset.gift_version_id,
                GiftSend.status == GiftSendStatus.delivered,
                or_(
                    GiftSend.sender_user_id == auth.user.id,
                    GiftSend.recipient_user_id == auth.user.id,
                ),
            )
            .limit(1)
        )
        if not eligible and delivered_access is None:
            asset = None
    if asset is None:
        raise APIError(
            404,
            "gift_asset_not_found",
            "Gift asset not found",
            "The requested published asset does not exist.",
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    return GiftAssetDownloadResponse(
        download_url=await storage.presign_get(object_key=asset.object_key),
        expires_in_seconds=settings.s3_presign_seconds,
    )


@router.post(
    "/purchases",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def purchase_gift(
    payload: GiftPurchaseRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> InventoryItem:
    await rate_limit(
        request,
        bucket="gift-purchases",
        subject=str(auth.user.id),
        limit=settings.purchase_rate_limit,
        window_seconds=settings.wallet_rate_window_seconds,
    )
    lock = request.app.state.financial_operation_locks.lock(
        f"gift-purchase:{auth.user.id}:{idempotency_key}"
    )
    async with lock:
        item, created = await purchase_inventory(
            db,
            user_id=auth.user.id,
            payload=payload,
            idempotency_key=idempotency_key,
        )
        if created:
            await db.commit()
            await db.refresh(item)
    return item


async def publish_gift_events(
    request: Request,
    settings: Settings,
    records: list[GiftEvent],
) -> None:
    hub: GiftConnectionHub = request.app.state.gift_hub
    for record in records:
        await hub.publish(record.user_id, event_response(settings, record))


@router.post(
    "/sends",
    response_model=GiftSendResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_gift_endpoint(
    payload: GiftSendRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftSend:
    await rate_limit(
        request,
        bucket="gift-sends",
        subject=str(auth.user.id),
        limit=settings.gift_send_rate_limit,
        window_seconds=settings.wallet_rate_window_seconds,
    )
    lock = request.app.state.financial_operation_locks.lock(
        f"gift-send:{auth.user.id}:{idempotency_key}"
    )
    async with lock:
        gift_send, events, created = await send_gift(
            db,
            sender_user_id=auth.user.id,
            payload=payload,
            idempotency_key=idempotency_key,
        )
        if created:
            await db.commit()
            await db.refresh(gift_send)
            await publish_gift_events(request, settings, events)
            await dispatch_push_best_effort(
                db,
                request.app.state.push_dispatcher,
                user_ids={gift_send.recipient_user_id},
                message=PushMessage(
                    title="You received a SYLORA gift",
                    body=gift_send.message or "A creator gift just arrived.",
                    data={"type": "gift_received", "gift_send_id": str(gift_send.id)},
                ),
                action="push.gift_dispatch_failed",
                actor_user_id=auth.user.id,
                metadata={"gift_send_id": gift_send.id},
            )
    return gift_send


@router.post("/sends/{gift_send_id}/retry", response_model=GiftSendResponse)
async def retry_send(
    gift_send_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftSend:
    gift_send, events, changed = await retry_gift_delivery(
        db,
        gift_send_id=gift_send_id,
        user_id=auth.user.id,
    )
    if changed:
        await db.commit()
        await db.refresh(gift_send)
        await publish_gift_events(request, settings, events)
    return gift_send


@router.get("/inventory", response_model=InventoryPage)
async def inventory(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> InventoryPage:
    scope = f"gift-inventory:{auth.user.id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    statement = select(InventoryItem).where(
        InventoryItem.owner_user_id == auth.user.id,
        InventoryItem.quantity > 0,
        or_(
            InventoryItem.expires_at.is_(None),
            InventoryItem.expires_at > utcnow(),
        ),
    )
    statement = apply_cursor(
        statement,
        InventoryItem.created_at,
        InventoryItem.id,
        cursor_value,
    )
    rows = list(
        (
            await db.scalars(
                statement.order_by(InventoryItem.created_at.desc(), InventoryItem.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = rows[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(rows) > limit and visible
        else None
    )
    return InventoryPage(
        items=[InventoryItemResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


async def send_history(
    *,
    db: AsyncSession,
    settings: Settings,
    user_id: uuid.UUID,
    direction: str,
    cursor: str | None,
    limit: int,
) -> GiftSendPage:
    scope = f"gift-{direction}:{user_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    criterion = (
        GiftSend.sender_user_id == user_id
        if direction == "sent"
        else GiftSend.recipient_user_id == user_id
    )
    statement = select(GiftSend).where(criterion)
    statement = apply_cursor(
        statement,
        GiftSend.created_at,
        GiftSend.id,
        cursor_value,
    )
    rows = list(
        (
            await db.scalars(
                statement.order_by(GiftSend.created_at.desc(), GiftSend.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = rows[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(rows) > limit and visible
        else None
    )
    return GiftSendPage(
        items=[GiftSendResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


@router.get("/history/sent", response_model=GiftSendPage)
async def sent_history(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftSendPage:
    return await send_history(
        db=db,
        settings=settings,
        user_id=auth.user.id,
        direction="sent",
        cursor=cursor,
        limit=limit,
    )


@router.get("/history/received", response_model=GiftSendPage)
async def received_history(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftSendPage:
    return await send_history(
        db=db,
        settings=settings,
        user_id=auth.user.id,
        direction="received",
        cursor=cursor,
        limit=limit,
    )


@router.get("/preferences", response_model=GiftPreferenceResponse)
async def read_preferences(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Any:
    preference = await gift_preference(db, auth.user.id)
    await db.commit()
    return preference


@router.patch("/preferences", response_model=GiftPreferenceResponse)
async def update_preferences(
    payload: GiftPreferencePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Any:
    preference = await gift_preference(db, auth.user.id)
    for key, value in payload.model_dump(exclude_none=True).items():
        if key == "blocked_tiers":
            value = [item.value for item in value]
        setattr(preference, key, value)
    await db.commit()
    await db.refresh(preference)
    return preference


@router.get(
    "/creator/monetization",
    response_model=CreatorMonetizationResponse,
)
async def read_creator_monetization(
    auth: AuthContext = Depends(require_permission("creator:access")),
    db: AsyncSession = Depends(get_session),
) -> CreatorMonetizationSetting:
    setting = await creator_monetization(db, auth.user.id)
    await db.commit()
    return setting


@router.patch(
    "/creator/monetization",
    response_model=CreatorMonetizationResponse,
)
async def update_creator_monetization(
    payload: CreatorMonetizationPatch,
    auth: AuthContext = Depends(require_permission("creator:access")),
    db: AsyncSession = Depends(get_session),
) -> CreatorMonetizationSetting:
    setting = await creator_monetization(db, auth.user.id)
    setting.gifts_enabled = payload.gifts_enabled
    await db.commit()
    await db.refresh(setting)
    return setting


@router.get("/recommendations", response_model=RecommendationResponse)
async def recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> RecommendationResponse:
    gifts = await visible_catalog_gifts(db, user_id=auth.user.id)
    affinities = {
        affinity.category_id: affinity
        for affinity in (
            await db.scalars(select(GiftAffinity).where(GiftAffinity.user_id == auth.user.id))
        ).all()
    }
    ranked: list[tuple[int, GiftDefinition, str]] = []
    for gift in gifts:
        affinity = affinities.get(gift.category_id)
        if affinity is None:
            score = 0
            explanation = "Currently available and eligible for your account."
        else:
            score = affinity.purchase_count * 10 + affinity.view_count * 2
            explanation = (
                f"Category affinity: {affinity.purchase_count} purchase(s) and "
                f"{affinity.view_count} catalog view(s)."
            )
        ranked.append((score, gift, explanation))
    ranked.sort(key=lambda item: (item[0], item[1].created_at, item[1].id), reverse=True)
    return RecommendationResponse(
        method="heuristic",
        items=[
            RecommendationItem(
                gift=await catalog_gift_response(db, gift),
                score=score,
                explanation=explanation,
            )
            for score, gift, explanation in ranked[:limit]
        ],
    )


@admin_router.post(
    "/sends/{gift_send_id}/refund",
    response_model=GiftRefundResponse,
)
async def refund_send(
    gift_send_id: uuid.UUID,
    payload: GiftRefundRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:refund")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftRefundResponse:
    refund, events, created = await refund_gift_send(
        db,
        gift_send_id=gift_send_id,
        actor_user_id=auth.user.id,
        idempotency_key=idempotency_key,
        reason=payload.reason,
    )
    if created:
        add_audit_event(
            db,
            request,
            settings,
            "gifts.send_refunded",
            actor_user_id=auth.user.id,
            metadata={
                "gift_send_id": str(gift_send_id),
                "gift_refund_id": str(refund.id),
                "ledger_transaction_id": str(refund.ledger_transaction_id),
                "reason": payload.reason,
            },
        )
        await db.commit()
        await publish_gift_events(request, settings, events)
    return GiftRefundResponse(
        refund_id=refund.id,
        ledger_transaction_id=refund.ledger_transaction_id,
        status="refunded",
    )


@admin_router.post(
    "/inventory/{inventory_item_id}/refund",
    response_model=GiftRefundResponse,
)
async def refund_inventory(
    inventory_item_id: uuid.UUID,
    payload: GiftRefundRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(require_permission("gifts:refund")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftRefundResponse:
    refund, created = await refund_inventory_item(
        db,
        inventory_item_id=inventory_item_id,
        actor_user_id=auth.user.id,
        idempotency_key=idempotency_key,
        reason=payload.reason,
    )
    if created:
        add_audit_event(
            db,
            request,
            settings,
            "gifts.inventory_refunded",
            actor_user_id=auth.user.id,
            metadata={
                "inventory_item_id": str(inventory_item_id),
                "gift_refund_id": str(refund.id),
                "ledger_transaction_id": str(refund.ledger_transaction_id),
                "reason": payload.reason,
            },
        )
        await db.commit()
    return GiftRefundResponse(
        refund_id=refund.id,
        ledger_transaction_id=refund.ledger_transaction_id,
        status="refunded",
    )


@router.get("/events", response_model=GiftEventPage)
async def gift_events(
    cursor: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GiftEventPage:
    cursor_value = decode_cursor(settings, "gift-events", cursor)
    statement = select(GiftEvent).where(GiftEvent.user_id == auth.user.id)
    statement = apply_cursor(
        statement,
        GiftEvent.created_at,
        GiftEvent.id,
        cursor_value,
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(GiftEvent.created_at.desc(), GiftEvent.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    return GiftEventPage(
        items=[event_response(settings, record) for record in visible],
        next_cursor=(
            encode_cursor(
                settings,
                "gift-events",
                visible[-1].created_at,
                visible[-1].id,
            )
            if len(records) > limit and visible
            else None
        ),
    )


@router.post("/events/ticket", response_model=WebSocketTicketResponse)
async def create_gift_websocket_ticket(
    request: Request,
    auth: AuthContext = Depends(current_auth),
) -> WebSocketTicketResponse:
    from app.ws_tickets import mint_websocket_ticket

    return await mint_websocket_ticket(
        request,
        user_id=auth.user.id,
        namespace="gift",
        rate_bucket="gift-socket-ticket",
        unavailable_code="gift_realtime_unavailable",
        unavailable_title="Gift realtime unavailable",
    )


async def websocket_ticket_user(websocket: WebSocket, ticket: str) -> uuid.UUID:
    from app.ws_tickets import consume_websocket_ticket

    return await consume_websocket_ticket(
        websocket,
        ticket,
        namespace="gift",
        unavailable_code="gift_realtime_unavailable",
        unavailable_title="Gift realtime unavailable",
    )


@websocket_router.websocket("/ws/gifts")
async def gift_websocket(websocket: WebSocket) -> None:
    try:
        ticket = websocket.query_params.get("ticket")
        user_id = (
            await websocket_ticket_user(websocket, ticket)
            if ticket
            else await websocket_user(websocket)
        )
        settings: Settings = websocket.app.state.settings
        since = decode_cursor(settings, "gift-events", websocket.query_params.get("since"))
    except APIError:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    hub: GiftConnectionHub = websocket.app.state.gift_hub
    queue = await hub.subscribe(user_id)
    try:
        if since is not None:
            since_at, since_id = since
            async with websocket.app.state.session_factory() as db:
                records = list(
                    (
                        await db.scalars(
                            select(GiftEvent)
                            .where(
                                GiftEvent.user_id == user_id,
                                or_(
                                    GiftEvent.created_at > since_at,
                                    and_(
                                        GiftEvent.created_at == since_at,
                                        GiftEvent.id > since_id,
                                    ),
                                ),
                            )
                            .order_by(GiftEvent.created_at.asc(), GiftEvent.id.asc())
                            .limit(500)
                        )
                    ).all()
                )
                for record in records:
                    await websocket.send_json(
                        event_response(settings, record).model_dump(mode="json")
                    )
        while True:
            outgoing = asyncio.create_task(queue.get())
            incoming = asyncio.create_task(websocket.receive_text())
            done, pending = await asyncio.wait(
                {outgoing, incoming},
                timeout=25,
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            if not done:
                await websocket.send_json(
                    {"event": "heartbeat", "occurred_at": utcnow().isoformat()}
                )
            elif outgoing in done:
                await websocket.send_json(outgoing.result().model_dump(mode="json"))
            elif incoming in done and incoming.result() == "ping":
                await websocket.send_json(
                    {"event": "heartbeat", "occurred_at": utcnow().isoformat()}
                )
    except (WebSocketDisconnect, RuntimeError):
        return
    finally:
        await hub.unsubscribe(user_id, queue)
