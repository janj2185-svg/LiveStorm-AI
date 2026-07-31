from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
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
from app.gift_models import GiftSend, GiftSendStatus
from app.ledger_models import LedgerAccountType, LedgerEntry, LedgerTransactionType
from app.ledger_service import account_balance, reverse_transaction, user_account
from app.platform_models import (
    AssetState,
    ContentAsset,
    ContentItem,
    ContentKind,
    ContentProcessingJob,
    ContentState,
    ContentVersion,
    ContentVisibility,
    CreatorAccount,
    CreatorStatus,
    CreatorSubscription,
    CreatorSubscriptionTier,
    MarketplaceProduct,
    MarketplaceStore,
    Order,
    OrderLine,
    OrderState,
    ProcessingState,
    SettlementMethod,
    SubscriptionStatus,
)
from app.platform_schemas import (
    AssetResponse,
    AssetUploadRequest,
    AssetUploadResponse,
    ContentCreate,
    ContentDetailResponse,
    ContentPatch,
    ContentResponse,
    ContentVersionCreate,
    ContentVersionPatch,
    ContentVersionResponse,
    CreatorAccountCreate,
    CreatorAccountPatch,
    CreatorAccountResponse,
    CreatorAnalyticsResponse,
    CursorPage,
    ProcessingRequest,
    ProcessingResponse,
    ScheduleRequest,
    SubscriptionPurchaseRequest,
    SubscriptionRenewRequest,
    SubscriptionResponse,
    SubscriptionTierCreate,
    SubscriptionTierPatch,
    SubscriptionTierResponse,
)
from app.platform_service import (
    aware,
    can_access_content,
    latest_content_version,
    purchase_subscription,
    require_creator_account,
    require_owned_content,
)
from app.rate_limit import rate_limit
from app.security import utcnow
from app.social_models import Follow
from app.social_service import apply_cursor, decode_cursor, encode_cursor
from app.storage import S3ObjectStorage

router = APIRouter(tags=["Creator platform"])
IdempotencyHeader = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


def conflict_from_integrity(exc: IntegrityError, detail: str) -> APIError:
    return APIError(409, "resource_conflict", "Resource conflict", detail)


async def validate_content_visibility(
    db: AsyncSession,
    *,
    creator_user_id: uuid.UUID,
    visibility: ContentVisibility,
    required_tier_id: uuid.UUID | None,
    purchase_product_id: uuid.UUID | None,
) -> None:
    if visibility == ContentVisibility.tier:
        tier = (
            await db.get(CreatorSubscriptionTier, required_tier_id)
            if required_tier_id is not None
            else None
        )
        if tier is None or tier.creator_user_id != creator_user_id:
            raise APIError(
                422,
                "invalid_content_tier",
                "Invalid content tier",
                "The subscription tier must belong to this creator.",
            )
    elif required_tier_id is not None:
        raise APIError(
            422,
            "invalid_content_visibility",
            "Invalid content visibility",
            "A required tier is only valid for tier visibility.",
        )
    if visibility == ContentVisibility.purchase:
        owned_product = await db.scalar(
            select(MarketplaceProduct.id)
            .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
            .where(
                MarketplaceProduct.id == purchase_product_id,
                MarketplaceStore.owner_user_id == creator_user_id,
            )
        )
        if owned_product is None:
            raise APIError(
                422,
                "invalid_content_product",
                "Invalid content product",
                "The purchase product must belong to this creator.",
            )
    elif purchase_product_id is not None:
        raise APIError(
            422,
            "invalid_content_visibility",
            "Invalid content visibility",
            "A purchase product is only valid for purchase visibility.",
        )


@router.post(
    "/creator/account",
    response_model=CreatorAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_creator_account(
    payload: CreatorAccountCreate,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> CreatorAccount:
    if await db.get(CreatorAccount, auth.user.id) is not None:
        raise APIError(
            409,
            "creator_account_exists",
            "Creator account exists",
            "This account already has creator settings.",
        )
    account = CreatorAccount(
        user_id=auth.user.id,
        public_slug=payload.public_slug,
        channel_name=payload.channel_name,
        description=payload.description,
        category=payload.category,
        status=CreatorStatus.onboarding,
    )
    db.add(account)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict_from_integrity(exc, "The requested creator slug is unavailable.") from exc
    await db.refresh(account)
    return account


@router.get("/creator/account", response_model=CreatorAccountResponse)
async def get_creator_account(
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> CreatorAccount:
    return await require_creator_account(db, auth.user.id)


@router.get("/creator/channels/{public_slug}", response_model=CreatorAccountResponse)
async def public_creator_channel(
    public_slug: str, db: AsyncSession = Depends(get_session)
) -> CreatorAccount:
    account = await db.scalar(
        select(CreatorAccount).where(
            CreatorAccount.public_slug == public_slug,
            CreatorAccount.status == CreatorStatus.active,
        )
    )
    if account is None:
        raise APIError(
            404, "creator_not_found", "Creator not found", "The creator channel does not exist."
        )
    return account


@router.patch("/creator/account", response_model=CreatorAccountResponse)
async def patch_creator_account(
    payload: CreatorAccountPatch,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorAccount:
    account = await require_creator_account(db, auth.user.id)
    values = payload.model_dump(exclude_unset=True)
    # Payout eligibility and suspension are administrative/review outcomes.
    if ("payout_eligible" in values or values.get("status") == CreatorStatus.suspended) and not any(
        role.name == "admin" for role in auth.user.roles
    ):
        raise APIError(
            403,
            "permission_denied",
            "Permission denied",
            "Payout eligibility and suspension are administered by platform operators.",
        )
    old_status = account.status
    for field, value in values.items():
        if value is not None:
            setattr(account, field, value)
    if old_status != account.status:
        add_audit_event(
            db,
            request,
            settings,
            "creator.status_changed",
            actor_user_id=auth.user.id,
            target_user_id=account.user_id,
            metadata={"from": old_status.value, "to": account.status.value},
        )
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise conflict_from_integrity(exc, "The requested creator slug is unavailable.") from exc
    await db.refresh(account)
    return account


@router.post(
    "/creator/subscription-tiers",
    response_model=SubscriptionTierResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription_tier(
    payload: SubscriptionTierCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorSubscriptionTier:
    await require_creator_account(db, auth.user.id)
    tier = CreatorSubscriptionTier(creator_user_id=auth.user.id, **payload.model_dump())
    db.add(tier)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "creator.subscription_tier_priced",
        actor_user_id=auth.user.id,
        metadata={
            "tier_id": str(tier.id),
            "price_minor": tier.price_minor,
            "external": tier.external_settlement_reference is not None,
        },
    )
    await db.commit()
    await db.refresh(tier)
    return tier


@router.get("/creator/subscription-tiers", response_model=list[SubscriptionTierResponse])
async def list_owned_subscription_tiers(
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> list[CreatorSubscriptionTier]:
    return list(
        (
            await db.scalars(
                select(CreatorSubscriptionTier)
                .where(CreatorSubscriptionTier.creator_user_id == auth.user.id)
                .order_by(CreatorSubscriptionTier.created_at.desc())
            )
        ).all()
    )


@router.get(
    "/subscriptions/tiers/{creator_user_id}",
    response_model=list[SubscriptionTierResponse],
)
async def public_subscription_tiers(
    creator_user_id: uuid.UUID, db: AsyncSession = Depends(get_session)
) -> list[CreatorSubscriptionTier]:
    now = utcnow()
    return list(
        (
            await db.scalars(
                select(CreatorSubscriptionTier)
                .join(
                    CreatorAccount,
                    CreatorAccount.user_id == CreatorSubscriptionTier.creator_user_id,
                )
                .where(
                    CreatorSubscriptionTier.creator_user_id == creator_user_id,
                    CreatorSubscriptionTier.active.is_(True),
                    CreatorAccount.status == CreatorStatus.active,
                    or_(
                        CreatorSubscriptionTier.available_from.is_(None),
                        CreatorSubscriptionTier.available_from <= now,
                    ),
                    or_(
                        CreatorSubscriptionTier.available_until.is_(None),
                        CreatorSubscriptionTier.available_until > now,
                    ),
                )
                .order_by(CreatorSubscriptionTier.created_at)
            )
        ).all()
    )


@router.patch("/creator/subscription-tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def patch_subscription_tier(
    tier_id: uuid.UUID,
    payload: SubscriptionTierPatch,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorSubscriptionTier:
    tier = await db.get(CreatorSubscriptionTier, tier_id)
    if tier is None or tier.creator_user_id != auth.user.id:
        raise APIError(
            404,
            "subscription_tier_not_found",
            "Subscription tier not found",
            "The tier does not exist.",
        )
    old_price = tier.price_minor
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tier, field, value)
    if (tier.price_minor is None) == (tier.external_settlement_reference is None):
        raise APIError(
            422,
            "invalid_subscription_price",
            "Invalid subscription price",
            "A tier requires exactly one credit price or external settlement reference.",
        )
    if (
        tier.available_from is not None
        and tier.available_until is not None
        and aware(tier.available_until) <= aware(tier.available_from)
    ):
        raise APIError(
            422,
            "invalid_availability_window",
            "Invalid availability window",
            "Availability end must be after its start.",
        )
    if old_price != tier.price_minor:
        add_audit_event(
            db,
            request,
            settings,
            "creator.subscription_tier_repriced",
            actor_user_id=auth.user.id,
            metadata={
                "tier_id": str(tier.id),
                "old_price_minor": old_price,
                "new_price_minor": tier.price_minor,
            },
        )
    await db.commit()
    await db.refresh(tier)
    return tier


@router.post(
    "/subscriptions",
    response_model=SubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    payload: SubscriptionPurchaseRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorSubscription:
    await rate_limit(
        request,
        bucket="creator-subscriptions",
        subject=str(auth.user.id),
        limit=settings.creator_subscription_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )
    tier = await db.get(CreatorSubscriptionTier, payload.tier_id)
    if tier is None:
        raise APIError(
            404,
            "subscription_tier_not_found",
            "Subscription tier not found",
            "The tier does not exist.",
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
    recipient = payload.recipient_user_id or auth.user.id
    subscription = await purchase_subscription(
        db,
        payment_provider=request.app.state.payment_provider,
        payer_id=auth.user.id,
        recipient_id=recipient,
        tier=tier,
        method=SettlementMethod(payload.settlement_method),
        auto_renew=payload.auto_renew,
        idempotency_key=idempotency_key,
        return_url=payload.return_url,
    )
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.get("/subscriptions", response_model=CursorPage)
async def list_subscriptions(
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    scope = f"subscriptions:{auth.user.id}"
    statement = select(CreatorSubscription).where(
        or_(
            CreatorSubscription.subscriber_user_id == auth.user.id,
            CreatorSubscription.gift_giver_user_id == auth.user.id,
        )
    )
    statement = apply_cursor(
        statement,
        CreatorSubscription.created_at,
        CreatorSubscription.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(
                    CreatorSubscription.created_at.desc(),
                    CreatorSubscription.id.desc(),
                ).limit(limit + 1)
            )
        ).all()
    )
    visible = records[:limit]
    return CursorPage(
        items=[SubscriptionResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


async def owned_subscription(
    db: AsyncSession, user_id: uuid.UUID, subscription_id: uuid.UUID
) -> CreatorSubscription:
    subscription = await db.get(CreatorSubscription, subscription_id)
    if subscription is None or (
        subscription.subscriber_user_id != user_id and subscription.gift_giver_user_id != user_id
    ):
        raise APIError(
            404,
            "subscription_not_found",
            "Subscription not found",
            "The subscription does not exist.",
        )
    return subscription


@router.post("/subscriptions/{subscription_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CreatorSubscription:
    subscription = await owned_subscription(db, auth.user.id, subscription_id)
    if subscription.status not in {
        SubscriptionStatus.active,
        SubscriptionStatus.past_due,
    }:
        raise APIError(
            409,
            "subscription_not_cancellable",
            "Subscription not cancellable",
            "Only active or past-due subscriptions can be cancelled.",
        )
    subscription.status = SubscriptionStatus.cancelled
    subscription.auto_renew = False
    subscription.cancelled_at = utcnow()
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.post("/subscriptions/{subscription_id}/renew", response_model=SubscriptionResponse)
async def renew_subscription(
    subscription_id: uuid.UUID,
    payload: SubscriptionRenewRequest,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorSubscription:
    previous = await owned_subscription(db, auth.user.id, subscription_id)
    if previous.status == SubscriptionStatus.refunded:
        raise APIError(
            409,
            "subscription_not_renewable",
            "Subscription not renewable",
            "A refunded subscription cannot be renewed.",
        )
    if previous.settlement_method == SettlementMethod.external and (
        payload.return_url is None
        or not payload.return_url.startswith(settings.web_base_url.rstrip("/") + "/")
    ):
        raise APIError(
            422,
            "external_return_url_required",
            "External return URL required",
            "External renewal requires a return URL within the configured web origin.",
        )
    tier = await db.get(CreatorSubscriptionTier, previous.tier_id)
    if tier is None:
        raise RuntimeError("subscription tier is missing")
    renewed = await purchase_subscription(
        db,
        payment_provider=request.app.state.payment_provider,
        payer_id=auth.user.id,
        recipient_id=previous.subscriber_user_id,
        tier=tier,
        method=previous.settlement_method,
        auto_renew=payload.auto_renew,
        idempotency_key=idempotency_key,
        return_url=payload.return_url,
    )
    await db.commit()
    await db.refresh(renewed)
    return renewed


@router.post("/subscriptions/{subscription_id}/refund", response_model=SubscriptionResponse)
async def refund_subscription(
    subscription_id: uuid.UUID,
    idempotency_key: IdempotencyHeader,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CreatorSubscription:
    subscription = await owned_subscription(db, auth.user.id, subscription_id)
    if (
        subscription.gift_giver_user_id is not None
        and subscription.gift_giver_user_id != auth.user.id
    ):
        raise APIError(
            403,
            "gift_refund_forbidden",
            "Gift refund forbidden",
            "Only the gift purchaser can request its refund.",
        )
    if subscription.status == SubscriptionStatus.refunded:
        return subscription
    if subscription.status not in {
        SubscriptionStatus.active,
        SubscriptionStatus.cancelled,
    }:
        raise APIError(
            409,
            "subscription_not_refundable",
            "Subscription not refundable",
            "This subscription cannot be refunded.",
        )
    if subscription.settlement_method == SettlementMethod.credits:
        if subscription.ledger_transaction_id is None:
            raise RuntimeError("credit subscription has no ledger transaction")
        await reverse_transaction(
            db,
            transaction_id=subscription.ledger_transaction_id,
            actor_user_id=auth.user.id,
            idempotency_key=idempotency_key,
            reason="creator subscription refund",
            transaction_type=LedgerTransactionType.refund,
        )
    else:
        if (
            subscription.provider_operation_id is None
            or subscription.settlement_amount_minor is None
        ):
            raise APIError(
                409,
                "external_refund_unavailable",
                "External refund unavailable",
                "The external subscription has no refundable integer settlement amount.",
            )
        result = await request.app.state.payment_provider.create_refund(
            idempotency_key=idempotency_key,
            provider_operation_id=subscription.provider_operation_id,
            amount_minor=subscription.settlement_amount_minor,
        )
        if result.status != "succeeded":
            raise APIError(
                409,
                "refund_pending_provider_confirmation",
                "Refund not confirmed",
                "The provider has not confirmed the refund.",
            )
    subscription.status = SubscriptionStatus.refunded
    subscription.refunded_at = utcnow()
    subscription.entitlement_ends_at = utcnow()
    subscription.auto_renew = False
    add_audit_event(
        db,
        request,
        settings,
        "creator.subscription_refunded",
        actor_user_id=auth.user.id,
        target_user_id=subscription.subscriber_user_id,
        metadata={
            "subscription_id": str(subscription.id),
            "amount_minor": subscription.settlement_amount_minor,
            "currency": subscription.settlement_currency,
        },
    )
    await db.commit()
    await db.refresh(subscription)
    return subscription


@router.post("/content", response_model=ContentDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_content(
    payload: ContentCreate,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentDetailResponse:
    await require_creator_account(db, auth.user.id)
    await validate_content_visibility(
        db,
        creator_user_id=auth.user.id,
        visibility=payload.visibility,
        required_tier_id=payload.required_tier_id,
        purchase_product_id=payload.purchase_product_id,
    )
    item = ContentItem(
        creator_user_id=auth.user.id,
        kind=payload.kind,
        state=ContentState.draft,
        visibility=payload.visibility,
        required_tier_id=payload.required_tier_id,
        purchase_product_id=payload.purchase_product_id,
    )
    db.add(item)
    await db.flush()
    version = ContentVersion(
        content_item_id=item.id,
        version_number=1,
        state=ContentState.draft,
        title=payload.title,
        summary=payload.summary,
        body=payload.body,
        content_metadata=payload.metadata,
        created_by_id=auth.user.id,
    )
    db.add(version)
    await db.commit()
    await db.refresh(item)
    await db.refresh(version)
    return ContentDetailResponse(
        **ContentResponse.model_validate(item).model_dump(),
        version=ContentVersionResponse.model_validate(version),
        entitled=True,
    )


@router.get("/content", response_model=CursorPage)
async def list_content(
    creator_user_id: uuid.UUID | None = None,
    state_filter: ContentState | None = Query(default=None, alias="state"),
    kind: ContentKind | None = None,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CursorPage:
    owner_id = creator_user_id or auth.user.id
    owned = owner_id == auth.user.id
    scope = f"content:{owner_id}:{state_filter}:{kind}:{owned}"
    statement = select(ContentItem).where(ContentItem.creator_user_id == owner_id)
    if owned and state_filter is not None:
        statement = statement.where(ContentItem.state == state_filter)
    elif not owned:
        statement = statement.where(ContentItem.state == ContentState.published)
    if kind is not None:
        statement = statement.where(ContentItem.kind == kind)
    statement = apply_cursor(
        statement,
        ContentItem.created_at,
        ContentItem.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(ContentItem.created_at.desc(), ContentItem.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    allowed: list[ContentItem] = []
    for item in records:
        if owned or await can_access_content(db, viewer_id=auth.user.id, item=item):
            allowed.append(item)
        if len(allowed) > limit:
            break
    visible = allowed[:limit]
    return CursorPage(
        items=[ContentResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(allowed) > limit and visible
            else None
        ),
    )


@router.get("/content/{content_id}", response_model=ContentDetailResponse)
async def get_content(
    content_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ContentDetailResponse:
    item = await db.get(ContentItem, content_id)
    if item is None:
        raise APIError(404, "content_not_found", "Content not found", "The content does not exist.")
    entitled = await can_access_content(db, viewer_id=auth.user.id, item=item)
    if not entitled:
        raise APIError(
            403,
            "content_entitlement_required",
            "Content entitlement required",
            "You do not have access to this content.",
        )
    version = (
        await db.get(ContentVersion, item.published_version_id)
        if item.published_version_id is not None
        else await latest_content_version(db, item.id)
    )
    if version is None:
        raise RuntimeError("content version is missing")
    return ContentDetailResponse(
        **ContentResponse.model_validate(item).model_dump(),
        version=ContentVersionResponse.model_validate(version),
        entitled=True,
    )


@router.patch("/content/{content_id}", response_model=ContentResponse)
async def patch_content(
    content_id: uuid.UUID,
    payload: ContentPatch,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    if item.state == ContentState.deleted:
        raise APIError(
            409, "content_deleted", "Content deleted", "Deleted content cannot be changed."
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await validate_content_visibility(
        db,
        creator_user_id=auth.user.id,
        visibility=item.visibility,
        required_tier_id=item.required_tier_id,
        purchase_product_id=item.purchase_product_id,
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.post(
    "/content/{content_id}/versions",
    response_model=ContentVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_content_version(
    content_id: uuid.UUID,
    payload: ContentVersionCreate,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentVersion:
    item = await require_owned_content(db, auth.user.id, content_id)
    latest = await latest_content_version(db, item.id)
    version = ContentVersion(
        content_item_id=item.id,
        version_number=latest.version_number + 1,
        state=ContentState.draft,
        title=payload.title,
        summary=payload.summary,
        body=payload.body,
        content_metadata=payload.metadata,
        created_by_id=auth.user.id,
    )
    db.add(version)
    item.state = ContentState.draft
    item.scheduled_at = None
    await db.commit()
    await db.refresh(version)
    return version


@router.patch(
    "/content/{content_id}/versions/{version_id}",
    response_model=ContentVersionResponse,
)
async def patch_content_version(
    content_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ContentVersionPatch,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentVersion:
    await require_owned_content(db, auth.user.id, content_id)
    version = await db.get(ContentVersion, version_id)
    if version is None or version.content_item_id != content_id:
        raise APIError(
            404,
            "content_version_not_found",
            "Content version not found",
            "The content version does not exist.",
        )
    if version.state == ContentState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Create a new draft version to make changes.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(version, "content_metadata" if field == "metadata" else field, value)
    await db.commit()
    await db.refresh(version)
    return version


async def validate_publishable(
    db: AsyncSession, item: ContentItem, version: ContentVersion
) -> None:
    if item.kind in {
        ContentKind.short_video,
        ContentKind.long_video,
        ContentKind.audio,
        ContentKind.course_attachment,
        ContentKind.downloadable,
    }:
        primary_asset = await db.scalar(
            select(ContentAsset.id).where(
                ContentAsset.content_version_id == version.id,
                ContentAsset.role == "primary",
                ContentAsset.state == AssetState.verified,
            )
        )
        if primary_asset is None:
            raise APIError(
                409,
                "content_asset_required",
                "Verified content asset required",
                "Verify a primary S3 asset before publication.",
            )
    if item.kind == ContentKind.post and not version.body:
        raise APIError(
            409,
            "content_body_required",
            "Content body required",
            "A post requires plain-text body content.",
        )


async def publish_owned_content(
    db: AsyncSession, item: ContentItem, version: ContentVersion
) -> None:
    await validate_publishable(db, item, version)
    now = utcnow()
    version.state = ContentState.published
    version.published_at = now
    item.state = ContentState.published
    item.published_version_id = version.id
    item.published_at = now
    item.scheduled_at = None


@router.post("/content/{content_id}/submit-review", response_model=ContentResponse)
async def submit_content_review(
    content_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    await require_creator_account(db, auth.user.id, active=True)
    version = await latest_content_version(db, item.id)
    if item.state != ContentState.draft or version.state != ContentState.draft:
        raise APIError(
            409,
            "content_not_draft",
            "Content not draft",
            "Only a draft content version can be submitted for review.",
        )
    await validate_publishable(db, item, version)
    item.state = ContentState.review
    version.state = ContentState.review
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/content/{content_id}/publish", response_model=ContentResponse)
async def publish_content(
    content_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    await require_creator_account(db, auth.user.id, active=True)
    version = await latest_content_version(db, item.id)
    if version.state == ContentState.published and item.published_version_id == version.id:
        return item
    await publish_owned_content(db, item, version)
    add_audit_event(
        db,
        request,
        settings,
        "creator.content_published",
        actor_user_id=auth.user.id,
        metadata={"content_id": str(item.id), "version_id": str(version.id)},
    )
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/content/{content_id}/schedule", response_model=ContentResponse)
async def schedule_content(
    content_id: uuid.UUID,
    payload: ScheduleRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    if aware(payload.scheduled_at) <= utcnow() + timedelta(seconds=5):
        raise APIError(
            422,
            "invalid_schedule_time",
            "Invalid schedule time",
            "Schedule publication at least five seconds in the future.",
        )
    version = await latest_content_version(db, item.id)
    await validate_publishable(db, item, version)
    item.state = ContentState.scheduled
    item.scheduled_at = aware(payload.scheduled_at)
    version.state = ContentState.scheduled
    dispatcher = request.app.state.content_publish_dispatcher
    await dispatcher(item.id, aware(payload.scheduled_at))
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/content/{content_id}/unpublish", response_model=ContentResponse)
async def unpublish_content(
    content_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    if item.state != ContentState.published:
        raise APIError(
            409,
            "content_not_published",
            "Content not published",
            "Only published content can be unlisted.",
        )
    item.state = ContentState.unlisted
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/content/{content_id}/archive", response_model=ContentResponse)
async def archive_content(
    content_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    if item.state == ContentState.deleted:
        raise APIError(
            409, "content_deleted", "Content deleted", "Deleted content cannot be archived."
        )
    item.state = ContentState.archived
    item.scheduled_at = None
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/content/{content_id}", response_model=ContentResponse)
async def delete_content(
    content_id: uuid.UUID,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentItem:
    item = await require_owned_content(db, auth.user.id, content_id)
    item.state = ContentState.deleted
    item.scheduled_at = None
    await db.commit()
    await db.refresh(item)
    return item


@router.post(
    "/content/{content_id}/versions/{version_id}/assets/uploads",
    response_model=AssetUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_content_asset_upload(
    content_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: AssetUploadRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> AssetUploadResponse:
    await require_owned_content(db, auth.user.id, content_id)
    version = await db.get(ContentVersion, version_id)
    if version is None or version.content_item_id != content_id:
        raise APIError(
            404,
            "content_version_not_found",
            "Content version not found",
            "The content version does not exist.",
        )
    if version.state == ContentState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published version assets cannot be changed.",
        )
    asset_id = uuid.uuid4()
    object_key = f"content/{auth.user.id}/{content_id}/{version_id}/{asset_id}"
    storage: S3ObjectStorage = request.app.state.object_storage
    upload = await storage.presign_put(
        object_key=object_key,
        content_type=payload.content_type,
        sha256_hex=payload.sha256,
    )
    asset = ContentAsset(
        id=asset_id,
        content_version_id=version_id,
        role=payload.role,
        object_key=object_key,
        content_type=payload.content_type,
        byte_size=payload.byte_size,
        sha256=payload.sha256,
        state=AssetState.pending,
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


@router.post("/content/{content_id}/assets/{asset_id}/verify", response_model=AssetResponse)
async def verify_content_asset(
    content_id: uuid.UUID,
    asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentAsset:
    await require_owned_content(db, auth.user.id, content_id)
    asset = await db.get(ContentAsset, asset_id)
    version = await db.get(ContentVersion, asset.content_version_id) if asset else None
    if asset is None or version is None or version.content_item_id != content_id:
        raise APIError(
            404, "content_asset_not_found", "Content asset not found", "The asset does not exist."
        )
    if version.state == ContentState.published:
        raise APIError(
            409,
            "published_version_immutable",
            "Published version immutable",
            "Published version assets cannot be changed.",
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
    "/content/{content_id}/versions/{version_id}/processing-jobs",
    response_model=ProcessingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_processing_job(
    content_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ProcessingRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> ContentProcessingJob:
    await require_owned_content(db, auth.user.id, content_id)
    version = await db.get(ContentVersion, version_id)
    if version is None or version.content_item_id != content_id:
        raise APIError(
            404,
            "content_version_not_found",
            "Content version not found",
            "The version does not exist.",
        )
    assets = list(
        (
            await db.scalars(
                select(ContentAsset).where(
                    ContentAsset.content_version_id == version.id,
                    ContentAsset.state == AssetState.verified,
                )
            )
        ).all()
    )
    processor = request.app.state.content_processor
    job = ContentProcessingJob(
        content_version_id=version.id,
        processor=processor.name,
        operation=payload.operation,
        state=ProcessingState.pending,
    )
    db.add(job)
    await db.flush()
    try:
        provider_job_id = await processor.create_job(
            operation=payload.operation,
            content_version_id=version.id,
            asset_keys=[asset.object_key for asset in assets],
        )
    except APIError:
        job.state = ProcessingState.unavailable
        job.failure_code = "content_processor_unavailable"
        await db.commit()
        raise
    job.provider_job_id = provider_job_id
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/creator/analytics", response_model=CreatorAnalyticsResponse)
@router.get("/creator/dashboard", response_model=CreatorAnalyticsResponse)
async def creator_analytics(
    auth: AuthContext = Depends(require_permission("creator:analytics")),
    db: AsyncSession = Depends(get_session),
) -> CreatorAnalyticsResponse:
    await require_creator_account(db, auth.user.id)
    content_count = int(
        await db.scalar(
            select(func.count())
            .select_from(ContentItem)
            .where(
                ContentItem.creator_user_id == auth.user.id,
                ContentItem.state != ContentState.deleted,
            )
        )
        or 0
    )
    published_count = int(
        await db.scalar(
            select(func.count())
            .select_from(ContentItem)
            .where(
                ContentItem.creator_user_id == auth.user.id,
                ContentItem.state.in_([ContentState.published, ContentState.unlisted]),
            )
        )
        or 0
    )
    follower_count = int(
        await db.scalar(
            select(func.count()).select_from(Follow).where(Follow.followed_id == auth.user.id)
        )
        or 0
    )
    active_subscriptions = int(
        await db.scalar(
            select(func.count())
            .select_from(CreatorSubscription)
            .where(
                CreatorSubscription.creator_user_id == auth.user.id,
                CreatorSubscription.status.in_(
                    [SubscriptionStatus.active, SubscriptionStatus.cancelled]
                ),
                CreatorSubscription.entitlement_ends_at > utcnow(),
            )
        )
        or 0
    )
    gift_count, gift_revenue = (
        await db.execute(
            select(
                func.count(),
                func.coalesce(func.sum(GiftSend.creator_share_minor), 0),
            ).where(
                GiftSend.recipient_user_id == auth.user.id,
                GiftSend.status == GiftSendStatus.delivered,
            )
        )
    ).one()
    earnings = await user_account(db, auth.user.id, LedgerAccountType.creator_earnings)
    subscription_revenue = int(
        await db.scalar(
            select(func.coalesce(func.sum(LedgerEntry.credit_minor), 0))
            .select_from(LedgerEntry)
            .join(
                CreatorSubscription,
                CreatorSubscription.ledger_transaction_id == LedgerEntry.transaction_id,
            )
            .where(
                LedgerEntry.account_id == earnings.id,
                CreatorSubscription.creator_user_id == auth.user.id,
                CreatorSubscription.status != SubscriptionStatus.refunded,
            )
        )
        or 0
    )
    marketplace_revenue = int(
        await db.scalar(
            select(func.coalesce(func.sum(OrderLine.seller_proceeds_minor), 0))
            .join(Order, Order.id == OrderLine.order_id)
            .where(
                OrderLine.seller_user_id == auth.user.id,
                Order.state.in_([OrderState.paid, OrderState.fulfilling, OrderState.completed]),
            )
        )
        or 0
    )
    total_earnings = await account_balance(db, earnings)
    await db.commit()
    return CreatorAnalyticsResponse(
        content_count=content_count,
        published_content_count=published_count,
        follower_count=follower_count,
        active_subscription_count=active_subscriptions,
        gift_count=int(gift_count or 0),
        gift_revenue_minor=int(gift_revenue or 0),
        subscription_revenue_minor=subscription_revenue,
        marketplace_revenue_minor=marketplace_revenue,
        total_creator_earnings_minor=total_earnings,
    )
