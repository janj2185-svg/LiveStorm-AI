from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.gift_models import (
    AcquisitionSource,
    DeliveryStatus,
    GiftAssetPlatform,
    GiftAssetState,
    GiftLifecycle,
    GiftQualityTier,
    GiftSendStatus,
    GiftTier,
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


def plain_text(value: str) -> str:
    if re.search(r"<[^>]+>", value):
        raise ValueError("HTML markup is not allowed")
    return value


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Vector3(StrictSchema):
    x: float = Field(ge=-100_000, le=100_000)
    y: float = Field(ge=-100_000, le=100_000)
    z: float = Field(ge=-100_000, le=100_000)


class Transform(StrictSchema):
    position: Vector3 = Field(default_factory=lambda: Vector3(x=0, y=0, z=0))
    rotation_degrees: Vector3 = Field(default_factory=lambda: Vector3(x=0, y=0, z=0))
    scale: Vector3 = Field(default_factory=lambda: Vector3(x=1, y=1, z=1))


class AssetReference(StrictSchema):
    asset_id: uuid.UUID
    role: str = Field(min_length=2, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")


class BlenderSourceMetadata(StrictSchema):
    application: Literal["blender"]
    version: str = Field(min_length=3, max_length=32)
    source_asset_id: uuid.UUID
    license_reference: str = Field(min_length=3, max_length=255)


class ModelLayer(StrictSchema):
    kind: Literal["model"]
    name: str = Field(min_length=1, max_length=64)
    asset_id: uuid.UUID
    transform: Transform = Field(default_factory=Transform)


class SpriteLayer(StrictSchema):
    kind: Literal["sprite"]
    name: str = Field(min_length=1, max_length=64)
    asset_id: uuid.UUID
    transform: Transform = Field(default_factory=Transform)
    billboard: bool = True


class TextLayer(StrictSchema):
    kind: Literal["text"]
    name: str = Field(min_length=1, max_length=64)
    localization_key: str = Field(min_length=1, max_length=96)
    transform: Transform = Field(default_factory=Transform)


RuntimeLayer = Annotated[ModelLayer | SpriteLayer | TextLayer, Field(discriminator="kind")]


class TimelineKeyframe(StrictSchema):
    time_ms: int = Field(ge=0, le=120_000, strict=True)
    value: float | Vector3 | bool | str
    easing: Literal["linear", "ease_in", "ease_out", "ease_in_out", "step"] = "linear"


class TimelineTrack(StrictSchema):
    target: str = Field(min_length=1, max_length=96)
    property: str = Field(min_length=1, max_length=64)
    keyframes: list[TimelineKeyframe] = Field(min_length=1, max_length=500)


class Timeline(StrictSchema):
    name: str = Field(min_length=1, max_length=64)
    duration_ms: int = Field(gt=0, le=120_000, strict=True)
    loop: bool = False
    tracks: list[TimelineTrack] = Field(default_factory=list, max_length=100)


class ParticleSystemSpec(StrictSchema):
    name: str = Field(min_length=1, max_length=64)
    max_particles: int = Field(gt=0, le=100_000, strict=True)
    spawn_rate_per_second: int = Field(ge=0, le=20_000, strict=True)
    texture_asset_id: uuid.UUID | None = None
    deterministic_seed: int = Field(ge=0, le=2_147_483_647, strict=True)


class ShaderSpec(StrictSchema):
    name: str = Field(min_length=1, max_length=64)
    shader_asset_id: uuid.UUID
    instruction_count: int = Field(gt=0, le=4096, strict=True)
    texture_asset_ids: list[uuid.UUID] = Field(default_factory=list, max_length=16)


class LightSpec(StrictSchema):
    kind: Literal["ambient", "directional", "point", "spot"]
    color_hex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    intensity: float = Field(ge=0, le=100)
    position: Vector3 | None = None


class AudioTrackSpec(StrictSchema):
    asset_id: uuid.UUID
    spatial: bool = False
    peak_dbfs: float = Field(ge=-60, le=-1)
    autoplay: bool = True


class InteractionHook(StrictSchema):
    hook: Literal["tap", "hold", "swipe", "gaze", "arrival", "completion"]
    action: str = Field(min_length=1, max_length=96, pattern=r"^[a-z][a-z0-9_.:-]*$")


class CombinationRule(StrictSchema):
    combination_id: str = Field(min_length=3, max_length=96, pattern=r"^[a-z][a-z0-9_.:-]*$")
    compatible_combination_ids: list[str] = Field(min_length=1, max_length=20)
    window_seconds: int = Field(gt=0, le=300, strict=True)


class ProceduralParameter(StrictSchema):
    name: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    source: Literal["deterministic", "client_ai"]
    value_type: Literal["integer", "number", "boolean", "color", "seed", "enum"]
    minimum: float | None = None
    maximum: float | None = None
    allowed_values: list[str] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validate_range(self) -> ProceduralParameter:
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("procedural parameter minimum exceeds maximum")
        return self


class EffectSpec(StrictSchema):
    name: str = Field(min_length=1, max_length=64)
    scope: Literal["full_screen", "viewer", "avatar", "streamer"]
    timeline_name: str = Field(min_length=1, max_length=64)


class ManifestFallbacks(StrictSchema):
    low_end_asset_id: uuid.UUID | None = None
    reduced_motion_asset_id: uuid.UUID | None = None
    no_audio_asset_id: uuid.UUID | None = None


class QualityBudgets(StrictSchema):
    max_download_bytes: int = Field(gt=0, le=104_857_600, strict=True)
    max_duration_ms: int = Field(gt=0, le=120_000, strict=True)
    max_particles: int = Field(ge=0, le=100_000, strict=True)
    max_shader_instructions: int = Field(ge=0, le=4096, strict=True)
    max_audio_peak_dbfs: float = Field(ge=-60, le=-1)


class RuntimeManifest(StrictSchema):
    schema_version: Literal["1.0"]
    renderer_targets: list[Literal["threejs", "flutter", "lottie", "unity", "unreal"]] = Field(
        min_length=1, max_length=5
    )
    animation_tier: Literal["starter", "standard", "premium", "hero"] | None = None
    particle_hints: dict[str, str | int | bool] = Field(default_factory=dict, max_length=20)
    source_metadata: BlenderSourceMetadata | None = None
    duration_ms: int = Field(gt=0, le=120_000, strict=True)
    assets: list[AssetReference] = Field(min_length=1, max_length=200)
    layers: list[RuntimeLayer] = Field(default_factory=list, max_length=200)
    timelines: list[Timeline] = Field(default_factory=list, max_length=20)
    particle_systems: list[ParticleSystemSpec] = Field(default_factory=list, max_length=50)
    shaders: list[ShaderSpec] = Field(default_factory=list, max_length=50)
    lighting: list[LightSpec] = Field(default_factory=list, max_length=50)
    audio: list[AudioTrackSpec] = Field(default_factory=list, max_length=20)
    interaction_hooks: list[InteractionHook] = Field(default_factory=list, max_length=50)
    combinations: list[CombinationRule] = Field(default_factory=list, max_length=20)
    procedural_parameters: list[ProceduralParameter] = Field(default_factory=list, max_length=50)
    effects: list[EffectSpec] = Field(default_factory=list, max_length=50)
    fallbacks: ManifestFallbacks
    quality_budgets: QualityBudgets

    @field_validator("renderer_targets")
    @classmethod
    def unique_renderers(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("renderer targets must be unique")
        return value

    @model_validator(mode="after")
    def validate_internal_limits(self) -> RuntimeManifest:
        if self.duration_ms > self.quality_budgets.max_duration_ms:
            raise ValueError("manifest duration exceeds its quality budget")
        for timeline in self.timelines:
            if timeline.duration_ms > self.duration_ms:
                raise ValueError("timeline duration exceeds manifest duration")
            for track in timeline.tracks:
                if any(frame.time_ms > timeline.duration_ms for frame in track.keyframes):
                    raise ValueError("timeline keyframe exceeds timeline duration")
        return self


class GiftCategoryCreate(StrictSchema):
    slug: Slug
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=500)

    @field_validator("name", "description")
    @classmethod
    def require_plain_text(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else None


class GiftCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    description: str | None


class GiftDefinitionCreate(StrictSchema):
    category_id: uuid.UUID
    slug: Slug
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=3, max_length=4000)
    price_minor: int = Field(gt=0, le=100_000_000, strict=True)
    creator_revenue_share_bps: int = Field(ge=0, le=10_000, strict=True)
    tier: GiftTier
    available_from: datetime | None = None
    available_until: datetime | None = None
    supply_cap: int | None = Field(default=None, gt=0, strict=True)
    per_user_limit: int | None = Field(default=None, gt=0, strict=True)
    required_subscription_tier: str | None = Field(default=None, max_length=32)
    minimum_level: int | None = Field(default=None, ge=0, strict=True)
    required_achievement: str | None = Field(default=None, max_length=96)
    required_event: str | None = Field(default=None, max_length=96)
    search_tags: list[str] = Field(default_factory=list, max_length=30)
    locale_metadata: dict[str, str] = Field(default_factory=dict)

    @field_validator("search_tags")
    @classmethod
    def clean_tags(cls, value: list[str]) -> list[str]:
        cleaned = [tag.strip().lower() for tag in value]
        if any(not re.fullmatch(r"[a-z0-9][a-z0-9 _-]{0,39}", tag) for tag in cleaned):
            raise ValueError("search tags contain invalid text")
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("search tags must be unique")
        return cleaned

    @field_validator("name", "description")
    @classmethod
    def require_plain_text(cls, value: str) -> str:
        return plain_text(value)

    @field_validator("locale_metadata")
    @classmethod
    def validate_locale_metadata(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 50:
            raise ValueError("locale metadata has too many entries")
        if any(
            not re.fullmatch(r"[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})?", key)
            or len(text) > 500
            or plain_text(text) != text
            for key, text in value.items()
        ):
            raise ValueError("locale metadata contains invalid text")
        return value

    @model_validator(mode="after")
    def validate_window(self) -> GiftDefinitionCreate:
        if (
            self.available_from is not None
            and self.available_until is not None
            and self.available_from >= self.available_until
        ):
            raise ValueError("availability start must precede end")
        return self


class GiftDefinitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_user_id: uuid.UUID
    category_id: uuid.UUID
    slug: str
    name: str
    description: str
    price_minor: int
    creator_revenue_share_bps: int
    tier: GiftTier
    state: GiftLifecycle
    available_from: datetime | None
    available_until: datetime | None
    supply_cap: int | None
    sold_count: int
    per_user_limit: int | None
    required_subscription_tier: str | None
    minimum_level: int | None
    required_achievement: str | None
    required_event: str | None
    search_tags: list[str]
    locale_metadata: dict[str, str]


class GiftVersionCreate(StrictSchema):
    # A draft version must exist before the API can issue asset IDs and
    # presigned uploads. The strict manifest is attached after those assets are
    # verified and is mandatory before review submission.
    manifest: RuntimeManifest | None = None


class GiftManifestPatch(StrictSchema):
    manifest: RuntimeManifest


class GiftVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gift_definition_id: uuid.UUID
    version_number: int
    state: GiftLifecycle
    runtime_manifest: dict[str, object]
    created_by_id: uuid.UUID
    submitted_by_id: uuid.UUID | None
    reviewed_by_id: uuid.UUID | None
    created_at: datetime
    submitted_at: datetime | None
    published_at: datetime | None
    retired_at: datetime | None


class GiftRuntimeAsset(StrictSchema):
    id: uuid.UUID
    content_type: str
    byte_size: int
    sha256: str
    platform: GiftAssetPlatform
    quality_tier: GiftQualityTier


class GiftRuntimeResponse(StrictSchema):
    gift_definition_id: uuid.UUID
    gift_version_id: uuid.UUID
    version_number: int
    manifest: RuntimeManifest
    assets: list[GiftRuntimeAsset]


class WebSocketTicketResponse(StrictSchema):
    ticket: str
    expires_in_seconds: int


class GiftAssetUploadRequest(StrictSchema):
    content_type: str = Field(
        min_length=3,
        max_length=128,
        pattern=r"^(application|audio|image|model|video)/[A-Za-z0-9.+-]+$",
    )
    byte_size: int = Field(gt=0, le=104_857_600, strict=True)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    platform: GiftAssetPlatform
    quality_tier: GiftQualityTier
    filename_extension: str = Field(min_length=1, max_length=10, pattern=r"^[a-z0-9]+$")


class GiftAssetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    gift_version_id: uuid.UUID
    content_type: str
    byte_size: int
    sha256: str
    platform: GiftAssetPlatform
    quality_tier: GiftQualityTier
    state: GiftAssetState
    verified_at: datetime | None
    rejection_code: str | None


class GiftAssetUploadResponse(StrictSchema):
    asset: GiftAssetResponse
    upload_url: str
    required_headers: dict[str, str]
    expires_in_seconds: int


class GiftAssetDownloadResponse(StrictSchema):
    download_url: str
    expires_in_seconds: int


class GiftValidationResponse(StrictSchema):
    valid: bool
    checks: list[str]


class GiftCollectionCreate(StrictSchema):
    slug: Slug
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    available_from: datetime | None = None
    available_until: datetime | None = None

    @field_validator("name", "description")
    @classmethod
    def require_plain_text(cls, value: str | None) -> str | None:
        return plain_text(value) if value is not None else None


class GiftCollectionItemRequest(StrictSchema):
    gift_definition_id: uuid.UUID
    position: int = Field(ge=0, le=10_000, strict=True)


class GiftCollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name: str
    description: str | None
    available_from: datetime | None
    available_until: datetime | None


class CatalogGiftResponse(GiftDefinitionResponse):
    version_id: uuid.UUID
    version_number: int
    renderer_targets: list[str]
    asset_ids: list[uuid.UUID]


class CatalogPage(StrictSchema):
    items: list[CatalogGiftResponse]
    next_cursor: str | None


class GiftPurchaseRequest(StrictSchema):
    gift_definition_id: uuid.UUID
    quantity: int = Field(default=1, gt=0, le=100, strict=True)


class InventoryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID
    gift_definition_id: uuid.UUID
    gift_version_id: uuid.UUID
    acquisition_source: AcquisitionSource
    quantity: int
    acquired_quantity: int
    unit_price_minor: int
    expires_at: datetime | None
    created_at: datetime


class InventoryPage(StrictSchema):
    items: list[InventoryItemResponse]
    next_cursor: str | None


class GiftSendRequest(StrictSchema):
    recipient_user_id: uuid.UUID
    inventory_item_id: uuid.UUID | None = None
    gift_definition_id: uuid.UUID | None = None
    message: str | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def single_source(self) -> GiftSendRequest:
        if (self.inventory_item_id is None) == (self.gift_definition_id is None):
            raise ValueError("provide exactly one inventory item or gift definition")
        if self.message is not None and re.search(r"<[^>]+>", self.message):
            raise ValueError("gift messages are plain text and cannot contain HTML")
        return self


class GiftDeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    attempt_number: int
    status: DeliveryStatus
    error_code: str | None
    queued_at: datetime
    completed_at: datetime | None


class GiftSendResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_user_id: uuid.UUID
    recipient_user_id: uuid.UUID
    gift_definition_id: uuid.UUID
    gift_version_id: uuid.UUID
    inventory_item_id: uuid.UUID | None
    ledger_transaction_id: uuid.UUID
    price_minor: int
    creator_share_minor: int
    platform_share_minor: int
    message: str | None
    status: GiftSendStatus
    failure_code: str | None
    created_at: datetime
    delivered_at: datetime | None
    failed_at: datetime | None
    refunded_at: datetime | None


class GiftSendPage(StrictSchema):
    items: list[GiftSendResponse]
    next_cursor: str | None


class GiftPreferencePatch(StrictSchema):
    accepts_gifts: bool | None = None
    friends_only: bool | None = None
    allow_audio: bool | None = None
    blocked_tiers: list[GiftTier] | None = Field(default=None, max_length=12)
    daily_spending_limit_minor: int | None = Field(default=None, ge=0, le=100_000_000, strict=True)


class GiftPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    accepts_gifts: bool
    friends_only: bool
    allow_audio: bool
    blocked_tiers: list[str]
    daily_spending_limit_minor: int


class CreatorMonetizationPatch(StrictSchema):
    gifts_enabled: bool


class CreatorMonetizationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    gifts_enabled: bool


class GiftRefundRequest(StrictSchema):
    reason: str = Field(min_length=3, max_length=500)


class GiftRefundResponse(StrictSchema):
    refund_id: uuid.UUID
    ledger_transaction_id: uuid.UUID
    status: Literal["refunded"]


class RecommendationItem(StrictSchema):
    gift: CatalogGiftResponse
    score: int
    explanation: str


class RecommendationResponse(StrictSchema):
    method: Literal["heuristic"]
    items: list[RecommendationItem]


class GiftEventResponse(StrictSchema):
    event: str
    cursor: str
    gift_send_id: uuid.UUID | None
    gift_version_id: uuid.UUID | None
    combination_id: uuid.UUID | None
    payload: dict[str, str | int | bool | None | list[str]]
    occurred_at: datetime


class GiftEventPage(StrictSchema):
    items: list[GiftEventResponse]
    next_cursor: str | None


class GiftRankingItem(StrictSchema):
    rank: int
    sender_user_id: uuid.UUID
    display_name: str | None
    gift_count: int
    total_spent_minor: int


class GiftRankingResponse(StrictSchema):
    scope: Literal["global_daily", "live_session"]
    live_session_id: uuid.UUID | None = None
    generated_at: datetime
    items: list[GiftRankingItem]
