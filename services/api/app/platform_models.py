from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class CreatorStatus(enum.StrEnum):
    onboarding = "onboarding"
    pending_review = "pending_review"
    active = "active"
    suspended = "suspended"
    closed = "closed"


class ContentKind(enum.StrEnum):
    short_video = "short_video"
    long_video = "long_video"
    post = "post"
    audio = "audio"
    course_attachment = "course_attachment"
    downloadable = "downloadable"


class ContentState(enum.StrEnum):
    draft = "draft"
    review = "review"
    scheduled = "scheduled"
    published = "published"
    unlisted = "unlisted"
    archived = "archived"
    deleted = "deleted"


class ContentVisibility(enum.StrEnum):
    public = "public"
    followers = "followers"
    subscribers = "subscribers"
    tier = "tier"
    purchase = "purchase"


class AssetRole(enum.StrEnum):
    primary = "primary"
    thumbnail = "thumbnail"
    caption = "caption"
    chapter = "chapter"
    attachment = "attachment"


class AssetState(enum.StrEnum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class ProcessingState(enum.StrEnum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    unavailable = "unavailable"


class SubscriptionStatus(enum.StrEnum):
    pending = "pending"
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    expired = "expired"
    refunded = "refunded"


class SettlementMethod(enum.StrEnum):
    free = "free"
    credits = "credits"
    external = "external"


class CreatorAccount(Base):
    __tablename__ = "creator_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True
    )
    public_slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    channel_name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[CreatorStatus] = mapped_column(
        Enum(CreatorStatus, native_enum=False, length=24),
        default=CreatorStatus.onboarding,
        index=True,
    )
    content_monetization_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    subscriptions_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    marketplace_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    payout_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[ContentKind] = mapped_column(
        Enum(ContentKind, native_enum=False, length=24), index=True
    )
    state: Mapped[ContentState] = mapped_column(
        Enum(ContentState, native_enum=False, length=16),
        default=ContentState.draft,
        index=True,
    )
    visibility: Mapped[ContentVisibility] = mapped_column(
        Enum(ContentVisibility, native_enum=False, length=16),
        default=ContentVisibility.public,
        index=True,
    )
    required_tier_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("creator_subscription_tiers.id", ondelete="RESTRICT"), index=True
    )
    purchase_product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"), index=True
    )
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_versions.id", ondelete="RESTRICT"), unique=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ContentVersion(Base):
    __tablename__ = "content_versions"
    __table_args__ = (
        UniqueConstraint("content_item_id", "version_number", name="uq_content_versions_number"),
        CheckConstraint("version_number > 0", name="ck_content_versions_positive_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    content_item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content_items.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    state: Mapped[ContentState] = mapped_column(
        Enum(ContentState, native_enum=False, length=16),
        default=ContentState.draft,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str | None] = mapped_column(String(1000))
    body: Mapped[str | None] = mapped_column(Text)
    content_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ContentAsset(Base):
    __tablename__ = "content_assets"
    __table_args__ = (
        CheckConstraint("byte_size > 0", name="ck_content_assets_positive_size"),
        UniqueConstraint("object_key", name="uq_content_assets_object_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    content_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content_versions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[AssetRole] = mapped_column(
        Enum(AssetRole, native_enum=False, length=16), index=True
    )
    object_key: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[str] = mapped_column(String(64))
    state: Mapped[AssetState] = mapped_column(
        Enum(AssetState, native_enum=False, length=16), default=AssetState.pending, index=True
    )
    rights_declaration: Mapped[str] = mapped_column(String(500))
    license_reference: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ContentProcessingJob(Base):
    __tablename__ = "content_processing_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    content_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content_versions.id", ondelete="CASCADE"), index=True
    )
    processor: Mapped[str] = mapped_column(String(64))
    operation: Mapped[str] = mapped_column(String(64))
    state: Mapped[ProcessingState] = mapped_column(
        Enum(ProcessingState, native_enum=False, length=16), index=True
    )
    provider_job_id: Mapped[str | None] = mapped_column(String(255))
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CreatorSubscriptionTier(Base):
    __tablename__ = "creator_subscription_tiers"
    __table_args__ = (
        CheckConstraint(
            "price_minor IS NULL OR price_minor > 0",
            name="ck_creator_subscription_tiers_positive_price",
        ),
        CheckConstraint("duration_days > 0", name="ck_creator_subscription_tiers_duration"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(1000))
    price_minor: Mapped[int | None] = mapped_column(BigInteger)
    external_settlement_reference: Mapped[str | None] = mapped_column(String(255))
    duration_days: Mapped[int] = mapped_column(Integer, default=30)
    benefits: Mapped[list[str]] = mapped_column(JSON, default=list)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CreatorSubscription(Base):
    __tablename__ = "creator_subscriptions"
    __table_args__ = (
        UniqueConstraint(
            "payer_user_id",
            "idempotency_key",
            name="uq_creator_subscriptions_payer_idempotency",
        ),
        UniqueConstraint(
            "subscriber_user_id",
            "tier_id",
            "entitlement_starts_at",
            name="uq_creator_subscription_window",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    payer_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    subscriber_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    creator_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    tier_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("creator_subscription_tiers.id", ondelete="RESTRICT"), index=True
    )
    gift_giver_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, native_enum=False, length=16), index=True
    )
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16)
    )
    entitlement_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    entitlement_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    ledger_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    provider: Mapped[str | None] = mapped_column(String(64))
    provider_operation_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    settlement_amount_minor: Mapped[int | None] = mapped_column(BigInteger)
    settlement_currency: Mapped[str | None] = mapped_column(String(16))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class ProductKind(enum.StrEnum):
    digital = "digital"
    service = "service"


class ProductState(enum.StrEnum):
    draft = "draft"
    review = "review"
    published = "published"
    retired = "retired"


class OrderState(enum.StrEnum):
    pending_payment = "pending_payment"
    paid = "paid"
    fulfilling = "fulfilling"
    completed = "completed"
    cancelled = "cancelled"
    refunded = "refunded"
    disputed = "disputed"


class EntitlementState(enum.StrEnum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class BookingState(enum.StrEnum):
    requested = "requested"
    accepted = "accepted"
    declined = "declined"
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class MarketplaceStore(Base):
    __tablename__ = "marketplace_stores"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), unique=True, index=True
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(1000))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    platform_fee_bps: Mapped[int] = mapped_column(Integer, default=1000)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MarketplaceProduct(Base):
    __tablename__ = "marketplace_products"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_stores.id", ondelete="RESTRICT"), index=True
    )
    slug: Mapped[str] = mapped_column(String(80), index=True)
    kind: Mapped[ProductKind] = mapped_column(
        Enum(ProductKind, native_enum=False, length=16), index=True
    )
    category: Mapped[str] = mapped_column(String(64), index=True)
    state: Mapped[ProductState] = mapped_column(
        Enum(ProductState, native_enum=False, length=16),
        default=ProductState.draft,
        index=True,
    )
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("marketplace_product_versions.id", ondelete="RESTRICT"), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    __table_args__ = (
        UniqueConstraint("store_id", "slug", name="uq_marketplace_products_store_slug"),
    )


class ProductVersion(Base):
    __tablename__ = "marketplace_product_versions"
    __table_args__ = (
        UniqueConstraint("product_id", "version_number", name="uq_product_versions_number"),
        CheckConstraint("version_number > 0", name="ck_product_versions_positive_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    state: Mapped[ProductState] = mapped_column(
        Enum(ProductState, native_enum=False, length=16),
        default=ProductState.draft,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    fulfillment_terms: Mapped[str] = mapped_column(String(2000))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProductAsset(Base):
    __tablename__ = "marketplace_product_assets"
    __table_args__ = (
        CheckConstraint("byte_size > 0", name="ck_product_assets_positive_size"),
        UniqueConstraint("object_key", name="uq_product_assets_object_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_versions.id", ondelete="CASCADE"), index=True
    )
    object_key: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[str] = mapped_column(String(64))
    state: Mapped[AssetState] = mapped_column(
        Enum(AssetState, native_enum=False, length=16), default=AssetState.pending, index=True
    )
    download_limit: Mapped[int | None] = mapped_column(Integer)
    entitlement_days: Mapped[int | None] = mapped_column(Integer)
    rights_declaration: Mapped[str] = mapped_column(String(500))
    license_reference: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProductPrice(Base):
    __tablename__ = "marketplace_product_prices"
    __table_args__ = (
        CheckConstraint("amount_minor > 0", name="ck_product_prices_positive_amount"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="CASCADE"), index=True
    )
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16), index=True
    )
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(16))
    external_reference: Mapped[str | None] = mapped_column(String(255))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProductInventory(Base):
    __tablename__ = "marketplace_product_inventory"
    __table_args__ = (
        CheckConstraint(
            "quantity_available IS NULL OR quantity_available >= 0",
            name="ck_product_inventory_available",
        ),
        CheckConstraint("quantity_sold >= 0", name="ck_product_inventory_sold"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="CASCADE"), primary_key=True
    )
    quantity_available: Mapped[int | None] = mapped_column(Integer)
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class ProductCollection(Base):
    __tablename__ = "marketplace_product_collections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    store_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_stores.id", ondelete="CASCADE"), index=True
    )
    slug: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(1000))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        UniqueConstraint("store_id", "slug", name="uq_product_collections_store_slug"),
    )


class ProductCollectionItem(Base):
    __tablename__ = "marketplace_product_collection_items"

    collection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_collections.id", ondelete="CASCADE"), primary_key=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)


class Cart(Base):
    __tablename__ = "marketplace_carts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CartItem(Base):
    __tablename__ = "marketplace_cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_items_product"),
        CheckConstraint("quantity > 0", name="ck_cart_items_positive_quantity"),
        CheckConstraint("unit_price_minor > 0", name="ck_cart_items_positive_price"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cart_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_carts.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"), index=True
    )
    product_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_versions.id", ondelete="RESTRICT")
    )
    price_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_prices.id", ondelete="RESTRICT")
    )
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(16))
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16)
    )
    title_snapshot: Mapped[str] = mapped_column(String(200))
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Order(Base):
    __tablename__ = "marketplace_orders"
    __table_args__ = (
        UniqueConstraint("buyer_user_id", "idempotency_key", name="uq_orders_buyer_idempotency"),
        CheckConstraint(
            "subtotal_minor >= 0 AND fee_minor >= 0 AND total_minor >= 0",
            name="ck_orders_nonnegative_totals",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    buyer_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    buyer_display_name: Mapped[str] = mapped_column(String(120))
    state: Mapped[OrderState] = mapped_column(
        Enum(OrderState, native_enum=False, length=24), index=True
    )
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16)
    )
    currency: Mapped[str] = mapped_column(String(16))
    subtotal_minor: Mapped[int] = mapped_column(BigInteger)
    fee_minor: Mapped[int] = mapped_column(BigInteger)
    total_minor: Mapped[int] = mapped_column(BigInteger)
    seller_proceeds_minor: Mapped[int] = mapped_column(BigInteger)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    ledger_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    provider: Mapped[str | None] = mapped_column(String(64))
    provider_operation_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    safe_provider_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OrderLine(Base):
    __tablename__ = "marketplace_order_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_lines_positive_quantity"),
        CheckConstraint(
            "unit_price_minor > 0 AND line_total_minor > 0",
            name="ck_order_lines_positive_totals",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_orders.id", ondelete="RESTRICT"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"), index=True
    )
    product_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_versions.id", ondelete="RESTRICT")
    )
    seller_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    product_kind: Mapped[ProductKind] = mapped_column(
        Enum(ProductKind, native_enum=False, length=16)
    )
    title_snapshot: Mapped[str] = mapped_column(String(200))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_minor: Mapped[int] = mapped_column(BigInteger)
    line_total_minor: Mapped[int] = mapped_column(BigInteger)
    fee_minor: Mapped[int] = mapped_column(BigInteger)
    seller_proceeds_minor: Mapped[int] = mapped_column(BigInteger)


class ProductEntitlement(Base):
    __tablename__ = "marketplace_product_entitlements"
    __table_args__ = (
        UniqueConstraint("user_id", "order_line_id", name="uq_product_entitlements_line"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"), index=True
    )
    product_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_product_versions.id", ondelete="RESTRICT")
    )
    order_line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_order_lines.id", ondelete="RESTRICT")
    )
    state: Mapped[EntitlementState] = mapped_column(
        Enum(EntitlementState, native_enum=False, length=16), index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    download_limit: Mapped[int | None] = mapped_column(Integer)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ServiceBookingRequest(Base):
    __tablename__ = "marketplace_service_bookings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_order_lines.id", ondelete="RESTRICT"), unique=True
    )
    buyer_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    seller_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[BookingState] = mapped_column(
        Enum(BookingState, native_enum=False, length=16),
        default=BookingState.requested,
        index=True,
    )
    requested_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ServiceBookingMessage(Base):
    __tablename__ = "marketplace_service_booking_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_service_bookings.id", ondelete="CASCADE"), index=True
    )
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    body: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class ProductReview(Base):
    __tablename__ = "marketplace_product_reviews"
    __table_args__ = (
        UniqueConstraint("order_line_id", name="uq_product_reviews_order_line"),
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_product_reviews_rating"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT"), index=True
    )
    order_line_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("marketplace_order_lines.id", ondelete="RESTRICT")
    )
    reviewer_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    rating: Mapped[int] = mapped_column(Integer)
    body: Mapped[str | None] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CourseState(enum.StrEnum):
    draft = "draft"
    review = "review"
    published = "published"
    retired = "retired"


class LessonKind(enum.StrEnum):
    video = "video"
    audio = "audio"
    text = "text"
    download = "download"
    live = "live"


class EnrollmentStatus(enum.StrEnum):
    pending = "pending"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    refunded = "refunded"


class ProgressState(enum.StrEnum):
    not_started = "not_started"
    started = "started"
    completed = "completed"


class AttemptState(enum.StrEnum):
    in_progress = "in_progress"
    passed = "passed"
    failed = "failed"


class Course(Base):
    __tablename__ = "learning_courses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    state: Mapped[CourseState] = mapped_column(
        Enum(CourseState, native_enum=False, length=16), default=CourseState.draft, index=True
    )
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16),
        default=SettlementMethod.free,
        index=True,
    )
    price_minor: Mapped[int | None] = mapped_column(BigInteger)
    external_settlement_reference: Mapped[str | None] = mapped_column(String(255))
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="RESTRICT")
    )
    required_subscription_tier_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("creator_subscription_tiers.id", ondelete="RESTRICT")
    )
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("learning_course_versions.id", ondelete="RESTRICT"), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CourseVersion(Base):
    __tablename__ = "learning_course_versions"
    __table_args__ = (
        UniqueConstraint("course_id", "version_number", name="uq_course_versions_number"),
        CheckConstraint("version_number > 0", name="ck_course_versions_positive_number"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_courses.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    state: Mapped[CourseState] = mapped_column(
        Enum(CourseState, native_enum=False, length=16), default=CourseState.draft, index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    learning_objectives: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CourseModule(Base):
    __tablename__ = "learning_modules"
    __table_args__ = (
        UniqueConstraint("course_version_id", "position", name="uq_learning_modules_position"),
        CheckConstraint("position >= 0", name="ck_learning_modules_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_course_versions.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000))
    position: Mapped[int] = mapped_column(Integer)


class Lesson(Base):
    __tablename__ = "learning_lessons"
    __table_args__ = (
        UniqueConstraint("module_id", "position", name="uq_learning_lessons_position"),
        CheckConstraint("position >= 0", name="ck_learning_lessons_position"),
        CheckConstraint(
            "required_seconds >= 0 AND required_heartbeat_seconds >= 0",
            name="ck_learning_lessons_requirements",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    module_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_modules.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[LessonKind] = mapped_column(
        Enum(LessonKind, native_enum=False, length=16), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str | None] = mapped_column(Text)
    content_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_items.id", ondelete="RESTRICT")
    )
    position: Mapped[int] = mapped_column(Integer)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    required_seconds: Mapped[int] = mapped_column(Integer, default=0)
    required_heartbeat_seconds: Mapped[int] = mapped_column(Integer, default=0)
    prerequisite_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("learning_lessons.id", ondelete="RESTRICT")
    )


class Enrollment(Base):
    __tablename__ = "learning_enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_learning_enrollments_user_course"),
        UniqueConstraint(
            "user_id",
            "idempotency_key",
            name="uq_learning_enrollments_user_idempotency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_courses.id", ondelete="RESTRICT"), index=True
    )
    course_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_course_versions.id", ondelete="RESTRICT")
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus, native_enum=False, length=16), index=True
    )
    settlement_method: Mapped[SettlementMethod] = mapped_column(
        Enum(SettlementMethod, native_enum=False, length=16)
    )
    idempotency_key: Mapped[str] = mapped_column(String(128))
    ledger_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("marketplace_orders.id", ondelete="RESTRICT")
    )
    provider: Mapped[str | None] = mapped_column(String(64))
    provider_operation_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LessonProgress(Base):
    __tablename__ = "learning_lesson_progress"
    __table_args__ = (
        UniqueConstraint("enrollment_id", "lesson_id", name="uq_lesson_progress_enrollment"),
        CheckConstraint(
            "heartbeat_seconds >= 0 AND last_position_seconds >= 0",
            name="ck_lesson_progress_nonnegative",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_enrollments.id", ondelete="CASCADE"), index=True
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_lessons.id", ondelete="RESTRICT"), index=True
    )
    state: Mapped[ProgressState] = mapped_column(
        Enum(ProgressState, native_enum=False, length=16),
        default=ProgressState.not_started,
        index=True,
    )
    heartbeat_seconds: Mapped[int] = mapped_column(Integer, default=0)
    last_position_seconds: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Quiz(Base):
    __tablename__ = "learning_quizzes"
    __table_args__ = (
        CheckConstraint(
            "pass_threshold_percent >= 0 AND pass_threshold_percent <= 100",
            name="ck_learning_quizzes_pass_threshold",
        ),
        CheckConstraint("attempt_limit > 0", name="ck_learning_quizzes_attempt_limit"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_course_versions.id", ondelete="CASCADE"), index=True
    )
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("learning_lessons.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer, default=0)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    pass_threshold_percent: Mapped[int] = mapped_column(Integer)
    attempt_limit: Mapped[int] = mapped_column(Integer)


class QuizQuestion(Base):
    __tablename__ = "learning_quiz_questions"
    __table_args__ = (UniqueConstraint("quiz_id", "position", name="uq_quiz_questions_position"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quizzes.id", ondelete="CASCADE"), index=True
    )
    prompt: Mapped[str] = mapped_column(String(2000))
    position: Mapped[int] = mapped_column(Integer)


class QuizOption(Base):
    __tablename__ = "learning_quiz_options"
    __table_args__ = (UniqueConstraint("question_id", "position", name="uq_quiz_options_position"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quiz_questions.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(1000))
    position: Mapped[int] = mapped_column(Integer)
    is_correct: Mapped[bool] = mapped_column(Boolean)


class QuizAttempt(Base):
    __tablename__ = "learning_quiz_attempts"
    __table_args__ = (
        UniqueConstraint("enrollment_id", "quiz_id", "attempt_number", name="uq_quiz_attempt_no"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_enrollments.id", ondelete="CASCADE"), index=True
    )
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quizzes.id", ondelete="RESTRICT"), index=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer)
    state: Mapped[AttemptState] = mapped_column(
        Enum(AttemptState, native_enum=False, length=16),
        default=AttemptState.in_progress,
        index=True,
    )
    score_percent: Mapped[int | None] = mapped_column(Integer)
    correct_count: Mapped[int | None] = mapped_column(Integer)
    question_count: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class QuizAnswer(Base):
    __tablename__ = "learning_quiz_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_quiz_answers_question"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quiz_attempts.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quiz_questions.id", ondelete="RESTRICT")
    )
    selected_option_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_quiz_options.id", ondelete="RESTRICT")
    )
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Certificate(Base):
    __tablename__ = "learning_certificates"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("learning_enrollments.id", ondelete="RESTRICT"), unique=True
    )
    verification_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    recipient_display_name: Mapped[str] = mapped_column(String(120))
    course_title: Mapped[str] = mapped_column(String(200))
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pdf_object_key: Mapped[str | None] = mapped_column(String(512))


def _published_version_was_persisted(target: Any, state_attr: str = "state") -> bool:
    state = inspect(target).attrs[state_attr].history
    return (not state.deleted and getattr(target, state_attr).value == "published") or any(
        getattr(value, "value", value) == "published" for value in state.deleted
    )


@event.listens_for(ContentVersion, "before_update")
@event.listens_for(ContentVersion, "before_delete")
@event.listens_for(ProductVersion, "before_update")
@event.listens_for(ProductVersion, "before_delete")
@event.listens_for(CourseVersion, "before_update")
@event.listens_for(CourseVersion, "before_delete")
def reject_published_version_mutation(_: object, __: object, target: Any) -> None:
    if _published_version_was_persisted(target):
        raise ValueError("published versions are immutable")


Index("ix_content_items_creator_created", ContentItem.creator_user_id, ContentItem.created_at)
Index("ix_marketplace_orders_buyer_created", Order.buyer_user_id, Order.created_at)
Index("ix_marketplace_reviews_product_created", ProductReview.product_id, ProductReview.created_at)
Index("ix_learning_enrollments_user_enrolled", Enrollment.user_id, Enrollment.enrolled_at)
