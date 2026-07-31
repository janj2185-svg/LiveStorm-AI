from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.platform_models import (
    AssetRole,
    AssetState,
    AttemptState,
    BookingState,
    ContentKind,
    ContentState,
    ContentVisibility,
    CourseState,
    CreatorStatus,
    EnrollmentStatus,
    EntitlementState,
    LessonKind,
    OrderState,
    ProcessingState,
    ProductKind,
    ProductState,
    ProgressState,
    SettlementMethod,
    SubscriptionStatus,
)

Slug = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=3,
        max_length=80,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
    ),
]
SafeCategory = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        to_lower=True,
        min_length=2,
        max_length=64,
        pattern=r"^[a-z0-9]+(?:[ _-][a-z0-9]+)*$",
    ),
]
SHA256 = Annotated[str, StringConstraints(to_lower=True, pattern=r"^[a-f0-9]{64}$")]
IdempotencyKey = Annotated[
    str, StringConstraints(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")
]


def plain_text(value: str) -> str:
    if re.search(r"<[^>]+>", value):
        raise ValueError("HTML markup is not allowed")
    if re.search(r"(?:https?://|www\.)", value, flags=re.IGNORECASE):
        raise ValueError("arbitrary URLs are not allowed")
    return value


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMResponse(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class CreatorAccountCreate(StrictSchema):
    public_slug: Slug
    channel_name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    category: SafeCategory

    @field_validator("channel_name", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class CreatorAccountPatch(StrictSchema):
    public_slug: Slug | None = None
    channel_name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    category: SafeCategory | None = None
    status: CreatorStatus | None = None
    content_monetization_enabled: bool | None = None
    subscriptions_enabled: bool | None = None
    marketplace_enabled: bool | None = None
    payout_eligible: bool | None = None

    @field_validator("channel_name", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class CreatorAccountResponse(ORMResponse):
    user_id: uuid.UUID
    public_slug: str
    channel_name: str
    description: str | None
    category: str
    status: CreatorStatus
    content_monetization_enabled: bool
    subscriptions_enabled: bool
    marketplace_enabled: bool
    payout_eligible: bool
    created_at: datetime
    updated_at: datetime


class SubscriptionTierCreate(StrictSchema):
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(min_length=2, max_length=1000)
    price_minor: int | None = Field(default=None, gt=0, strict=True)
    external_settlement_reference: str | None = Field(default=None, min_length=3, max_length=255)
    duration_days: int = Field(default=30, ge=1, le=366, strict=True)
    benefits: list[str] = Field(default_factory=list, max_length=50)
    available_from: datetime | None = None
    available_until: datetime | None = None
    active: bool = True

    @field_validator("name", "description", "external_settlement_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @field_validator("benefits")
    @classmethod
    def validate_benefits(cls, values: list[str]) -> list[str]:
        for value in values:
            if not 1 <= len(value) <= 200:
                raise ValueError("benefits must contain 1-200 characters")
            plain_text(value)
        return values

    @model_validator(mode="after")
    def validate_settlement_and_window(self) -> SubscriptionTierCreate:
        if (self.price_minor is None) == (self.external_settlement_reference is None):
            raise ValueError("provide exactly one credit price or external settlement reference")
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class SubscriptionTierPatch(StrictSchema):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, min_length=2, max_length=1000)
    price_minor: int | None = Field(default=None, gt=0, strict=True)
    external_settlement_reference: str | None = Field(default=None, min_length=3, max_length=255)
    duration_days: int | None = Field(default=None, ge=1, le=366, strict=True)
    benefits: list[str] | None = Field(default=None, max_length=50)
    available_from: datetime | None = None
    available_until: datetime | None = None
    active: bool | None = None

    @field_validator("name", "description", "external_settlement_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @field_validator("benefits")
    @classmethod
    def validate_benefits(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return values
        for value in values:
            if not 1 <= len(value) <= 200:
                raise ValueError("benefits must contain 1-200 characters")
            plain_text(value)
        return values

    @model_validator(mode="after")
    def validate_window(self) -> SubscriptionTierPatch:
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class SubscriptionTierResponse(ORMResponse):
    id: uuid.UUID
    creator_user_id: uuid.UUID
    name: str
    description: str
    price_minor: int | None
    external_settlement_reference: str | None
    duration_days: int
    benefits: list[str]
    available_from: datetime | None
    available_until: datetime | None
    active: bool
    created_at: datetime
    updated_at: datetime


class SubscriptionPurchaseRequest(StrictSchema):
    tier_id: uuid.UUID
    settlement_method: Literal["credits", "external"]
    recipient_user_id: uuid.UUID | None = None
    auto_renew: bool = False
    return_url: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def external_requires_return_url(self) -> SubscriptionPurchaseRequest:
        if self.settlement_method == "external" and (
            self.return_url is None or not self.return_url.startswith("https://")
        ):
            raise ValueError("external settlement requires an HTTPS return_url")
        return self


class SubscriptionRenewRequest(StrictSchema):
    return_url: str | None = Field(default=None, max_length=2048)
    auto_renew: bool = False


class SubscriptionResponse(ORMResponse):
    id: uuid.UUID
    subscriber_user_id: uuid.UUID
    creator_user_id: uuid.UUID
    tier_id: uuid.UUID
    gift_giver_user_id: uuid.UUID | None
    status: SubscriptionStatus
    settlement_method: SettlementMethod
    entitlement_starts_at: datetime
    entitlement_ends_at: datetime
    auto_renew: bool
    ledger_transaction_id: uuid.UUID | None
    provider: str | None
    provider_operation_id: str | None
    settlement_amount_minor: int | None
    settlement_currency: str | None
    cancelled_at: datetime | None
    refunded_at: datetime | None
    created_at: datetime


class ContentCreate(StrictSchema):
    kind: ContentKind
    visibility: ContentVisibility = ContentVisibility.public
    required_tier_id: uuid.UUID | None = None
    purchase_product_id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=1000)
    body: str | None = Field(default=None, max_length=100_000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "summary", "body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @model_validator(mode="after")
    def validate_visibility_reference(self) -> ContentCreate:
        if self.visibility == ContentVisibility.tier and self.required_tier_id is None:
            raise ValueError("tier visibility requires required_tier_id")
        if self.visibility == ContentVisibility.purchase and self.purchase_product_id is None:
            raise ValueError("purchase visibility requires purchase_product_id")
        if self.visibility != ContentVisibility.tier and self.required_tier_id is not None:
            raise ValueError("required_tier_id is only valid for tier visibility")
        if self.visibility != ContentVisibility.purchase and self.purchase_product_id is not None:
            raise ValueError("purchase_product_id is only valid for purchase visibility")
        return self


class ContentPatch(StrictSchema):
    visibility: ContentVisibility | None = None
    required_tier_id: uuid.UUID | None = None
    purchase_product_id: uuid.UUID | None = None


class ContentVersionCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=1000)
    body: str | None = Field(default=None, max_length=100_000)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("title", "summary", "body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class ContentVersionPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = Field(default=None, max_length=1000)
    body: str | None = Field(default=None, max_length=100_000)
    metadata: dict[str, Any] | None = None

    @field_validator("title", "summary", "body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class ContentVersionResponse(ORMResponse):
    id: uuid.UUID
    content_item_id: uuid.UUID
    version_number: int
    state: ContentState
    title: str
    summary: str | None
    body: str | None
    content_metadata: dict[str, Any]
    created_by_id: uuid.UUID
    created_at: datetime
    published_at: datetime | None


class ContentResponse(ORMResponse):
    id: uuid.UUID
    creator_user_id: uuid.UUID
    kind: ContentKind
    state: ContentState
    visibility: ContentVisibility
    required_tier_id: uuid.UUID | None
    purchase_product_id: uuid.UUID | None
    published_version_id: uuid.UUID | None
    scheduled_at: datetime | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContentDetailResponse(ContentResponse):
    version: ContentVersionResponse
    entitled: bool


class ScheduleRequest(StrictSchema):
    scheduled_at: datetime


class AssetUploadRequest(StrictSchema):
    role: AssetRole
    content_type: str = Field(
        min_length=3, max_length=128, pattern=r"^[a-z0-9][a-z0-9.+-]+/[a-z0-9][a-z0-9.+-]+$"
    )
    byte_size: int = Field(gt=0, le=10_737_418_240, strict=True)
    sha256: SHA256
    rights_declaration: str = Field(min_length=10, max_length=500)
    license_reference: str | None = Field(default=None, min_length=3, max_length=255)

    @field_validator("rights_declaration", "license_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class AssetUploadResponse(StrictSchema):
    asset_id: uuid.UUID
    object_key: str
    upload_url: str
    headers: dict[str, str]
    expires_in_seconds: int


class AssetResponse(ORMResponse):
    id: uuid.UUID
    object_key: str
    content_type: str
    byte_size: int
    sha256: str
    state: AssetState
    created_at: datetime
    verified_at: datetime | None


class ProcessingRequest(StrictSchema):
    operation: Literal["transcode", "waveform", "captions", "thumbnail"]


class ProcessingResponse(ORMResponse):
    id: uuid.UUID
    content_version_id: uuid.UUID
    processor: str
    operation: str
    state: ProcessingState
    provider_job_id: str | None
    failure_code: str | None
    created_at: datetime
    updated_at: datetime


class CursorPage(StrictSchema):
    items: list[Any]
    next_cursor: str | None


class CreatorAnalyticsResponse(StrictSchema):
    content_count: int
    published_content_count: int
    follower_count: int
    active_subscription_count: int
    gift_count: int
    gift_revenue_minor: int
    subscription_revenue_minor: int
    marketplace_revenue_minor: int
    total_creator_earnings_minor: int


class StoreCreate(StrictSchema):
    slug: Slug
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)

    @field_validator("name", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class StorePatch(StrictSchema):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    active: bool | None = None

    @field_validator("name", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class StoreResponse(ORMResponse):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    slug: str
    name: str
    description: str | None
    active: bool
    platform_fee_bps: int
    created_at: datetime
    updated_at: datetime


class ProductCreate(StrictSchema):
    slug: Slug
    kind: ProductKind
    category: SafeCategory
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=20_000)
    fulfillment_terms: str = Field(min_length=2, max_length=2000)
    settlement_method: Literal["credits", "external"]
    amount_minor: int = Field(gt=0, strict=True)
    currency: str = Field(default="SYLORA_CREDIT", pattern=r"^[A-Z][A-Z0-9_]{2,15}$")
    external_reference: str | None = Field(default=None, min_length=3, max_length=255)
    quantity_available: int | None = Field(default=None, ge=0, strict=True)
    available_from: datetime | None = None
    available_until: datetime | None = None

    @field_validator("title", "description", "fulfillment_terms", "external_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @model_validator(mode="after")
    def validate_price(self) -> ProductCreate:
        if self.settlement_method == "credits":
            if self.currency != "SYLORA_CREDIT" or self.external_reference is not None:
                raise ValueError("credit products use SYLORA_CREDIT without external_reference")
        elif self.external_reference is None:
            raise ValueError("external products require external_reference")
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class ProductVersionCreate(StrictSchema):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=20_000)
    fulfillment_terms: str = Field(min_length=2, max_length=2000)

    @field_validator("title", "description", "fulfillment_terms")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)


class ProductPatch(StrictSchema):
    slug: Slug | None = None
    category: SafeCategory | None = None


class ProductPriceCreate(StrictSchema):
    settlement_method: Literal["credits", "external"]
    amount_minor: int = Field(gt=0, strict=True)
    currency: str = Field(pattern=r"^[A-Z][A-Z0-9_]{2,15}$")
    external_reference: str | None = Field(default=None, min_length=3, max_length=255)
    available_from: datetime | None = None
    available_until: datetime | None = None

    @field_validator("external_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @model_validator(mode="after")
    def validate_price(self) -> ProductPriceCreate:
        if self.settlement_method == "credits" and (
            self.currency != "SYLORA_CREDIT" or self.external_reference is not None
        ):
            raise ValueError("credit prices use SYLORA_CREDIT without external_reference")
        if self.settlement_method == "external" and self.external_reference is None:
            raise ValueError("external prices require external_reference")
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class ProductInventoryPatch(StrictSchema):
    quantity_available: int | None = Field(default=None, ge=0, strict=True)
    available_from: datetime | None = None
    available_until: datetime | None = None
    active: bool | None = None

    @model_validator(mode="after")
    def validate_window(self) -> ProductInventoryPatch:
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_until <= self.available_from
        ):
            raise ValueError("available_until must be later than available_from")
        return self


class ProductResponse(ORMResponse):
    id: uuid.UUID
    store_id: uuid.UUID
    slug: str
    kind: ProductKind
    category: str
    state: ProductState
    published_version_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CatalogProductResponse(ProductResponse):
    title: str
    description: str
    amount_minor: int
    currency: str
    settlement_method: SettlementMethod
    quantity_available: int | None
    rating_average: int | None
    rating_count: int


class ProductAssetUploadRequest(AssetUploadRequest):
    download_limit: int | None = Field(default=None, ge=1, le=1000, strict=True)
    entitlement_days: int | None = Field(default=None, ge=1, le=3650, strict=True)


class CollectionCreate(StrictSchema):
    slug: Slug
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    product_ids: list[uuid.UUID] = Field(default_factory=list, max_length=500)

    @field_validator("name", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class CollectionResponse(ORMResponse):
    id: uuid.UUID
    store_id: uuid.UUID
    slug: str
    name: str
    description: str | None
    active: bool
    created_at: datetime


class CartItemAdd(StrictSchema):
    product_id: uuid.UUID
    quantity: int = Field(default=1, ge=1, le=100, strict=True)
    settlement_method: Literal["credits", "external"] = "credits"


class CartItemUpdate(StrictSchema):
    quantity: int = Field(ge=1, le=100, strict=True)


class CartItemResponse(ORMResponse):
    id: uuid.UUID
    product_id: uuid.UUID
    product_version_id: uuid.UUID
    price_id: uuid.UUID
    quantity: int
    unit_price_minor: int
    currency: str
    settlement_method: SettlementMethod
    title_snapshot: str
    added_at: datetime


class CartResponse(StrictSchema):
    id: uuid.UUID
    items: list[CartItemResponse]
    subtotal_minor: int
    currency: str | None


class CheckoutRequest(StrictSchema):
    settlement_method: Literal["credits", "external"]
    return_url: str | None = Field(default=None, max_length=2048)

    @model_validator(mode="after")
    def external_requires_return_url(self) -> CheckoutRequest:
        if self.settlement_method == "external" and (
            self.return_url is None or not self.return_url.startswith("https://")
        ):
            raise ValueError("external checkout requires an HTTPS return_url")
        return self


class OrderLineResponse(ORMResponse):
    id: uuid.UUID
    product_id: uuid.UUID
    product_version_id: uuid.UUID
    seller_user_id: uuid.UUID
    product_kind: ProductKind
    title_snapshot: str
    quantity: int
    unit_price_minor: int
    line_total_minor: int
    fee_minor: int
    seller_proceeds_minor: int


class OrderResponse(ORMResponse):
    id: uuid.UUID
    buyer_user_id: uuid.UUID
    buyer_display_name: str
    state: OrderState
    settlement_method: SettlementMethod
    currency: str
    subtotal_minor: int
    fee_minor: int
    total_minor: int
    seller_proceeds_minor: int
    ledger_transaction_id: uuid.UUID | None
    provider: str | None
    provider_operation_id: str | None
    safe_provider_data: dict[str, Any]
    created_at: datetime
    paid_at: datetime | None
    completed_at: datetime | None
    refunded_at: datetime | None
    lines: list[OrderLineResponse] = Field(default_factory=list)


class EntitlementResponse(ORMResponse):
    id: uuid.UUID
    product_id: uuid.UUID
    product_version_id: uuid.UUID
    order_line_id: uuid.UUID
    state: EntitlementState
    expires_at: datetime | None
    download_limit: int | None
    download_count: int
    granted_at: datetime
    revoked_at: datetime | None


class DownloadResponse(StrictSchema):
    download_url: str
    expires_in_seconds: int
    download_count: int
    download_limit: int | None


class BookingResponse(ORMResponse):
    id: uuid.UUID
    order_line_id: uuid.UUID
    buyer_user_id: uuid.UUID
    seller_user_id: uuid.UUID
    status: BookingState
    requested_start_at: datetime | None
    scheduled_start_at: datetime | None
    scheduled_end_at: datetime | None
    created_at: datetime
    updated_at: datetime


class BookingPatch(StrictSchema):
    status: BookingState | None = None
    requested_start_at: datetime | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None


class BookingMessageCreate(StrictSchema):
    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)


class ReviewCreate(StrictSchema):
    order_line_id: uuid.UUID
    rating: int = Field(ge=1, le=5, strict=True)
    body: str | None = Field(default=None, max_length=2000)

    @field_validator("body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class ReviewPatch(StrictSchema):
    rating: int | None = Field(default=None, ge=1, le=5, strict=True)
    body: str | None = Field(default=None, max_length=2000)

    @field_validator("body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class ReviewResponse(ORMResponse):
    id: uuid.UUID
    product_id: uuid.UUID
    order_line_id: uuid.UUID
    reviewer_user_id: uuid.UUID
    rating: int
    body: str | None
    created_at: datetime
    updated_at: datetime


class RefundRequest(StrictSchema):
    reason: str = Field(min_length=5, max_length=500)

    @field_validator("reason")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)


class CourseCreate(StrictSchema):
    slug: Slug
    category: SafeCategory
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=20_000)
    learning_objectives: list[str] = Field(default_factory=list, max_length=100)
    settlement_method: SettlementMethod = SettlementMethod.free
    price_minor: int | None = Field(default=None, gt=0, strict=True)
    external_settlement_reference: str | None = Field(default=None, min_length=3, max_length=255)
    product_id: uuid.UUID | None = None
    required_subscription_tier_id: uuid.UUID | None = None

    @field_validator("title", "description", "external_settlement_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value

    @field_validator("learning_objectives")
    @classmethod
    def validate_objectives(cls, values: list[str]) -> list[str]:
        for value in values:
            if not 1 <= len(value) <= 500:
                raise ValueError("learning objectives must contain 1-500 characters")
            plain_text(value)
        return values

    @model_validator(mode="after")
    def validate_settlement(self) -> CourseCreate:
        if self.settlement_method == SettlementMethod.free and (
            self.price_minor is not None or self.external_settlement_reference is not None
        ):
            raise ValueError("free courses cannot have settlement configuration")
        if self.settlement_method == SettlementMethod.credits and (
            self.price_minor is None or self.external_settlement_reference is not None
        ):
            raise ValueError("credit courses require only price_minor")
        if self.settlement_method == SettlementMethod.external and (
            self.external_settlement_reference is None or self.price_minor is not None
        ):
            raise ValueError("external courses require only external_settlement_reference")
        return self


class CourseVersionCreate(StrictSchema):
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=2, max_length=20_000)
    learning_objectives: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("title", "description")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)

    @field_validator("learning_objectives")
    @classmethod
    def validate_objectives(cls, values: list[str]) -> list[str]:
        for value in values:
            if not 1 <= len(value) <= 500:
                raise ValueError("learning objectives must contain 1-500 characters")
            plain_text(value)
        return values


class CoursePatch(StrictSchema):
    slug: Slug | None = None
    category: SafeCategory | None = None
    settlement_method: SettlementMethod | None = None
    price_minor: int | None = Field(default=None, gt=0, strict=True)
    external_settlement_reference: str | None = Field(default=None, min_length=3, max_length=255)
    product_id: uuid.UUID | None = None
    required_subscription_tier_id: uuid.UUID | None = None

    @field_validator("external_settlement_reference")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class CourseResponse(ORMResponse):
    id: uuid.UUID
    author_user_id: uuid.UUID
    slug: str
    category: str
    state: CourseState
    settlement_method: SettlementMethod
    price_minor: int | None
    external_settlement_reference: str | None
    product_id: uuid.UUID | None
    required_subscription_tier_id: uuid.UUID | None
    published_version_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CourseDetailResponse(CourseResponse):
    title: str
    description: str
    learning_objectives: list[str]


class ModuleCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    position: int = Field(ge=0, le=10_000, strict=True)

    @field_validator("title", "description")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class ModuleResponse(ORMResponse):
    id: uuid.UUID
    course_version_id: uuid.UUID
    title: str
    description: str | None
    position: int


class LessonCreate(StrictSchema):
    kind: LessonKind
    title: str = Field(min_length=1, max_length=200)
    body: str | None = Field(default=None, max_length=100_000)
    content_item_id: uuid.UUID | None = None
    position: int = Field(ge=0, le=100_000, strict=True)
    required: bool = True
    required_seconds: int = Field(default=0, ge=0, le=86_400, strict=True)
    required_heartbeat_seconds: int = Field(default=0, ge=0, le=86_400, strict=True)
    prerequisite_lesson_id: uuid.UUID | None = None

    @field_validator("title", "body")
    @classmethod
    def text_only(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else value


class LessonResponse(ORMResponse):
    id: uuid.UUID
    module_id: uuid.UUID
    kind: LessonKind
    title: str
    body: str | None
    content_item_id: uuid.UUID | None
    position: int
    required: bool
    required_seconds: int
    required_heartbeat_seconds: int
    prerequisite_lesson_id: uuid.UUID | None


class LessonSummaryResponse(ORMResponse):
    id: uuid.UUID
    module_id: uuid.UUID
    kind: LessonKind
    title: str
    position: int
    required: bool
    required_seconds: int
    required_heartbeat_seconds: int
    prerequisite_lesson_id: uuid.UUID | None


class CurriculumResponse(StrictSchema):
    modules: list[ModuleResponse]
    lessons: list[LessonSummaryResponse]


class EnrollRequest(StrictSchema):
    course_id: uuid.UUID
    return_url: str | None = Field(default=None, max_length=2048)


class EnrollmentResponse(ORMResponse):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    course_version_id: uuid.UUID
    status: EnrollmentStatus
    settlement_method: SettlementMethod
    ledger_transaction_id: uuid.UUID | None
    order_id: uuid.UUID | None
    provider: str | None
    provider_operation_id: str | None
    enrolled_at: datetime
    completed_at: datetime | None


class HeartbeatRequest(StrictSchema):
    elapsed_seconds: int = Field(ge=1, le=60, strict=True)
    position_seconds: int = Field(ge=0, le=604_800, strict=True)


class ProgressResponse(ORMResponse):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    lesson_id: uuid.UUID
    state: ProgressState
    heartbeat_seconds: int
    last_position_seconds: int
    started_at: datetime | None
    completed_at: datetime | None
    updated_at: datetime


class QuizCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    lesson_id: uuid.UUID | None = None
    position: int = Field(default=0, ge=0, le=10_000, strict=True)
    required: bool = True
    pass_threshold_percent: int = Field(ge=0, le=100, strict=True)
    attempt_limit: int = Field(ge=1, le=100, strict=True)

    @field_validator("title")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)


class QuizOptionCreate(StrictSchema):
    text: str = Field(min_length=1, max_length=1000)
    is_correct: bool

    @field_validator("text")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)


class QuizQuestionCreate(StrictSchema):
    prompt: str = Field(min_length=1, max_length=2000)
    position: int = Field(ge=0, le=10_000, strict=True)
    options: list[QuizOptionCreate] = Field(min_length=2, max_length=20)

    @field_validator("prompt")
    @classmethod
    def text_only(cls, value: str) -> str:
        return plain_text(value)

    @model_validator(mode="after")
    def exactly_one_correct(self) -> QuizQuestionCreate:
        if sum(option.is_correct for option in self.options) != 1:
            raise ValueError("each question requires exactly one correct option")
        return self


class QuizOptionPublic(StrictSchema):
    id: uuid.UUID
    text: str
    position: int


class QuizQuestionPublic(StrictSchema):
    id: uuid.UUID
    prompt: str
    position: int
    options: list[QuizOptionPublic]


class QuizPublicResponse(StrictSchema):
    id: uuid.UUID
    title: str
    attempt_limit: int
    questions: list[QuizQuestionPublic]


class QuizAttemptResponse(ORMResponse):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    quiz_id: uuid.UUID
    attempt_number: int
    state: AttemptState
    score_percent: int | None
    correct_count: int | None
    question_count: int | None
    started_at: datetime
    finalized_at: datetime | None


class QuizAttemptCreate(StrictSchema):
    enrollment_id: uuid.UUID


class QuizAnswerRequest(StrictSchema):
    question_id: uuid.UUID
    selected_option_id: uuid.UUID


class CertificateIssueRequest(StrictSchema):
    enrollment_id: uuid.UUID


class CertificateResponse(ORMResponse):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    verification_code: str
    recipient_display_name: str
    course_title: str
    issued_at: datetime
    revoked_at: datetime | None
    pdf_object_key: str | None


class CertificateVerificationResponse(StrictSchema):
    valid: bool
    verification_code: str
    recipient_display_name: str
    course_title: str
    issued_at: datetime
