from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    has_permission,
    require_permission,
)
from app.errors import APIError
from app.platform_models import (
    AssetState,
    BookingState,
    CartItem,
    MarketplaceProduct,
    MarketplaceStore,
    Order,
    OrderLine,
    OrderState,
    ProductAsset,
    ProductCollection,
    ProductCollectionItem,
    ProductEntitlement,
    ProductInventory,
    ProductKind,
    ProductPrice,
    ProductReview,
    ProductState,
    ProductVersion,
    ServiceBookingMessage,
    ServiceBookingRequest,
    SettlementMethod,
)
from app.platform_schemas import (
    AssetResponse,
    AssetUploadResponse,
    BookingMessageCreate,
    BookingPatch,
    BookingResponse,
    CartItemAdd,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CatalogProductResponse,
    CheckoutRequest,
    CollectionCreate,
    CollectionResponse,
    CursorPage,
    DownloadResponse,
    EntitlementResponse,
    OrderLineResponse,
    OrderResponse,
    ProductAssetUploadRequest,
    ProductCreate,
    ProductInventoryPatch,
    ProductPatch,
    ProductPriceCreate,
    ProductResponse,
    ProductVersionCreate,
    RefundRequest,
    ReviewCreate,
    ReviewPatch,
    ReviewResponse,
    StoreCreate,
    StorePatch,
    StoreResponse,
)
from app.platform_service import (
    add_cart_item,
    aware,
    cart_for_user,
    cart_items,
    checkout_cart,
    refund_order,
    require_creator_account,
)
from app.rate_limit import rate_limit
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor
from app.storage import S3ObjectStorage

router = APIRouter(tags=["Marketplace"])
IdempotencyHeader = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


async def store_for_owner(db: AsyncSession, user_id: uuid.UUID) -> MarketplaceStore:
    store = await db.scalar(
        select(MarketplaceStore).where(MarketplaceStore.owner_user_id == user_id)
    )
    if store is None:
        raise APIError(
            409,
            "marketplace_store_required",
            "Marketplace store required",
            "Create a seller store before managing products.",
        )
    return store


async def owned_product(
    db: AsyncSession, user_id: uuid.UUID, product_id: uuid.UUID
) -> MarketplaceProduct:
    product = await db.scalar(
        select(MarketplaceProduct)
        .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
        .where(
            MarketplaceProduct.id == product_id,
            MarketplaceStore.owner_user_id == user_id,
        )
    )
    if product is None:
        raise APIError(404, "product_not_found", "Product not found", "The product does not exist.")
    return product


async def order_response(db: AsyncSession, order: Order) -> OrderResponse:
    lines = list(
        (
            await db.scalars(
                select(OrderLine).where(OrderLine.order_id == order.id).order_by(OrderLine.id)
            )
        ).all()
    )
    return OrderResponse(
        **OrderResponse.model_validate(order).model_dump(exclude={"lines"}),
        lines=[OrderLineResponse.model_validate(line) for line in lines],
    )


@router.post(
    "/marketplace/seller/store",
    response_model=StoreResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_store(
    payload: StoreCreate,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> MarketplaceStore:
    creator = await require_creator_account(db, auth.user.id, active=True)
    if not creator.marketplace_enabled:
        raise APIError(
            403,
            "marketplace_not_enabled",
            "Marketplace not enabled",
            "Enable marketplace commerce on the creator account before creating a store.",
        )
    if (
        await db.scalar(
            select(MarketplaceStore.id).where(MarketplaceStore.owner_user_id == auth.user.id)
        )
        is not None
    ):
        raise APIError(
            409,
            "marketplace_store_exists",
            "Marketplace store exists",
            "This seller already has a store.",
        )
    store = MarketplaceStore(
        owner_user_id=auth.user.id,
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
    )
    db.add(store)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "store_slug_unavailable",
            "Store slug unavailable",
            "That public store slug is already in use.",
        ) from exc
    await db.refresh(store)
    return store


@router.get("/marketplace/seller/store", response_model=StoreResponse)
async def get_store(
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> MarketplaceStore:
    return await store_for_owner(db, auth.user.id)


@router.patch("/marketplace/seller/store", response_model=StoreResponse)
async def patch_store(
    payload: StorePatch,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> MarketplaceStore:
    store = await store_for_owner(db, auth.user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(store, field, value)
    await db.commit()
    await db.refresh(store)
    return store


@router.post(
    "/marketplace/seller/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    payload: ProductCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MarketplaceProduct:
    store = await store_for_owner(db, auth.user.id)
    product = MarketplaceProduct(
        store_id=store.id,
        slug=payload.slug,
        kind=payload.kind,
        category=payload.category,
        state=ProductState.draft,
    )
    db.add(product)
    await db.flush()
    version = ProductVersion(
        product_id=product.id,
        version_number=1,
        state=ProductState.draft,
        title=payload.title,
        description=payload.description,
        fulfillment_terms=payload.fulfillment_terms,
        created_by_id=auth.user.id,
    )
    price = ProductPrice(
        product_id=product.id,
        settlement_method=SettlementMethod(payload.settlement_method),
        amount_minor=payload.amount_minor,
        currency=payload.currency,
        external_reference=payload.external_reference,
        available_from=payload.available_from,
        available_until=payload.available_until,
        active=True,
    )
    inventory = ProductInventory(
        product_id=product.id,
        quantity_available=payload.quantity_available,
        quantity_sold=0,
        available_from=payload.available_from,
        available_until=payload.available_until,
        active=True,
    )
    db.add_all([version, price, inventory])
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.product_priced",
        actor_user_id=auth.user.id,
        metadata={
            "product_id": str(product.id),
            "price_id": str(price.id),
            "method": price.settlement_method.value,
            "amount_minor": price.amount_minor,
            "currency": price.currency,
        },
    )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "product_slug_unavailable",
            "Product slug unavailable",
            "That product slug already exists in this store.",
        ) from exc
    await db.refresh(product)
    return product


@router.get("/marketplace/seller/products", response_model=CursorPage)
async def list_seller_products(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    store = await store_for_owner(db, auth.user.id)
    scope = f"seller-products:{store.id}"
    statement = select(MarketplaceProduct).where(MarketplaceProduct.store_id == store.id)
    statement = apply_cursor(
        statement,
        MarketplaceProduct.created_at,
        MarketplaceProduct.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    MarketplaceProduct.created_at.desc(),
                    MarketplaceProduct.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[ProductResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.patch("/marketplace/seller/products/{product_id}", response_model=ProductResponse)
async def patch_product(
    product_id: uuid.UUID,
    payload: ProductPatch,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> MarketplaceProduct:
    product = await owned_product(db, auth.user.id, product_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "product_slug_unavailable",
            "Product slug unavailable",
            "That product slug already exists in this store.",
        ) from exc
    await db.refresh(product)
    return product


@router.post(
    "/marketplace/seller/products/{product_id}/versions",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def create_product_version(
    product_id: uuid.UUID,
    payload: ProductVersionCreate,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    product = await owned_product(db, auth.user.id, product_id)
    latest_number = int(
        await db.scalar(
            select(func.max(ProductVersion.version_number)).where(
                ProductVersion.product_id == product.id
            )
        )
        or 0
    )
    version = ProductVersion(
        product_id=product.id,
        version_number=latest_number + 1,
        state=ProductState.draft,
        title=payload.title,
        description=payload.description,
        fulfillment_terms=payload.fulfillment_terms,
        created_by_id=auth.user.id,
    )
    db.add(version)
    product.state = ProductState.draft
    await db.commit()
    await db.refresh(version)
    return {
        "id": version.id,
        "product_id": version.product_id,
        "version_number": version.version_number,
        "state": version.state,
        "title": version.title,
        "description": version.description,
        "fulfillment_terms": version.fulfillment_terms,
        "created_at": version.created_at,
    }


@router.patch(
    "/marketplace/seller/products/{product_id}/versions/{version_id}",
    response_model=dict[str, Any],
)
async def patch_product_version(
    product_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ProductVersionCreate,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await owned_product(db, auth.user.id, product_id)
    version = await db.get(ProductVersion, version_id)
    if version is None or version.product_id != product_id:
        raise APIError(
            404,
            "product_version_not_found",
            "Product version not found",
            "The version does not exist.",
        )
    if version.state == ProductState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Create a new product version to make changes.",
        )
    version.title = payload.title
    version.description = payload.description
    version.fulfillment_terms = payload.fulfillment_terms
    await db.commit()
    return {
        "id": version.id,
        "product_id": version.product_id,
        "version_number": version.version_number,
        "state": version.state,
        "title": version.title,
        "description": version.description,
        "fulfillment_terms": version.fulfillment_terms,
        "created_at": version.created_at,
    }


@router.post(
    "/marketplace/seller/products/{product_id}/prices",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def add_product_price(
    product_id: uuid.UUID,
    payload: ProductPriceCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    product = await owned_product(db, auth.user.id, product_id)
    if payload.settlement_method == "credits" and (
        payload.currency != "SYLORA_CREDIT" or payload.external_reference is not None
    ):
        raise APIError(
            422,
            "invalid_product_price",
            "Invalid product price",
            "Credit prices use SYLORA_CREDIT without an external reference.",
        )
    if payload.settlement_method == "external" and payload.external_reference is None:
        raise APIError(
            422,
            "invalid_product_price",
            "Invalid product price",
            "External prices require a settlement reference.",
        )
    await db.execute(
        update(ProductPrice)
        .where(
            ProductPrice.product_id == product.id,
            ProductPrice.settlement_method == SettlementMethod(payload.settlement_method),
            ProductPrice.active.is_(True),
        )
        .values(active=False)
    )
    price = ProductPrice(
        product_id=product.id,
        settlement_method=SettlementMethod(payload.settlement_method),
        amount_minor=payload.amount_minor,
        currency=payload.currency,
        external_reference=payload.external_reference,
        available_from=payload.available_from,
        available_until=payload.available_until,
        active=True,
    )
    db.add(price)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.product_repriced",
        actor_user_id=auth.user.id,
        metadata={
            "product_id": str(product.id),
            "price_id": str(price.id),
            "method": price.settlement_method.value,
            "amount_minor": price.amount_minor,
            "currency": price.currency,
        },
    )
    await db.commit()
    return {
        "id": price.id,
        "product_id": price.product_id,
        "settlement_method": price.settlement_method,
        "amount_minor": price.amount_minor,
        "currency": price.currency,
        "active": price.active,
    }


@router.patch(
    "/marketplace/seller/products/{product_id}/inventory",
    response_model=dict[str, Any],
)
async def patch_product_inventory(
    product_id: uuid.UUID,
    payload: ProductInventoryPatch,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    product = await owned_product(db, auth.user.id, product_id)
    inventory = await db.get(ProductInventory, product.id)
    if inventory is None:
        raise RuntimeError("product inventory is missing")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(inventory, field, value)
    if (
        inventory.available_from is not None
        and inventory.available_until is not None
        and aware(inventory.available_until) <= aware(inventory.available_from)
    ):
        raise APIError(
            422,
            "invalid_availability_window",
            "Invalid availability window",
            "Availability end must be after its start.",
        )
    await db.commit()
    return {
        "product_id": inventory.product_id,
        "quantity_available": inventory.quantity_available,
        "quantity_sold": inventory.quantity_sold,
        "available_from": inventory.available_from,
        "available_until": inventory.available_until,
        "active": inventory.active,
    }


@router.post(
    "/marketplace/seller/products/{product_id}/versions/{version_id}/assets/uploads",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product_asset_upload(
    product_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ProductAssetUploadRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> AssetUploadResponse:
    await owned_product(db, auth.user.id, product_id)
    version = await db.get(ProductVersion, version_id)
    if version is None or version.product_id != product_id:
        raise APIError(
            404,
            "product_version_not_found",
            "Product version not found",
            "The version does not exist.",
        )
    if version.state == ProductState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published product assets cannot be changed.",
        )
    asset_id = uuid.uuid4()
    object_key = f"marketplace/{auth.user.id}/{product_id}/{version_id}/{asset_id}"
    storage: S3ObjectStorage = request.app.state.object_storage
    upload = await storage.presign_put(
        object_key=object_key,
        content_type=payload.content_type,
        sha256_hex=payload.sha256,
    )
    asset = ProductAsset(
        id=asset_id,
        product_version_id=version.id,
        object_key=object_key,
        content_type=payload.content_type,
        byte_size=payload.byte_size,
        sha256=payload.sha256,
        state=AssetState.pending,
        download_limit=payload.download_limit,
        entitlement_days=payload.entitlement_days,
        rights_declaration=payload.rights_declaration,
        license_reference=payload.license_reference,
    )
    db.add(asset)
    await db.commit()
    return AssetUploadResponse(
        asset_id=asset.id,
        object_key=asset.object_key,
        upload_url=upload.url,
        headers=upload.headers,
        expires_in_seconds=upload.expires_in_seconds,
    )


@router.post(
    "/marketplace/seller/products/{product_id}/assets/{asset_id}/verify",
    response_model=AssetResponse,
)
async def verify_product_asset(
    product_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> ProductAsset:
    await owned_product(db, auth.user.id, product_id)
    asset = await db.get(ProductAsset, asset_id)
    version = await db.get(ProductVersion, asset.product_version_id) if asset else None
    if asset is None or version is None or version.product_id != product_id:
        raise APIError(
            404, "product_asset_not_found", "Product asset not found", "The asset does not exist."
        )
    if version.state == ProductState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published product assets cannot be changed.",
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    await storage.verify_object(
        object_key=asset.object_key,
        expected_content_type=asset.content_type,
        expected_byte_size=asset.byte_size,
        expected_sha256=asset.sha256,
    )
    asset.state = AssetState.verified
    asset.verified_at = utcnow()
    await db.commit()
    await db.refresh(asset)
    return asset


@router.post(
    "/marketplace/seller/products/{product_id}/publish",
    response_model=ProductResponse,
)
async def publish_product(
    product_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MarketplaceProduct:
    product = await owned_product(db, auth.user.id, product_id)
    version = await db.scalar(
        select(ProductVersion)
        .where(ProductVersion.product_id == product.id)
        .order_by(ProductVersion.version_number.desc())
        .limit(1)
    )
    if version is None:
        raise RuntimeError("product version is missing")
    if product.kind == ProductKind.digital:
        verified = await db.scalar(
            select(ProductAsset.id).where(
                ProductAsset.product_version_id == version.id,
                ProductAsset.state == AssetState.verified,
            )
        )
        if verified is None:
            raise APIError(
                409,
                "verified_product_asset_required",
                "Verified product asset required",
                "Digital products require a verified S3 asset.",
            )
    price = await db.scalar(
        select(ProductPrice.id).where(
            ProductPrice.product_id == product.id, ProductPrice.active.is_(True)
        )
    )
    if price is None:
        raise APIError(
            409,
            "active_product_price_required",
            "Active product price required",
            "Configure an active price before publication.",
        )
    now = utcnow()
    version.state = ProductState.published
    version.published_at = now
    product.state = ProductState.published
    product.published_version_id = version.id
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.product_published",
        actor_user_id=auth.user.id,
        metadata={"product_id": str(product.id), "version_id": str(version.id)},
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.post(
    "/marketplace/seller/products/{product_id}/retire",
    response_model=ProductResponse,
)
async def retire_product(
    product_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> MarketplaceProduct:
    product = await owned_product(db, auth.user.id, product_id)
    if product.state != ProductState.published:
        raise APIError(
            409,
            "product_not_published",
            "Product not published",
            "Only a published product can be retired.",
        )
    product.state = ProductState.retired
    inventory = await db.get(ProductInventory, product.id)
    if inventory is not None:
        inventory.active = False
    await db.commit()
    await db.refresh(product)
    return product


@router.post(
    "/marketplace/seller/collections",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_collection(
    payload: CollectionCreate,
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
) -> ProductCollection:
    store = await store_for_owner(db, auth.user.id)
    if payload.product_ids:
        owned_count = int(
            await db.scalar(
                select(func.count())
                .select_from(MarketplaceProduct)
                .where(
                    MarketplaceProduct.id.in_(payload.product_ids),
                    MarketplaceProduct.store_id == store.id,
                )
            )
            or 0
        )
        if owned_count != len(set(payload.product_ids)):
            raise APIError(
                422,
                "invalid_collection_products",
                "Invalid collection products",
                "Every collection product must belong to this store.",
            )
    collection = ProductCollection(
        store_id=store.id,
        slug=payload.slug,
        name=payload.name,
        description=payload.description,
        active=True,
    )
    db.add(collection)
    await db.flush()
    db.add_all(
        [
            ProductCollectionItem(
                collection_id=collection.id, product_id=product_id, position=index
            )
            for index, product_id in enumerate(payload.product_ids)
        ]
    )
    await db.commit()
    await db.refresh(collection)
    return collection


async def catalog_response(db: AsyncSession, product: MarketplaceProduct) -> CatalogProductResponse:
    version = await db.get(ProductVersion, product.published_version_id)
    inventory = await db.get(ProductInventory, product.id)
    price = await db.scalar(
        select(ProductPrice)
        .where(ProductPrice.product_id == product.id, ProductPrice.active.is_(True))
        .order_by(
            (ProductPrice.settlement_method == SettlementMethod.credits).desc(),
            ProductPrice.created_at.desc(),
        )
        .limit(1)
    )
    rating_count, rating_sum = (
        await db.execute(
            select(func.count(), func.coalesce(func.sum(ProductReview.rating), 0)).where(
                ProductReview.product_id == product.id
            )
        )
    ).one()
    if version is None or price is None or inventory is None:
        raise RuntimeError("published product catalog relationship is invalid")
    count = int(rating_count or 0)
    return CatalogProductResponse(
        **ProductResponse.model_validate(product).model_dump(),
        title=version.title,
        description=version.description,
        amount_minor=price.amount_minor,
        currency=price.currency,
        settlement_method=price.settlement_method,
        quantity_available=inventory.quantity_available,
        rating_average=(int(rating_sum or 0) * 100 // count) if count else None,
        rating_count=count,
    )


@router.get("/marketplace/catalog", response_model=CursorPage)
async def marketplace_catalog(
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=64),
    kind: ProductKind | None = None,
    collection_id: uuid.UUID | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    now = utcnow()
    scope = f"marketplace-catalog:{search}:{category}:{kind}:{collection_id}"
    statement = (
        select(MarketplaceProduct)
        .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
        .join(
            ProductVersion,
            ProductVersion.id == MarketplaceProduct.published_version_id,
        )
        .join(ProductInventory, ProductInventory.product_id == MarketplaceProduct.id)
        .where(
            MarketplaceProduct.state == ProductState.published,
            MarketplaceStore.active.is_(True),
            ProductInventory.active.is_(True),
            or_(
                ProductInventory.quantity_available.is_(None),
                ProductInventory.quantity_available > 0,
            ),
            or_(
                ProductInventory.available_from.is_(None),
                ProductInventory.available_from <= now,
            ),
            or_(
                ProductInventory.available_until.is_(None),
                ProductInventory.available_until > now,
            ),
        )
    )
    if search:
        term = f"%{search}%"
        statement = statement.where(
            or_(
                ProductVersion.title.ilike(term),
                ProductVersion.description.ilike(term),
            )
        )
    if category:
        statement = statement.where(MarketplaceProduct.category == category.lower())
    if kind:
        statement = statement.where(MarketplaceProduct.kind == kind)
    if collection_id:
        statement = statement.join(
            ProductCollectionItem,
            ProductCollectionItem.product_id == MarketplaceProduct.id,
        ).where(ProductCollectionItem.collection_id == collection_id)
    statement = apply_cursor(
        statement,
        MarketplaceProduct.created_at,
        MarketplaceProduct.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    MarketplaceProduct.created_at.desc(),
                    MarketplaceProduct.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[await catalog_response(db, item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.get("/marketplace/catalog/{product_id}", response_model=CatalogProductResponse)
async def marketplace_product_detail(
    product_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> CatalogProductResponse:
    now = utcnow()
    product = await db.scalar(
        select(MarketplaceProduct)
        .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
        .join(ProductInventory, ProductInventory.product_id == MarketplaceProduct.id)
        .where(
            MarketplaceProduct.id == product_id,
            MarketplaceProduct.state == ProductState.published,
            MarketplaceStore.active.is_(True),
            ProductInventory.active.is_(True),
            or_(
                ProductInventory.available_from.is_(None),
                ProductInventory.available_from <= now,
            ),
            or_(
                ProductInventory.available_until.is_(None),
                ProductInventory.available_until > now,
            ),
        )
    )
    if product is None:
        raise APIError(404, "product_not_found", "Product not found", "The product is unavailable.")
    return await catalog_response(db, product)


async def cart_response(db: AsyncSession, user_id: uuid.UUID) -> CartResponse:
    cart = await cart_for_user(db, user_id)
    items = await cart_items(db, cart.id)
    currencies = {item.currency for item in items}
    return CartResponse(
        id=cart.id,
        items=[CartItemResponse.model_validate(item) for item in items],
        subtotal_minor=sum(item.unit_price_minor * item.quantity for item in items),
        currency=next(iter(currencies)) if len(currencies) == 1 else None,
    )


@router.get("/marketplace/cart", response_model=CartResponse)
async def get_cart(
    auth: AuthContext = Depends(current_auth), db: AsyncSession = Depends(get_session)
) -> CartResponse:
    result = await cart_response(db, auth.user.id)
    await db.commit()
    return result


@router.post(
    "/marketplace/cart/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_to_cart(
    payload: CartItemAdd,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CartResponse:
    await add_cart_item(
        db,
        user_id=auth.user.id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        method=SettlementMethod(payload.settlement_method),
    )
    await db.commit()
    return await cart_response(db, auth.user.id)


async def owned_cart_item(db: AsyncSession, user_id: uuid.UUID, item_id: uuid.UUID) -> CartItem:
    cart = await cart_for_user(db, user_id)
    item = await db.scalar(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    if item is None:
        raise APIError(
            404, "cart_item_not_found", "Cart item not found", "The cart item does not exist."
        )
    return item


@router.patch("/marketplace/cart/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: uuid.UUID,
    payload: CartItemUpdate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CartResponse:
    item = await owned_cart_item(db, auth.user.id, item_id)
    product = await db.get(MarketplaceProduct, item.product_id)
    if product is None:
        raise APIError(
            409,
            "product_unavailable",
            "Product unavailable",
            "The cart product is no longer available.",
        )
    if product.kind == ProductKind.service and payload.quantity != 1:
        raise APIError(
            422,
            "service_quantity_invalid",
            "Invalid service quantity",
            "Service bookings must be purchased one at a time.",
        )
    inventory = await db.get(ProductInventory, item.product_id)
    if inventory is None or (
        inventory.quantity_available is not None and payload.quantity > inventory.quantity_available
    ):
        raise APIError(
            409,
            "product_inventory_insufficient",
            "Insufficient inventory",
            "The requested quantity is unavailable.",
        )
    item.quantity = payload.quantity
    await db.commit()
    return await cart_response(db, auth.user.id)


@router.delete("/marketplace/cart/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CartResponse:
    item = await owned_cart_item(db, auth.user.id, item_id)
    await db.delete(item)
    await db.commit()
    return await cart_response(db, auth.user.id)


@router.delete("/marketplace/cart", response_model=CartResponse)
async def clear_cart(
    auth: AuthContext = Depends(current_auth), db: AsyncSession = Depends(get_session)
) -> CartResponse:
    cart = await cart_for_user(db, auth.user.id)
    await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    await db.commit()
    return await cart_response(db, auth.user.id)


@router.post(
    "/marketplace/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def marketplace_checkout(
    payload: CheckoutRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> OrderResponse:
    await rate_limit(
        request,
        bucket="marketplace-checkout",
        subject=str(auth.user.id),
        limit=settings.marketplace_checkout_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    if payload.return_url is not None and not payload.return_url.startswith(
        settings.web_base_url.rstrip("/") + "/"
    ):
        raise APIError(
            422,
            "invalid_return_url",
            "Invalid return URL",
            "The return URL must be within the configured web application origin.",
        )
    lock = request.app.state.financial_operation_locks.lock(f"marketplace:{auth.user.id}")
    async with lock:
        order = await checkout_cart(
            db,
            payment_provider=request.app.state.payment_provider,
            buyer=auth.user,
            method=SettlementMethod(payload.settlement_method),
            idempotency_key=idempotency_key,
            return_url=payload.return_url,
        )
        await db.commit()
        await db.refresh(order)
    return await order_response(db, order)


@router.get("/marketplace/orders", response_model=CursorPage)
async def purchase_history(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"marketplace-orders:{auth.user.id}"
    statement = select(Order).where(Order.buyer_user_id == auth.user.id)
    statement = apply_cursor(
        statement,
        Order.created_at,
        Order.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(Order.created_at.desc(), Order.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[await order_response(db, item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.get("/marketplace/orders/{order_id}", response_model=OrderResponse)
async def order_detail(
    order_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> OrderResponse:
    order = await db.get(Order, order_id)
    seller_line = await db.scalar(
        select(OrderLine.id).where(
            OrderLine.order_id == order_id, OrderLine.seller_user_id == auth.user.id
        )
    )
    if order is None or (
        order.buyer_user_id != auth.user.id
        and seller_line is None
        and not await has_permission(db, auth.user.id, "marketplace:refund")
    ):
        raise APIError(404, "order_not_found", "Order not found", "The order does not exist.")
    return await order_response(db, order)


@router.get("/marketplace/seller/sales", response_model=CursorPage)
async def seller_sales(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(require_permission("marketplace:sell")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"seller-sales:{auth.user.id}"
    statement = (
        select(Order)
        .join(OrderLine, OrderLine.order_id == Order.id)
        .where(OrderLine.seller_user_id == auth.user.id)
        .distinct()
    )
    statement = apply_cursor(
        statement,
        Order.created_at,
        Order.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(Order.created_at.desc(), Order.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[await order_response(db, item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.post("/marketplace/seller/orders/{order_id}/refund", response_model=OrderResponse)
async def refund_marketplace_order(
    order_id: uuid.UUID,
    payload: RefundRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> OrderResponse:
    order = await db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    seller_ids = set(
        (
            await db.scalars(select(OrderLine.seller_user_id).where(OrderLine.order_id == order_id))
        ).all()
    )
    can_refund_any = await has_permission(db, auth.user.id, "marketplace:refund")
    if order is None or (not can_refund_any and seller_ids != {auth.user.id}):
        raise APIError(404, "order_not_found", "Order not found", "The order does not exist.")
    order = await refund_order(
        db,
        order=order,
        actor_user_id=auth.user.id,
        idempotency_key=idempotency_key,
        reason=payload.reason,
        payment_provider=request.app.state.payment_provider,
    )
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.order_refunded",
        actor_user_id=auth.user.id,
        target_user_id=order.buyer_user_id,
        metadata={
            "order_id": str(order.id),
            "total_minor": order.total_minor,
            "currency": order.currency,
            "reason": payload.reason,
        },
    )
    await db.commit()
    await db.refresh(order)
    return await order_response(db, order)


@router.get("/marketplace/entitlements", response_model=CursorPage)
async def list_entitlements(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"product-entitlements:{auth.user.id}"
    statement = select(ProductEntitlement).where(ProductEntitlement.user_id == auth.user.id)
    statement = apply_cursor(
        statement,
        ProductEntitlement.granted_at,
        ProductEntitlement.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    ProductEntitlement.granted_at.desc(),
                    ProductEntitlement.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[EntitlementResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].granted_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


@router.post(
    "/marketplace/downloads/{entitlement_id}/{asset_id}",
    response_model=DownloadResponse,
)
async def create_download(
    entitlement_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> DownloadResponse:
    entitlement = await db.scalar(
        select(ProductEntitlement).where(ProductEntitlement.id == entitlement_id).with_for_update()
    )
    if entitlement is None or entitlement.user_id != auth.user.id:
        raise APIError(
            404,
            "entitlement_not_found",
            "Entitlement not found",
            "The entitlement does not exist.",
        )
    if entitlement.state != "active" or (
        entitlement.expires_at is not None and aware(entitlement.expires_at) <= utcnow()
    ):
        raise APIError(
            403,
            "entitlement_inactive",
            "Entitlement inactive",
            "This download entitlement is inactive or expired.",
        )
    if (
        entitlement.download_limit is not None
        and entitlement.download_count >= entitlement.download_limit
    ):
        raise APIError(
            409,
            "download_limit_reached",
            "Download limit reached",
            "This entitlement has reached its download limit.",
        )
    asset = await db.get(ProductAsset, asset_id)
    if (
        asset is None
        or asset.product_version_id != entitlement.product_version_id
        or asset.state != AssetState.verified
    ):
        raise APIError(
            404, "product_asset_not_found", "Product asset not found", "The asset is unavailable."
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    url = await storage.presign_get(object_key=asset.object_key)
    entitlement.download_count += 1
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.product_download_authorized",
        actor_user_id=auth.user.id,
        metadata={
            "entitlement_id": str(entitlement.id),
            "asset_id": str(asset.id),
            "download_count": entitlement.download_count,
        },
    )
    await db.commit()
    return DownloadResponse(
        download_url=url,
        expires_in_seconds=settings.s3_presign_seconds,
        download_count=entitlement.download_count,
        download_limit=entitlement.download_limit,
    )


@router.post(
    "/marketplace/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    payload: ReviewCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ProductReview:
    await rate_limit(
        request,
        bucket="marketplace-reviews",
        subject=str(auth.user.id),
        limit=settings.marketplace_review_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    line = await db.get(OrderLine, payload.order_line_id)
    order = await db.get(Order, line.order_id) if line else None
    if (
        line is None
        or order is None
        or order.buyer_user_id != auth.user.id
        or order.state != OrderState.completed
    ):
        raise APIError(
            403,
            "completed_purchase_required",
            "Completed purchase required",
            "Only a buyer of a completed order can review this product.",
        )
    review = ProductReview(
        product_id=line.product_id,
        order_line_id=line.id,
        reviewer_user_id=auth.user.id,
        rating=payload.rating,
        body=payload.body,
    )
    db.add(review)
    try:
        await db.flush()
        add_audit_event(
            db,
            request,
            settings,
            "marketplace.review_created",
            actor_user_id=auth.user.id,
            metadata={
                "review_id": str(review.id),
                "order_line_id": str(line.id),
                "rating": review.rating,
            },
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(
            409,
            "review_exists",
            "Review exists",
            "This order line already has a review.",
        ) from exc
    await db.refresh(review)
    return review


@router.patch("/marketplace/reviews/{review_id}", response_model=ReviewResponse)
async def patch_review(
    review_id: uuid.UUID,
    payload: ReviewPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ProductReview:
    await rate_limit(
        request,
        bucket="marketplace-reviews",
        subject=str(auth.user.id),
        limit=settings.marketplace_review_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    review = await db.get(ProductReview, review_id)
    if review is None or review.reviewer_user_id != auth.user.id:
        raise APIError(404, "review_not_found", "Review not found", "The review does not exist.")
    old_rating = review.rating
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(review, field, value)
    add_audit_event(
        db,
        request,
        settings,
        "marketplace.review_updated",
        actor_user_id=auth.user.id,
        metadata={
            "review_id": str(review.id),
            "old_rating": old_rating,
            "new_rating": review.rating,
        },
    )
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/marketplace/catalog/{product_id}/reviews", response_model=CursorPage)
async def list_product_reviews(
    product_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"product-reviews:{product_id}"
    statement = select(ProductReview).where(ProductReview.product_id == product_id)
    statement = apply_cursor(
        statement,
        ProductReview.created_at,
        ProductReview.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(ProductReview.created_at.desc(), ProductReview.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[ReviewResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


async def authorized_booking(
    db: AsyncSession, user_id: uuid.UUID, booking_id: uuid.UUID
) -> ServiceBookingRequest:
    booking = await db.get(ServiceBookingRequest, booking_id)
    if booking is None or user_id not in {
        booking.buyer_user_id,
        booking.seller_user_id,
    }:
        raise APIError(404, "booking_not_found", "Booking not found", "The booking does not exist.")
    return booking


@router.get("/marketplace/orders/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ServiceBookingRequest:
    return await authorized_booking(db, auth.user.id, booking_id)


@router.patch("/marketplace/orders/bookings/{booking_id}", response_model=BookingResponse)
async def patch_booking(
    booking_id: uuid.UUID,
    payload: BookingPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ServiceBookingRequest:
    booking = await authorized_booking(db, auth.user.id, booking_id)
    values = payload.model_dump(exclude_unset=True)
    requested_status = values.get("status")
    allowed = {
        BookingState.requested: {
            BookingState.accepted,
            BookingState.declined,
            BookingState.cancelled,
        },
        BookingState.accepted: {BookingState.scheduled, BookingState.cancelled},
        BookingState.scheduled: {BookingState.completed, BookingState.cancelled},
    }
    if requested_status is not None and requested_status != booking.status:
        if requested_status not in allowed.get(booking.status, set()):
            raise APIError(
                409,
                "invalid_booking_transition",
                "Invalid booking transition",
                "The booking cannot move to that status.",
            )
        if (
            requested_status
            in {
                BookingState.accepted,
                BookingState.declined,
                BookingState.scheduled,
                BookingState.completed,
            }
            and auth.user.id != booking.seller_user_id
        ):
            raise APIError(
                403,
                "seller_action_required",
                "Seller action required",
                "Only the seller can accept, schedule, decline, or complete service.",
            )
    for field, value in values.items():
        setattr(booking, field, value)
    if booking.status == BookingState.scheduled and (
        booking.scheduled_start_at is None
        or booking.scheduled_end_at is None
        or aware(booking.scheduled_end_at) <= aware(booking.scheduled_start_at)
    ):
        raise APIError(
            422,
            "invalid_booking_schedule",
            "Invalid booking schedule",
            "A scheduled booking requires a valid start and end.",
        )
    if booking.status == BookingState.completed:
        line = await db.get(OrderLine, booking.order_line_id)
        if line is not None:
            remaining = int(
                await db.scalar(
                    select(func.count())
                    .select_from(ServiceBookingRequest)
                    .join(
                        OrderLine,
                        OrderLine.id == ServiceBookingRequest.order_line_id,
                    )
                    .where(
                        OrderLine.order_id == line.order_id,
                        ServiceBookingRequest.id != booking.id,
                        ServiceBookingRequest.status != BookingState.completed,
                    )
                )
                or 0
            )
            if remaining == 0:
                order = await db.get(Order, line.order_id)
                if order is not None:
                    order.state = OrderState.completed
                    order.completed_at = utcnow()
    await db.commit()
    await db.refresh(booking)
    return booking


@router.post(
    "/marketplace/orders/bookings/{booking_id}/messages",
    response_model=dict[str, Any],
    status_code=status.HTTP_201_CREATED,
)
async def add_booking_message(
    booking_id: uuid.UUID,
    payload: BookingMessageCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await authorized_booking(db, auth.user.id, booking_id)
    message = ServiceBookingMessage(
        booking_id=booking_id, sender_user_id=auth.user.id, body=payload.body
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return {
        "id": message.id,
        "booking_id": message.booking_id,
        "sender_user_id": message.sender_user_id,
        "body": message.body,
        "created_at": message.created_at,
    }
