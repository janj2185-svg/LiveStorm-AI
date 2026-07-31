from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
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
    select,
)
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class GiftTier(enum.StrEnum):
    simple = "simple"
    rare = "rare"
    epic = "epic"
    legendary = "legendary"
    mythical = "mythical"
    exclusive = "exclusive"
    seasonal = "seasonal"
    holiday = "holiday"
    collectible = "collectible"
    limited = "limited"
    vip = "vip"
    ultra_premium = "ultra_premium"


class GiftLifecycle(enum.StrEnum):
    draft = "draft"
    review = "review"
    published = "published"
    retired = "retired"


class GiftAssetState(enum.StrEnum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"


class GiftAssetPlatform(enum.StrEnum):
    universal = "universal"
    web = "web"
    flutter = "flutter"
    unity = "unity"
    unreal = "unreal"
    source = "source"


class GiftQualityTier(enum.StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    source = "source"


class AcquisitionSource(enum.StrEnum):
    purchased = "purchased"
    event = "event"
    level = "level"
    achievement = "achievement"
    subscription = "subscription"
    admin_grant = "admin_grant"


class GiftSendStatus(enum.StrEnum):
    purchased = "purchased"
    queued = "queued"
    delivered = "delivered"
    failed = "failed"
    refunded = "refunded"
    chargeback = "chargeback"


class DeliveryStatus(enum.StrEnum):
    queued = "queued"
    delivered = "delivered"
    failed = "failed"


class GiftCategory(Base):
    __tablename__ = "gift_categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(500))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GiftDefinition(Base):
    __tablename__ = "gift_definitions"
    __table_args__ = (
        CheckConstraint("price_minor > 0", name="ck_gift_definitions_positive_price"),
        CheckConstraint(
            "creator_revenue_share_bps >= 0 AND creator_revenue_share_bps <= 10000",
            name="ck_gift_definitions_revenue_share",
        ),
        CheckConstraint(
            "supply_cap IS NULL OR supply_cap > 0", name="ck_gift_definitions_supply_cap"
        ),
        CheckConstraint(
            "per_user_limit IS NULL OR per_user_limit > 0",
            name="ck_gift_definitions_user_limit",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_categories.id", ondelete="RESTRICT"), index=True
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    price_minor: Mapped[int] = mapped_column(BigInteger)
    creator_revenue_share_bps: Mapped[int] = mapped_column(Integer)
    tier: Mapped[GiftTier] = mapped_column(Enum(GiftTier, native_enum=False, length=24), index=True)
    state: Mapped[GiftLifecycle] = mapped_column(
        Enum(GiftLifecycle, native_enum=False, length=16),
        default=GiftLifecycle.draft,
        index=True,
    )
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    supply_cap: Mapped[int | None] = mapped_column(Integer)
    sold_count: Mapped[int] = mapped_column(Integer, default=0)
    per_user_limit: Mapped[int | None] = mapped_column(Integer)
    required_subscription_tier: Mapped[str | None] = mapped_column(String(32))
    minimum_level: Mapped[int | None] = mapped_column(Integer)
    required_achievement: Mapped[str | None] = mapped_column(String(96))
    required_event: Mapped[str | None] = mapped_column(String(96))
    search_tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    locale_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GiftVersion(Base):
    __tablename__ = "gift_versions"
    __table_args__ = (
        UniqueConstraint("gift_definition_id", "version_number", name="uq_gift_versions_number"),
        CheckConstraint("version_number > 0", name="ck_gift_versions_positive_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    gift_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_definitions.id", ondelete="RESTRICT"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    state: Mapped[GiftLifecycle] = mapped_column(
        Enum(GiftLifecycle, native_enum=False, length=16),
        default=GiftLifecycle.draft,
        index=True,
    )
    runtime_manifest: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT")
    )
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    retired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GiftAsset(Base):
    __tablename__ = "gift_assets"
    __table_args__ = (CheckConstraint("byte_size > 0", name="ck_gift_assets_positive_size"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    gift_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_versions.id", ondelete="RESTRICT"), index=True
    )
    object_key: Mapped[str] = mapped_column(String(512), unique=True)
    content_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    platform: Mapped[GiftAssetPlatform] = mapped_column(
        Enum(GiftAssetPlatform, native_enum=False, length=16), index=True
    )
    quality_tier: Mapped[GiftQualityTier] = mapped_column(
        Enum(GiftQualityTier, native_enum=False, length=16), index=True
    )
    state: Mapped[GiftAssetState] = mapped_column(
        Enum(GiftAssetState, native_enum=False, length=16),
        default=GiftAssetState.pending,
        index=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GiftCollection(Base):
    __tablename__ = "gift_collections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(500))
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    available_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GiftCollectionItem(Base):
    __tablename__ = "gift_collection_items"
    __table_args__ = (
        UniqueConstraint("collection_id", "gift_definition_id", name="uq_gift_collection_item"),
        UniqueConstraint("collection_id", "position", name="uq_gift_collection_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    collection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_collections.id", ondelete="CASCADE"), index=True
    )
    gift_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_definitions.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)


class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (
        CheckConstraint("quantity >= 0", name="ck_inventory_items_nonnegative_quantity"),
        CheckConstraint("acquired_quantity > 0", name="ck_inventory_items_acquired_quantity"),
        CheckConstraint("unit_price_minor > 0", name="ck_inventory_items_positive_unit_price"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    gift_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_definitions.id", ondelete="RESTRICT"), index=True
    )
    gift_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_versions.id", ondelete="RESTRICT"), index=True
    )
    acquisition_source: Mapped[AcquisitionSource] = mapped_column(
        Enum(AcquisitionSource, native_enum=False, length=24), index=True
    )
    quantity: Mapped[int] = mapped_column(Integer)
    acquired_quantity: Mapped[int] = mapped_column(Integer)
    unit_price_minor: Mapped[int] = mapped_column(BigInteger)
    acquisition_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class UserGiftPreference(Base):
    __tablename__ = "user_gift_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    accepts_gifts: Mapped[bool] = mapped_column(Boolean, default=True)
    friends_only: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_audio: Mapped[bool] = mapped_column(Boolean, default=True)
    blocked_tiers: Mapped[list[str]] = mapped_column(JSON, default=list)
    daily_spending_limit_minor: Mapped[int] = mapped_column(BigInteger, default=100_000)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CreatorMonetizationSetting(Base):
    __tablename__ = "creator_monetization_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    gifts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class GiftUserEligibility(Base):
    __tablename__ = "gift_user_eligibility"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    level: Mapped[int] = mapped_column(Integer, default=0)
    subscription_tier: Mapped[str | None] = mapped_column(String(32))
    achievements: Mapped[list[str]] = mapped_column(JSON, default=list)
    event_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class GiftSend(Base):
    __tablename__ = "gift_sends"
    __table_args__ = (
        UniqueConstraint(
            "sender_user_id", "idempotency_key", name="uq_gift_sends_sender_idempotency"
        ),
        CheckConstraint("sender_user_id <> recipient_user_id", name="ck_gift_sends_not_self"),
        CheckConstraint("price_minor > 0", name="ck_gift_sends_positive_price"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sender_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    gift_definition_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_definitions.id", ondelete="RESTRICT"), index=True
    )
    gift_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_versions.id", ondelete="RESTRICT"), index=True
    )
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="RESTRICT"), index=True
    )
    ledger_transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    idempotency_key: Mapped[str] = mapped_column(String(128))
    price_minor: Mapped[int] = mapped_column(BigInteger)
    creator_share_minor: Mapped[int] = mapped_column(BigInteger)
    platform_share_minor: Mapped[int] = mapped_column(BigInteger)
    message: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[GiftSendStatus] = mapped_column(
        Enum(GiftSendStatus, native_enum=False, length=16),
        default=GiftSendStatus.queued,
        index=True,
    )
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GiftDelivery(Base):
    __tablename__ = "gift_deliveries"
    __table_args__ = (
        UniqueConstraint("gift_send_id", "attempt_number", name="uq_gift_delivery_attempt"),
        CheckConstraint("attempt_number > 0", name="ck_gift_delivery_positive_attempt"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    gift_send_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_sends.id", ondelete="RESTRICT"), index=True
    )
    attempt_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus, native_enum=False, length=16), index=True
    )
    error_code: Mapped[str | None] = mapped_column(String(96))
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GiftEvent(Base):
    __tablename__ = "gift_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(48), index=True)
    gift_send_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("gift_sends.id", ondelete="CASCADE"), index=True
    )
    gift_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("gift_versions.id", ondelete="RESTRICT")
    )
    combination_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("gift_combinations.id", ondelete="CASCADE"), index=True
    )
    event_payload: Mapped[dict[str, Any]] = mapped_column("payload", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class GiftCombination(Base):
    __tablename__ = "gift_combinations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    recipient_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    combination_key: Mapped[str] = mapped_column(String(96), index=True)
    gift_send_ids: Mapped[list[str]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class GiftAffinity(Base):
    __tablename__ = "gift_affinities"
    __table_args__ = (UniqueConstraint("user_id", "category_id", name="uq_gift_affinity_category"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("gift_categories.id", ondelete="CASCADE"), index=True
    )
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    purchase_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class GiftSpendDaily(Base):
    __tablename__ = "gift_spend_daily"
    __table_args__ = (
        UniqueConstraint("user_id", "spend_date", name="uq_gift_spend_daily_user_date"),
        CheckConstraint("spent_minor >= 0", name="ck_gift_spend_daily_nonnegative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    spend_date: Mapped[date] = mapped_column(Date, index=True)
    spent_minor: Mapped[int] = mapped_column(BigInteger, default=0)


class GiftRefund(Base):
    __tablename__ = "gift_refunds"
    __table_args__ = (
        UniqueConstraint("gift_send_id", name="uq_gift_refund_send"),
        UniqueConstraint("inventory_item_id", name="uq_gift_refund_inventory"),
        UniqueConstraint("actor_user_id", "idempotency_key", name="uq_gift_refund_idempotency"),
        CheckConstraint(
            "(gift_send_id IS NOT NULL AND inventory_item_id IS NULL) OR "
            "(gift_send_id IS NULL AND inventory_item_id IS NOT NULL)",
            name="ck_gift_refund_single_target",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    gift_send_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("gift_sends.id", ondelete="RESTRICT")
    )
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("inventory_items.id", ondelete="RESTRICT")
    )
    ledger_transaction_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ledger_transactions.id", ondelete="RESTRICT"), unique=True
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    idempotency_key: Mapped[str] = mapped_column(String(128))
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


@event.listens_for(GiftVersion, "before_update")
def reject_published_version_update(_: object, __: object, target: GiftVersion) -> None:
    target_state = inspect(target)
    state_history = target_state.attrs.state.history
    was_published = GiftLifecycle.published in state_history.deleted or (
        not state_history.has_changes() and target.state == GiftLifecycle.published
    )
    if was_published:
        allowed_retirement = (
            target.state == GiftLifecycle.retired
            and target.retired_at is not None
            and not target_state.attrs.runtime_manifest.history.has_changes()
            and not target_state.attrs.gift_definition_id.history.has_changes()
            and not target_state.attrs.version_number.history.has_changes()
            and not target_state.attrs.created_by_id.history.has_changes()
            and not target_state.attrs.submitted_by_id.history.has_changes()
            and not target_state.attrs.reviewed_by_id.history.has_changes()
            and not target_state.attrs.published_at.history.has_changes()
        )
        if not allowed_retirement:
            raise ValueError("published gift version content is immutable")


@event.listens_for(GiftVersion, "before_delete")
def reject_published_version_delete(_: object, __: object, target: GiftVersion) -> None:
    if target.state == GiftLifecycle.published:
        raise ValueError("published gift versions are immutable")


@event.listens_for(GiftAsset, "before_update")
@event.listens_for(GiftAsset, "before_delete")
def reject_published_asset_mutation(_: object, connection: Connection, target: GiftAsset) -> None:
    version_state = connection.execute(
        select(GiftVersion.state).where(GiftVersion.id == target.gift_version_id)
    ).scalar_one_or_none()
    if version_state in {GiftLifecycle.published, GiftLifecycle.retired}:
        raise ValueError("assets of published gift versions are immutable")


Index(
    "ix_gift_definitions_catalog",
    GiftDefinition.state,
    GiftDefinition.available_from,
    GiftDefinition.available_until,
    GiftDefinition.id,
)
Index(
    "ix_inventory_owner_created",
    InventoryItem.owner_user_id,
    InventoryItem.created_at,
    InventoryItem.id,
)
Index(
    "ix_gift_sends_sender_created",
    GiftSend.sender_user_id,
    GiftSend.created_at,
    GiftSend.id,
)
Index(
    "ix_gift_sends_recipient_created",
    GiftSend.recipient_user_id,
    GiftSend.created_at,
    GiftSend.id,
)
Index("ix_gift_events_user_created", GiftEvent.user_id, GiftEvent.created_at, GiftEvent.id)
