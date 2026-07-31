from __future__ import annotations

import secrets
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_system_audit_event
from app.errors import APIError
from app.gift_models import GiftSend, GiftSendStatus
from app.ledger_models import (
    LedgerAccountType,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionType,
)
from app.ledger_schemas import LedgerPosting
from app.ledger_service import (
    post_transaction,
    reverse_transaction,
    system_account,
    user_account,
    validate_safe_metadata,
)
from app.models import Profile, User, UserStatus
from app.payments import PaymentProvider
from app.platform_models import (
    AssetState,
    AttemptState,
    BookingState,
    Cart,
    CartItem,
    Certificate,
    ContentAsset,
    ContentItem,
    ContentKind,
    ContentState,
    ContentVersion,
    ContentVisibility,
    Course,
    CourseModule,
    CourseState,
    CourseVersion,
    CreatorAccount,
    CreatorStatus,
    CreatorSubscription,
    CreatorSubscriptionTier,
    Enrollment,
    EnrollmentStatus,
    EntitlementState,
    Lesson,
    LessonProgress,
    MarketplaceProduct,
    MarketplaceStore,
    Order,
    OrderLine,
    OrderState,
    ProductAsset,
    ProductEntitlement,
    ProductInventory,
    ProductKind,
    ProductPrice,
    ProductState,
    ProductVersion,
    ProgressState,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizOption,
    QuizQuestion,
    ServiceBookingMessage,
    ServiceBookingRequest,
    SettlementMethod,
    SubscriptionStatus,
)
from app.security import utcnow
from app.social_models import Follow

PLATFORM_FEE_BPS = 1000


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


class ContentProcessor(Protocol):
    name: str

    async def create_job(
        self,
        *,
        operation: str,
        content_version_id: uuid.UUID,
        asset_keys: list[str],
    ) -> str: ...


class UnconfiguredContentProcessor:
    name = "unconfigured"

    async def create_job(
        self,
        *,
        operation: str,
        content_version_id: uuid.UUID,
        asset_keys: list[str],
    ) -> str:
        raise APIError(
            503,
            "content_processor_unavailable",
            "Content processor unavailable",
            "No real content processor is configured for this deployment.",
        )


class CertificateRenderer(Protocol):
    name: str

    async def render_pdf(self, *, certificate_id: uuid.UUID) -> bytes: ...


class UnconfiguredCertificateRenderer:
    name = "unconfigured"

    async def render_pdf(self, *, certificate_id: uuid.UUID) -> bytes:
        raise APIError(
            503,
            "certificate_renderer_unavailable",
            "Certificate renderer unavailable",
            "No real certificate PDF renderer is configured for this deployment.",
        )


def validate_checkout_result(result: Any) -> None:
    if (
        not result.provider_operation_id
        or result.status not in {"pending", "requires_action", "processing", "succeeded"}
        or result.settlement_amount_minor <= 0
    ):
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The provider returned an invalid checkout operation.",
        )


async def require_creator_account(
    db: AsyncSession, user_id: uuid.UUID, *, active: bool = False
) -> CreatorAccount:
    account = await db.get(CreatorAccount, user_id)
    if account is None or (active and account.status != CreatorStatus.active):
        raise APIError(
            409 if account is None else 403,
            "creator_account_required" if account is None else "creator_account_inactive",
            "Creator account required" if account is None else "Creator account inactive",
            (
                "Complete creator onboarding before using this capability."
                if account is None
                else "The creator account is not active."
            ),
        )
    return account


async def require_owned_content(
    db: AsyncSession, user_id: uuid.UUID, content_id: uuid.UUID
) -> ContentItem:
    item = await db.get(ContentItem, content_id)
    if item is None or item.creator_user_id != user_id:
        raise APIError(404, "content_not_found", "Content not found", "The content does not exist.")
    return item


async def latest_content_version(db: AsyncSession, content_id: uuid.UUID) -> ContentVersion:
    version = await db.scalar(
        select(ContentVersion)
        .where(ContentVersion.content_item_id == content_id)
        .order_by(ContentVersion.version_number.desc())
        .limit(1)
    )
    if version is None:
        raise APIError(
            404,
            "content_version_not_found",
            "Content version not found",
            "The content has no version.",
        )
    return version


async def has_active_subscription(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    creator_user_id: uuid.UUID,
    tier_id: uuid.UUID | None = None,
) -> bool:
    now = utcnow()
    filters = [
        CreatorSubscription.subscriber_user_id == user_id,
        CreatorSubscription.creator_user_id == creator_user_id,
        CreatorSubscription.status.in_([SubscriptionStatus.active, SubscriptionStatus.cancelled]),
        CreatorSubscription.entitlement_starts_at <= now,
        CreatorSubscription.entitlement_ends_at > now,
    ]
    if tier_id is not None:
        filters.append(CreatorSubscription.tier_id == tier_id)
    return await db.scalar(select(CreatorSubscription.id).where(*filters).limit(1)) is not None


async def has_product_entitlement(
    db: AsyncSession, *, user_id: uuid.UUID, product_id: uuid.UUID
) -> bool:
    now = utcnow()
    return (
        await db.scalar(
            select(ProductEntitlement.id)
            .where(
                ProductEntitlement.user_id == user_id,
                ProductEntitlement.product_id == product_id,
                ProductEntitlement.state == EntitlementState.active,
                or_(
                    ProductEntitlement.expires_at.is_(None),
                    ProductEntitlement.expires_at > now,
                ),
            )
            .limit(1)
        )
        is not None
    )


async def can_access_content(db: AsyncSession, *, viewer_id: uuid.UUID, item: ContentItem) -> bool:
    if item.creator_user_id == viewer_id:
        return True
    if item.state not in {ContentState.published, ContentState.unlisted}:
        return False
    if item.visibility == ContentVisibility.public:
        return True
    if item.visibility == ContentVisibility.followers:
        return (
            await db.scalar(
                select(Follow.id).where(
                    Follow.follower_id == viewer_id,
                    Follow.followed_id == item.creator_user_id,
                )
            )
            is not None
        )
    if item.visibility == ContentVisibility.subscribers:
        return await has_active_subscription(
            db, user_id=viewer_id, creator_user_id=item.creator_user_id
        )
    if item.visibility == ContentVisibility.tier and item.required_tier_id is not None:
        return await has_active_subscription(
            db,
            user_id=viewer_id,
            creator_user_id=item.creator_user_id,
            tier_id=item.required_tier_id,
        )
    if item.visibility == ContentVisibility.purchase and item.purchase_product_id is not None:
        return await has_product_entitlement(
            db, user_id=viewer_id, product_id=item.purchase_product_id
        )
    return False


async def purchase_subscription(
    db: AsyncSession,
    *,
    payment_provider: PaymentProvider,
    payer_id: uuid.UUID,
    recipient_id: uuid.UUID,
    tier: CreatorSubscriptionTier,
    method: SettlementMethod,
    auto_renew: bool,
    idempotency_key: str,
    return_url: str | None,
) -> CreatorSubscription:
    await db.scalar(select(User.id).where(User.id == payer_id).with_for_update())
    existing_subscription = await db.scalar(
        select(CreatorSubscription).where(
            CreatorSubscription.payer_user_id == payer_id,
            CreatorSubscription.idempotency_key == idempotency_key,
        )
    )
    if existing_subscription is not None:
        if (
            existing_subscription.subscriber_user_id != recipient_id
            or existing_subscription.tier_id != tier.id
            or existing_subscription.settlement_method != method
        ):
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This key was used for a different subscription purchase.",
            )
        return existing_subscription
    if recipient_id == tier.creator_user_id:
        raise APIError(
            422,
            "self_subscription_forbidden",
            "Invalid subscription",
            "A creator cannot subscribe to their own tier.",
        )
    recipient = await db.get(User, recipient_id)
    if recipient is None or recipient.status != UserStatus.active:
        raise APIError(
            404,
            "subscription_recipient_not_found",
            "Subscription recipient not found",
            "The subscription recipient is unavailable.",
        )
    creator = await require_creator_account(db, tier.creator_user_id, active=True)
    if not creator.subscriptions_enabled or not tier.active:
        raise APIError(
            409,
            "subscription_tier_unavailable",
            "Subscription tier unavailable",
            "This subscription tier is not currently available.",
        )
    now = utcnow()
    if (tier.available_from is not None and aware(tier.available_from) > now) or (
        tier.available_until is not None and aware(tier.available_until) <= now
    ):
        raise APIError(
            409,
            "subscription_tier_unavailable",
            "Subscription tier unavailable",
            "This subscription tier is not currently available.",
        )
    existing_transaction = await db.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.idempotency_actor_scope == str(payer_id),
            LedgerTransaction.idempotency_scope == f"creator-subscription:{tier.id}:{recipient_id}",
            LedgerTransaction.idempotency_key == idempotency_key,
        )
    )
    if existing_transaction is not None:
        existing = await db.scalar(
            select(CreatorSubscription).where(
                CreatorSubscription.ledger_transaction_id == existing_transaction.id
            )
        )
        if existing is None:
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This key was used for a different operation.",
            )
        return existing
    last_end = await db.scalar(
        select(func.max(CreatorSubscription.entitlement_ends_at)).where(
            CreatorSubscription.subscriber_user_id == recipient_id,
            CreatorSubscription.tier_id == tier.id,
            CreatorSubscription.status.in_(
                [SubscriptionStatus.active, SubscriptionStatus.cancelled]
            ),
        )
    )
    starts_at = max(now, aware(last_end)) if last_end is not None else now
    ends_at = starts_at + timedelta(days=tier.duration_days)
    gift_giver_id = payer_id if payer_id != recipient_id else None
    subscription = CreatorSubscription(
        subscriber_user_id=recipient_id,
        creator_user_id=tier.creator_user_id,
        tier_id=tier.id,
        gift_giver_user_id=gift_giver_id,
        status=SubscriptionStatus.pending,
        settlement_method=method,
        entitlement_starts_at=starts_at,
        entitlement_ends_at=ends_at,
        auto_renew=auto_renew,
    )
    if method == SettlementMethod.credits:
        if tier.price_minor is None:
            raise APIError(
                422,
                "subscription_settlement_mismatch",
                "Settlement method unavailable",
                "This tier is not priced in platform credits.",
            )
        wallet = await user_account(db, payer_id, LedgerAccountType.user_wallet)
        earnings = await user_account(db, tier.creator_user_id, LedgerAccountType.creator_earnings)
        revenue = await system_account(db, "system:platform_revenue")
        fee = tier.price_minor * PLATFORM_FEE_BPS // 10_000
        proceeds = tier.price_minor - fee
        postings = [
            LedgerPosting(
                account_id=wallet.id, side=LedgerSide.debit, amount_minor=tier.price_minor
            ),
            LedgerPosting(account_id=earnings.id, side=LedgerSide.credit, amount_minor=proceeds),
        ]
        if fee:
            postings.append(
                LedgerPosting(account_id=revenue.id, side=LedgerSide.credit, amount_minor=fee)
            )
        transaction, _ = await post_transaction(
            db,
            transaction_type=LedgerTransactionType.subscription_purchase,
            actor_user_id=payer_id,
            idempotency_scope=f"creator-subscription:{tier.id}:{recipient_id}",
            idempotency_key=idempotency_key,
            postings=postings,
            metadata={
                "tier_id": str(tier.id),
                "recipient_user_id": str(recipient_id),
                "creator_user_id": str(tier.creator_user_id),
                "platform_fee_minor": fee,
            },
        )
        subscription.ledger_transaction_id = transaction.id
        subscription.settlement_amount_minor = tier.price_minor
        subscription.settlement_currency = "SYLORA_CREDIT"
        subscription.status = SubscriptionStatus.active
    else:
        if tier.external_settlement_reference is None or return_url is None:
            raise APIError(
                422,
                "subscription_settlement_mismatch",
                "Settlement method unavailable",
                "This tier is not configured for external settlement.",
            )
        create_checkout = getattr(payment_provider, "create_checkout_intent", None)
        if create_checkout is None:
            raise APIError(
                503,
                "payment_provider_unavailable",
                "Payment provider unavailable",
                "The configured provider does not support checkout.",
            )
        result = await create_checkout(
            idempotency_key=idempotency_key,
            user_reference=str(payer_id),
            amount_minor=0,
            settlement_currency="EXTERNAL",
            return_url=return_url,
            line_references=[tier.external_settlement_reference],
        )
        validate_checkout_result(result)
        subscription.provider = payment_provider.name
        subscription.provider_operation_id = result.provider_operation_id
        subscription.settlement_amount_minor = result.settlement_amount_minor
        subscription.settlement_currency = "EXTERNAL"
    subscription.payer_user_id = payer_id
    subscription.idempotency_key = idempotency_key
    db.add(subscription)
    await db.flush()
    return subscription


async def cart_for_user(db: AsyncSession, user_id: uuid.UUID) -> Cart:
    cart = await db.scalar(select(Cart).where(Cart.user_id == user_id))
    if cart is None:
        cart = Cart(user_id=user_id)
        db.add(cart)
        await db.flush()
    return cart


async def cart_items(db: AsyncSession, cart_id: uuid.UUID) -> list[CartItem]:
    return list(
        (
            await db.scalars(
                select(CartItem)
                .where(CartItem.cart_id == cart_id)
                .order_by(CartItem.added_at, CartItem.id)
            )
        ).all()
    )


async def available_product(
    db: AsyncSession,
    product_id: uuid.UUID,
    method: SettlementMethod,
    *,
    lock: bool = False,
) -> tuple[MarketplaceProduct, ProductVersion, ProductPrice, ProductInventory]:
    statement = select(MarketplaceProduct).where(
        MarketplaceProduct.id == product_id,
        MarketplaceProduct.state == ProductState.published,
    )
    if lock:
        statement = statement.with_for_update()
    product = await db.scalar(statement)
    if product is None or product.published_version_id is None:
        raise APIError(404, "product_not_found", "Product not found", "The product is unavailable.")
    version = await db.get(ProductVersion, product.published_version_id)
    now = utcnow()
    price = await db.scalar(
        select(ProductPrice)
        .where(
            ProductPrice.product_id == product.id,
            ProductPrice.settlement_method == method,
            ProductPrice.active.is_(True),
            or_(ProductPrice.available_from.is_(None), ProductPrice.available_from <= now),
            or_(ProductPrice.available_until.is_(None), ProductPrice.available_until > now),
        )
        .order_by(ProductPrice.created_at.desc())
        .limit(1)
    )
    inventory = await db.get(ProductInventory, product.id)
    if version is None or price is None or inventory is None or not inventory.active:
        raise APIError(
            409, "product_unavailable", "Product unavailable", "The product cannot be purchased."
        )
    if (inventory.available_from is not None and aware(inventory.available_from) > now) or (
        inventory.available_until is not None and aware(inventory.available_until) <= now
    ):
        raise APIError(
            409, "product_unavailable", "Product unavailable", "The product cannot be purchased."
        )
    return product, version, price, inventory


async def add_cart_item(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    method: SettlementMethod,
) -> CartItem:
    product, version, price, inventory = await available_product(db, product_id, method)
    if product.kind == ProductKind.service and quantity != 1:
        raise APIError(
            422,
            "service_quantity_invalid",
            "Invalid service quantity",
            "Service bookings must be purchased one at a time.",
        )
    if inventory.quantity_available is not None and quantity > inventory.quantity_available:
        raise APIError(
            409,
            "product_inventory_insufficient",
            "Insufficient inventory",
            "The requested quantity is unavailable.",
        )
    cart = await cart_for_user(db, user_id)
    existing = await db.scalar(
        select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
    )
    new_quantity = quantity + (existing.quantity if existing else 0)
    if product.kind == ProductKind.service and new_quantity != 1:
        raise APIError(
            422,
            "service_quantity_invalid",
            "Invalid service quantity",
            "Service bookings must be purchased one at a time.",
        )
    if new_quantity > 100 or (
        inventory.quantity_available is not None and new_quantity > inventory.quantity_available
    ):
        raise APIError(
            409,
            "product_inventory_insufficient",
            "Insufficient inventory",
            "The requested quantity is unavailable.",
        )
    if existing is not None:
        if existing.settlement_method != method:
            raise APIError(
                409,
                "cart_settlement_conflict",
                "Cart settlement conflict",
                "Remove the existing item before changing settlement method.",
            )
        existing.quantity = new_quantity
        return existing
    item = CartItem(
        cart_id=cart.id,
        product_id=product.id,
        product_version_id=version.id,
        price_id=price.id,
        quantity=quantity,
        unit_price_minor=price.amount_minor,
        currency=price.currency,
        settlement_method=method,
        title_snapshot=version.title,
    )
    db.add(item)
    await db.flush()
    return item


async def _grant_fulfillment(db: AsyncSession, order: Order) -> None:
    lines = list((await db.scalars(select(OrderLine).where(OrderLine.order_id == order.id))).all())
    has_service = False
    for line in lines:
        if line.product_kind == ProductKind.digital:
            assets = list(
                (
                    await db.scalars(
                        select(ProductAsset).where(
                            ProductAsset.product_version_id == line.product_version_id,
                            ProductAsset.state == AssetState.verified,
                        )
                    )
                ).all()
            )
            limits = [asset.download_limit for asset in assets if asset.download_limit is not None]
            days = [
                asset.entitlement_days for asset in assets if asset.entitlement_days is not None
            ]
            db.add(
                ProductEntitlement(
                    user_id=order.buyer_user_id,
                    product_id=line.product_id,
                    product_version_id=line.product_version_id,
                    order_line_id=line.id,
                    state=EntitlementState.active,
                    expires_at=(utcnow() + timedelta(days=min(days))) if days else None,
                    download_limit=min(limits) if limits else None,
                )
            )
        else:
            has_service = True
            db.add(
                ServiceBookingRequest(
                    order_line_id=line.id,
                    buyer_user_id=order.buyer_user_id,
                    seller_user_id=line.seller_user_id,
                    status=BookingState.requested,
                )
            )
    order.state = OrderState.fulfilling if has_service else OrderState.completed
    order.completed_at = None if has_service else utcnow()


async def checkout_cart(
    db: AsyncSession,
    *,
    payment_provider: PaymentProvider,
    buyer: User,
    method: SettlementMethod,
    idempotency_key: str,
    return_url: str | None,
) -> Order:
    await db.scalar(select(User.id).where(User.id == buyer.id).with_for_update())
    existing = await db.scalar(
        select(Order).where(
            Order.buyer_user_id == buyer.id, Order.idempotency_key == idempotency_key
        )
    )
    if existing is not None:
        if existing.settlement_method != method:
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This key was used for a different checkout.",
            )
        return existing
    cart = await cart_for_user(db, buyer.id)
    items = await cart_items(db, cart.id)
    if not items:
        raise APIError(409, "cart_empty", "Cart is empty", "Add a product before checkout.")
    if any(item.settlement_method != method for item in items):
        raise APIError(
            409,
            "cart_settlement_conflict",
            "Cart settlement conflict",
            "Every cart item must use the selected settlement method.",
        )
    currencies = {item.currency for item in items}
    if len(currencies) != 1:
        raise APIError(
            409,
            "cart_currency_conflict",
            "Cart currency conflict",
            "Every cart item must use the same currency.",
        )
    line_data: list[
        tuple[CartItem, MarketplaceProduct, MarketplaceStore, ProductInventory, int, int]
    ] = []
    subtotal = 0
    fee_total = 0
    for item in items:
        product, version, _, inventory = await available_product(
            db, item.product_id, method, lock=True
        )
        if version.id != item.product_version_id:
            # A cart is a price snapshot, but retired versions cannot be newly charged.
            raise APIError(
                409,
                "cart_product_changed",
                "Product changed",
                "The product version changed; remove and add it again.",
            )
        if product.kind == ProductKind.service and item.quantity != 1:
            raise APIError(
                422,
                "service_quantity_invalid",
                "Invalid service quantity",
                "Service bookings must be purchased one at a time.",
            )
        if (
            inventory.quantity_available is not None
            and item.quantity > inventory.quantity_available
        ):
            raise APIError(
                409,
                "product_inventory_insufficient",
                "Insufficient inventory",
                "A cart item no longer has enough inventory.",
            )
        store = await db.get(MarketplaceStore, product.store_id)
        if store is None or not store.active:
            raise APIError(
                409, "store_unavailable", "Store unavailable", "A seller store is unavailable."
            )
        line_total = item.unit_price_minor * item.quantity
        line_fee = line_total * store.platform_fee_bps // 10_000
        subtotal += line_total
        fee_total += line_fee
        line_data.append((item, product, store, inventory, line_total, line_fee))
    external_result: Any | None = None
    if method == SettlementMethod.external:
        create_checkout = getattr(payment_provider, "create_checkout_intent", None)
        if create_checkout is None or return_url is None:
            raise APIError(
                503,
                "payment_provider_unavailable",
                "Payment provider unavailable",
                "No configured payment provider supports marketplace checkout.",
            )
        references: list[str] = []
        for item, _, _, _, _, _ in line_data:
            external_price = await db.get(ProductPrice, item.price_id)
            if external_price is None or external_price.external_reference is None:
                raise APIError(
                    409,
                    "external_price_unavailable",
                    "External price unavailable",
                    "A cart item lacks a configured external settlement reference.",
                )
            references.extend([external_price.external_reference] * item.quantity)
        external_result = await create_checkout(
            idempotency_key=idempotency_key,
            user_reference=str(buyer.id),
            amount_minor=subtotal,
            settlement_currency=next(iter(currencies)),
            return_url=return_url,
            line_references=references,
        )
        validate_checkout_result(external_result)
    profile = await db.get(Profile, buyer.id)
    order = Order(
        buyer_user_id=buyer.id,
        buyer_display_name=profile.display_name if profile else "Buyer",
        state=OrderState.pending_payment,
        settlement_method=method,
        currency=next(iter(currencies)),
        subtotal_minor=subtotal,
        fee_minor=fee_total,
        total_minor=subtotal,
        seller_proceeds_minor=subtotal - fee_total,
        idempotency_key=idempotency_key,
        provider=payment_provider.name if external_result is not None else None,
        provider_operation_id=(
            external_result.provider_operation_id if external_result is not None else None
        ),
        safe_provider_data=(
            validate_safe_metadata(external_result.client_data)
            if external_result is not None
            else {}
        ),
    )
    db.add(order)
    await db.flush()
    earnings_by_seller: dict[uuid.UUID, int] = defaultdict(int)
    for item, product, store, inventory, line_total, line_fee in line_data:
        db.add(
            OrderLine(
                order_id=order.id,
                product_id=product.id,
                product_version_id=item.product_version_id,
                seller_user_id=store.owner_user_id,
                product_kind=product.kind,
                title_snapshot=item.title_snapshot,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                line_total_minor=line_total,
                fee_minor=line_fee,
                seller_proceeds_minor=line_total - line_fee,
            )
        )
        earnings_by_seller[store.owner_user_id] += line_total - line_fee
        inventory.quantity_sold += item.quantity
        if inventory.quantity_available is not None:
            inventory.quantity_available -= item.quantity
    await db.flush()
    if method == SettlementMethod.credits:
        wallet = await user_account(db, buyer.id, LedgerAccountType.user_wallet)
        postings = [
            LedgerPosting(account_id=wallet.id, side=LedgerSide.debit, amount_minor=subtotal)
        ]
        for seller_id, proceeds in earnings_by_seller.items():
            earnings = await user_account(db, seller_id, LedgerAccountType.creator_earnings)
            postings.append(
                LedgerPosting(account_id=earnings.id, side=LedgerSide.credit, amount_minor=proceeds)
            )
        if fee_total:
            revenue = await system_account(db, "system:platform_revenue")
            postings.append(
                LedgerPosting(account_id=revenue.id, side=LedgerSide.credit, amount_minor=fee_total)
            )
        transaction, _ = await post_transaction(
            db,
            transaction_type=LedgerTransactionType.marketplace_purchase,
            actor_user_id=buyer.id,
            idempotency_scope="marketplace-checkout",
            idempotency_key=idempotency_key,
            postings=postings,
            metadata={
                "order_id": str(order.id),
                "platform_fee_minor": fee_total,
                "line_count": len(line_data),
            },
        )
        order.ledger_transaction_id = transaction.id
        order.state = OrderState.paid
        order.paid_at = utcnow()
        await _grant_fulfillment(db, order)
    await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
    await db.flush()
    return order


async def settle_external_commerce(
    db: AsyncSession,
    *,
    provider_name: str,
    operation_id: str,
    operation_status: str,
) -> bool:
    if operation_status not in {
        "pending",
        "requires_action",
        "processing",
        "succeeded",
        "failed",
        "cancelled",
    }:
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The verified provider event contains an unsupported payment state.",
        )
    order = await db.scalar(
        select(Order)
        .where(
            Order.provider == provider_name,
            Order.provider_operation_id == operation_id,
        )
        .with_for_update()
    )
    if order is not None:
        if order.state != OrderState.pending_payment:
            return True
        if operation_status == "succeeded":
            order.state = OrderState.paid
            order.paid_at = utcnow()
            await _grant_fulfillment(db, order)
        elif operation_status in {"failed", "cancelled"}:
            order.state = OrderState.cancelled
            lines = list(
                (await db.scalars(select(OrderLine).where(OrderLine.order_id == order.id))).all()
            )
            for line in lines:
                inventory = await db.get(ProductInventory, line.product_id)
                if inventory is not None:
                    inventory.quantity_sold -= line.quantity
                    if inventory.quantity_available is not None:
                        inventory.quantity_available += line.quantity
        return True
    subscription = await db.scalar(
        select(CreatorSubscription)
        .where(
            CreatorSubscription.provider == provider_name,
            CreatorSubscription.provider_operation_id == operation_id,
        )
        .with_for_update()
    )
    if subscription is not None:
        if subscription.status != SubscriptionStatus.pending:
            return True
        if operation_status == "succeeded":
            subscription.status = SubscriptionStatus.active
        elif operation_status in {"failed", "cancelled"}:
            subscription.status = SubscriptionStatus.expired
            subscription.entitlement_ends_at = utcnow()
        return True
    enrollment = await db.scalar(
        select(Enrollment)
        .where(
            Enrollment.provider == provider_name,
            Enrollment.provider_operation_id == operation_id,
        )
        .with_for_update()
    )
    if enrollment is not None:
        if enrollment.status != EnrollmentStatus.pending:
            return True
        if operation_status == "succeeded":
            enrollment.status = EnrollmentStatus.active
        elif operation_status in {"failed", "cancelled"}:
            enrollment.status = EnrollmentStatus.cancelled
        return True
    return False


async def refund_order(
    db: AsyncSession,
    *,
    order: Order,
    actor_user_id: uuid.UUID,
    idempotency_key: str,
    reason: str,
    payment_provider: PaymentProvider,
) -> Order:
    if order.state == OrderState.refunded:
        return order
    if order.state not in {
        OrderState.paid,
        OrderState.fulfilling,
        OrderState.completed,
    }:
        raise APIError(
            409,
            "order_not_refundable",
            "Order not refundable",
            "Only paid, fulfilling, or completed orders can be refunded.",
        )
    if order.settlement_method == SettlementMethod.credits:
        if order.ledger_transaction_id is None:
            raise RuntimeError("paid credit order has no ledger transaction")
        await reverse_transaction(
            db,
            transaction_id=order.ledger_transaction_id,
            actor_user_id=actor_user_id,
            idempotency_key=idempotency_key,
            reason=reason,
            transaction_type=LedgerTransactionType.marketplace_refund,
        )
    else:
        if order.provider_operation_id is None:
            raise RuntimeError("external order has no provider operation")
        result = await payment_provider.create_refund(
            idempotency_key=idempotency_key,
            provider_operation_id=order.provider_operation_id,
            amount_minor=order.total_minor,
        )
        if result.status != "succeeded":
            raise APIError(
                409,
                "refund_pending_provider_confirmation",
                "Refund not confirmed",
                "The provider has not confirmed the refund.",
            )
    await db.execute(
        update(ProductEntitlement)
        .where(
            ProductEntitlement.order_line_id.in_(
                select(OrderLine.id).where(OrderLine.order_id == order.id)
            ),
            ProductEntitlement.state == EntitlementState.active,
        )
        .values(state=EntitlementState.revoked, revoked_at=utcnow())
    )
    await db.execute(
        update(ServiceBookingRequest)
        .where(
            ServiceBookingRequest.order_line_id.in_(
                select(OrderLine.id).where(OrderLine.order_id == order.id)
            ),
            ServiceBookingRequest.status.not_in([BookingState.completed, BookingState.cancelled]),
        )
        .values(status=BookingState.cancelled)
    )
    order.state = OrderState.refunded
    order.refunded_at = utcnow()
    return order


async def require_enrollment(
    db: AsyncSession, user_id: uuid.UUID, enrollment_id: uuid.UUID
) -> Enrollment:
    enrollment = await db.get(Enrollment, enrollment_id)
    if enrollment is None or enrollment.user_id != user_id:
        raise APIError(
            404,
            "enrollment_not_found",
            "Enrollment not found",
            "The enrollment does not exist.",
        )
    if enrollment.status not in {EnrollmentStatus.active, EnrollmentStatus.completed}:
        raise APIError(
            409,
            "enrollment_inactive",
            "Enrollment inactive",
            "The enrollment is not active.",
        )
    return enrollment


async def course_for_lesson(db: AsyncSession, lesson: Lesson) -> Course:
    module = await db.get(CourseModule, lesson.module_id)
    version = await db.get(CourseVersion, module.course_version_id) if module else None
    course = await db.get(Course, version.course_id) if version else None
    if course is None:
        raise RuntimeError("lesson course relationship is invalid")
    return course


async def ensure_lesson_in_enrollment(
    db: AsyncSession, enrollment: Enrollment, lesson: Lesson
) -> None:
    module = await db.get(CourseModule, lesson.module_id)
    if module is None or module.course_version_id != enrollment.course_version_id:
        raise APIError(
            404, "lesson_not_found", "Lesson not found", "The lesson is not in this enrollment."
        )
    if lesson.prerequisite_lesson_id is not None:
        prerequisite = await db.scalar(
            select(LessonProgress).where(
                LessonProgress.enrollment_id == enrollment.id,
                LessonProgress.lesson_id == lesson.prerequisite_lesson_id,
                LessonProgress.state == ProgressState.completed,
            )
        )
        if prerequisite is None:
            raise APIError(
                409,
                "lesson_prerequisite_incomplete",
                "Lesson prerequisite incomplete",
                "Complete the prerequisite lesson first.",
            )


async def progress_for(
    db: AsyncSession, *, enrollment: Enrollment, lesson: Lesson
) -> LessonProgress:
    progress = await db.scalar(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    if progress is None:
        progress = LessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson.id,
            state=ProgressState.not_started,
        )
        db.add(progress)
        await db.flush()
    return progress


async def derive_course_completion(db: AsyncSession, enrollment: Enrollment) -> bool:
    required_lessons = list(
        (
            await db.scalars(
                select(Lesson.id)
                .join(CourseModule, CourseModule.id == Lesson.module_id)
                .where(
                    CourseModule.course_version_id == enrollment.course_version_id,
                    Lesson.required.is_(True),
                )
            )
        ).all()
    )
    completed_lessons = (
        int(
            await db.scalar(
                select(func.count())
                .select_from(LessonProgress)
                .where(
                    LessonProgress.enrollment_id == enrollment.id,
                    LessonProgress.lesson_id.in_(required_lessons),
                    LessonProgress.state == ProgressState.completed,
                )
            )
            or 0
        )
        if required_lessons
        else 0
    )
    required_quizzes = list(
        (
            await db.scalars(
                select(Quiz.id).where(
                    Quiz.course_version_id == enrollment.course_version_id,
                    Quiz.required.is_(True),
                )
            )
        ).all()
    )
    passed_quizzes = (
        int(
            await db.scalar(
                select(func.count(func.distinct(QuizAttempt.quiz_id))).where(
                    QuizAttempt.enrollment_id == enrollment.id,
                    QuizAttempt.quiz_id.in_(required_quizzes),
                    QuizAttempt.state == AttemptState.passed,
                )
            )
            or 0
        )
        if required_quizzes
        else 0
    )
    complete = completed_lessons == len(required_lessons) and passed_quizzes == len(
        required_quizzes
    )
    if complete and enrollment.status != EnrollmentStatus.completed:
        enrollment.status = EnrollmentStatus.completed
        enrollment.completed_at = utcnow()
    return complete


async def enroll_course(
    db: AsyncSession,
    *,
    payment_provider: PaymentProvider,
    user_id: uuid.UUID,
    course: Course,
    idempotency_key: str,
    return_url: str | None,
) -> Enrollment:
    await db.scalar(select(User.id).where(User.id == user_id).with_for_update())
    idempotent = await db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.idempotency_key == idempotency_key,
        )
    )
    if idempotent is not None:
        if idempotent.course_id != course.id:
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This key was used for a different course enrollment.",
            )
        return idempotent
    if course.state != CourseState.published or course.published_version_id is None:
        raise APIError(404, "course_not_found", "Course not found", "The course is not available.")
    existing = await db.scalar(
        select(Enrollment).where(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
    )
    if existing is not None:
        return existing
    if course.product_id is not None and not await has_product_entitlement(
        db, user_id=user_id, product_id=course.product_id
    ):
        raise APIError(
            403,
            "course_purchase_required",
            "Course purchase required",
            "Purchase the configured marketplace product before enrolling.",
        )
    if course.required_subscription_tier_id is not None and not await has_active_subscription(
        db,
        user_id=user_id,
        creator_user_id=course.author_user_id,
        tier_id=course.required_subscription_tier_id,
    ):
        raise APIError(
            403,
            "course_subscription_required",
            "Course subscription required",
            "An active subscription tier is required for this course.",
        )
    enrollment = Enrollment(
        user_id=user_id,
        course_id=course.id,
        course_version_id=course.published_version_id,
        status=EnrollmentStatus.active,
        settlement_method=course.settlement_method,
        idempotency_key=idempotency_key,
    )
    # Product/subscription-backed courses do not charge a second time.
    if course.product_id is None and course.required_subscription_tier_id is None:
        if course.settlement_method == SettlementMethod.credits:
            if course.price_minor is None:
                raise RuntimeError("credit course has no price")
            wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
            earnings = await user_account(
                db, course.author_user_id, LedgerAccountType.creator_earnings
            )
            revenue = await system_account(db, "system:platform_revenue")
            fee = course.price_minor * PLATFORM_FEE_BPS // 10_000
            postings = [
                LedgerPosting(
                    account_id=wallet.id,
                    side=LedgerSide.debit,
                    amount_minor=course.price_minor,
                ),
                LedgerPosting(
                    account_id=earnings.id,
                    side=LedgerSide.credit,
                    amount_minor=course.price_minor - fee,
                ),
            ]
            if fee:
                postings.append(
                    LedgerPosting(account_id=revenue.id, side=LedgerSide.credit, amount_minor=fee)
                )
            transaction, _ = await post_transaction(
                db,
                transaction_type=LedgerTransactionType.course_enrollment,
                actor_user_id=user_id,
                idempotency_scope=f"course-enrollment:{course.id}",
                idempotency_key=idempotency_key,
                postings=postings,
                metadata={"course_id": str(course.id), "platform_fee_minor": fee},
            )
            enrollment.ledger_transaction_id = transaction.id
        elif course.settlement_method == SettlementMethod.external:
            create_checkout = getattr(payment_provider, "create_checkout_intent", None)
            if (
                create_checkout is None
                or return_url is None
                or course.external_settlement_reference is None
            ):
                raise APIError(
                    503,
                    "payment_provider_unavailable",
                    "Payment provider unavailable",
                    "No configured payment provider supports course checkout.",
                )
            result = await create_checkout(
                idempotency_key=idempotency_key,
                user_reference=str(user_id),
                amount_minor=0,
                settlement_currency="EXTERNAL",
                return_url=return_url,
                line_references=[course.external_settlement_reference],
            )
            validate_checkout_result(result)
            enrollment.status = EnrollmentStatus.pending
            enrollment.provider = payment_provider.name
            enrollment.provider_operation_id = result.provider_operation_id
    db.add(enrollment)
    await db.flush()
    return enrollment


async def finalize_quiz_attempt(db: AsyncSession, attempt: QuizAttempt) -> QuizAttempt:
    if attempt.state != AttemptState.in_progress:
        return attempt
    quiz = await db.get(Quiz, attempt.quiz_id)
    if quiz is None:
        raise RuntimeError("quiz attempt references a missing quiz")
    questions = list(
        (await db.scalars(select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id))).all()
    )
    if not questions:
        raise APIError(
            409,
            "quiz_has_no_questions",
            "Quiz has no questions",
            "This quiz cannot be finalized.",
        )
    answers = list(
        (await db.scalars(select(QuizAnswer).where(QuizAnswer.attempt_id == attempt.id))).all()
    )
    if len(answers) != len(questions):
        raise APIError(
            409,
            "quiz_answers_incomplete",
            "Quiz answers incomplete",
            "Answer every question before finalizing the attempt.",
        )
    correct = 0
    for answer in answers:
        option = await db.get(QuizOption, answer.selected_option_id)
        is_correct = bool(
            option is not None and option.question_id == answer.question_id and option.is_correct
        )
        answer.is_correct = is_correct
        correct += int(is_correct)
    score = correct * 100 // len(questions)
    attempt.correct_count = correct
    attempt.question_count = len(questions)
    attempt.score_percent = score
    attempt.state = (
        AttemptState.passed if score >= quiz.pass_threshold_percent else AttemptState.failed
    )
    attempt.finalized_at = utcnow()
    await db.flush()
    enrollment = await db.get(Enrollment, attempt.enrollment_id)
    if enrollment is not None:
        await derive_course_completion(db, enrollment)
    return attempt


async def issue_certificate(db: AsyncSession, enrollment: Enrollment) -> Certificate:
    existing = await db.scalar(
        select(Certificate).where(Certificate.enrollment_id == enrollment.id)
    )
    if existing is not None:
        return existing
    if enrollment.status != EnrollmentStatus.completed or not await derive_course_completion(
        db, enrollment
    ):
        raise APIError(
            409,
            "course_incomplete",
            "Course incomplete",
            "Complete all required lessons and pass all required quizzes first.",
        )
    profile = await db.get(Profile, enrollment.user_id)
    version = await db.get(CourseVersion, enrollment.course_version_id)
    if version is None:
        raise RuntimeError("enrollment version is missing")
    certificate = Certificate(
        enrollment_id=enrollment.id,
        verification_code=secrets.token_urlsafe(24),
        recipient_display_name=profile.display_name if profile else "Learner",
        course_title=version.title,
    )
    db.add(certificate)
    await db.flush()
    return certificate


async def publish_scheduled_content(db: AsyncSession, content_id: uuid.UUID) -> ContentItem:
    item = await db.scalar(
        select(ContentItem).where(ContentItem.id == content_id).with_for_update()
    )
    if item is None:
        raise APIError(404, "content_not_found", "Content not found", "The content does not exist.")
    if item.state == ContentState.published:
        return item
    if (
        item.state != ContentState.scheduled
        or item.scheduled_at is None
        or aware(item.scheduled_at) > utcnow()
    ):
        raise APIError(
            409,
            "content_not_due",
            "Content not due",
            "The scheduled content is not due for publication.",
        )
    version = await latest_content_version(db, item.id)
    if item.kind in {
        ContentKind.short_video,
        ContentKind.long_video,
        ContentKind.audio,
        ContentKind.course_attachment,
        ContentKind.downloadable,
    }:
        verified = await db.scalar(
            select(ContentAsset.id).where(
                ContentAsset.content_version_id == version.id,
                ContentAsset.role == "primary",
                ContentAsset.state == AssetState.verified,
            )
        )
        if verified is None:
            raise APIError(
                409,
                "content_asset_required",
                "Verified content asset required",
                "The scheduled version has no verified primary asset.",
            )
    now = utcnow()
    version.state = ContentState.published
    version.published_at = now
    item.state = ContentState.published
    item.published_version_id = version.id
    item.published_at = now
    item.scheduled_at = None
    add_system_audit_event(
        db,
        "creator.content_published",
        actor_user_id=item.creator_user_id,
        target_user_id=item.creator_user_id,
        metadata={
            "content_id": str(item.id),
            "version_id": str(version.id),
            "source": "scheduled_celery_task",
        },
        operation_id=item.id,
    )
    await db.commit()
    return item


async def expire_due_subscriptions(db: AsyncSession) -> int:
    due = int(
        await db.scalar(
            select(func.count())
            .select_from(CreatorSubscription)
            .where(
                CreatorSubscription.status.in_(
                    [SubscriptionStatus.active, SubscriptionStatus.past_due]
                ),
                CreatorSubscription.entitlement_ends_at <= utcnow(),
            )
        )
        or 0
    )
    if due:
        await db.execute(
            update(CreatorSubscription)
            .where(
                CreatorSubscription.status.in_(
                    [SubscriptionStatus.active, SubscriptionStatus.past_due]
                ),
                CreatorSubscription.entitlement_ends_at <= utcnow(),
            )
            .values(status=SubscriptionStatus.expired, auto_renew=False)
        )
        await db.commit()
    return due


async def scrub_platform_user_records(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(Order)
        .where(Order.buyer_user_id == user_id)
        .values(buyer_display_name="Deleted buyer")
    )
    await db.execute(
        update(Certificate)
        .where(
            Certificate.enrollment_id.in_(
                select(Enrollment.id).where(Enrollment.user_id == user_id)
            )
        )
        .values(recipient_display_name="Deleted learner")
    )
    await db.execute(delete(Cart).where(Cart.user_id == user_id))
    await db.execute(
        delete(ContentItem).where(
            ContentItem.creator_user_id == user_id,
            ContentItem.state.in_(
                [ContentState.draft, ContentState.review, ContentState.scheduled]
            ),
        )
    )
    await db.execute(
        delete(Course).where(
            Course.author_user_id == user_id,
            Course.state.in_([CourseState.draft, CourseState.review]),
        )
    )
    store = await db.scalar(
        select(MarketplaceStore).where(MarketplaceStore.owner_user_id == user_id)
    )
    if store is not None:
        await db.execute(
            delete(MarketplaceProduct).where(
                MarketplaceProduct.store_id == store.id,
                MarketplaceProduct.state.in_([ProductState.draft, ProductState.review]),
            )
        )
        store.name = "Deleted seller"
        store.description = None
        store.active = False
    await db.execute(
        update(CreatorAccount)
        .where(CreatorAccount.user_id == user_id)
        .values(
            public_slug=f"deleted-{user_id}",
            channel_name="Deleted creator",
            description=None,
            status=CreatorStatus.closed,
            content_monetization_enabled=False,
            subscriptions_enabled=False,
            marketplace_enabled=False,
            payout_eligible=False,
        )
    )
    await db.execute(
        delete(ServiceBookingMessage).where(ServiceBookingMessage.sender_user_id == user_id)
    )
    # Gift financial rows remain immutable; creator/buyer-facing identity is
    # resolved through the already-pseudonymized User/Profile records.
    await db.scalar(
        select(func.count())
        .select_from(GiftSend)
        .where(
            or_(
                GiftSend.sender_user_id == user_id,
                GiftSend.recipient_user_id == user_id,
            ),
            GiftSend.status.in_(
                [
                    GiftSendStatus.purchased,
                    GiftSendStatus.queued,
                    GiftSendStatus.delivered,
                    GiftSendStatus.refunded,
                ]
            ),
        )
    )
