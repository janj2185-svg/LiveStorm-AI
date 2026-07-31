from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import APIError
from app.gift_models import (
    CreatorMonetizationSetting,
    DeliveryStatus,
    GiftAffinity,
    GiftAsset,
    GiftAssetState,
    GiftCombination,
    GiftDefinition,
    GiftDelivery,
    GiftEvent,
    GiftLifecycle,
    GiftQualityTier,
    GiftSend,
    GiftSendStatus,
    GiftUserEligibility,
    GiftVersion,
    UserGiftPreference,
)
from app.gift_schemas import (
    CatalogGiftResponse,
    GiftEventResponse,
    RuntimeManifest,
)
from app.security import utcnow
from app.social_service import encode_cursor


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def is_available(gift: GiftDefinition, now: datetime | None = None) -> bool:
    current = now or utcnow()
    return (
        gift.state == GiftLifecycle.published
        and (gift.available_from is None or aware(gift.available_from) <= current)
        and (gift.available_until is None or aware(gift.available_until) > current)
        and (gift.supply_cap is None or gift.sold_count < gift.supply_cap)
    )


async def published_version(db: AsyncSession, gift_definition_id: uuid.UUID) -> GiftVersion:
    version = await db.scalar(
        select(GiftVersion)
        .where(
            GiftVersion.gift_definition_id == gift_definition_id,
            GiftVersion.state == GiftLifecycle.published,
        )
        .order_by(GiftVersion.version_number.desc())
        .limit(1)
    )
    if version is None:
        raise APIError(
            409,
            "gift_version_unavailable",
            "Gift version unavailable",
            "This gift does not have an active published runtime version.",
        )
    return version


async def gift_is_eligible(
    db: AsyncSession, user_id: uuid.UUID, gift: GiftDefinition
) -> tuple[bool, str | None]:
    eligibility = await db.get(GiftUserEligibility, user_id)
    if gift.minimum_level is not None and (
        eligibility is None or eligibility.level < gift.minimum_level
    ):
        return False, "level"
    if gift.required_subscription_tier is not None and (
        eligibility is None or eligibility.subscription_tier != gift.required_subscription_tier
    ):
        return False, "subscription"
    if gift.required_achievement is not None and (
        eligibility is None or gift.required_achievement not in eligibility.achievements
    ):
        return False, "achievement"
    if gift.required_event is not None and (
        eligibility is None or gift.required_event not in eligibility.event_codes
    ):
        return False, "event"
    return True, None


async def require_available_eligible_gift(
    db: AsyncSession,
    user_id: uuid.UUID,
    gift_definition_id: uuid.UUID,
    *,
    lock: bool = False,
) -> GiftDefinition:
    statement = select(GiftDefinition).where(GiftDefinition.id == gift_definition_id)
    if lock:
        statement = statement.with_for_update()
    gift = await db.scalar(statement)
    if gift is None or not is_available(gift):
        raise APIError(
            404,
            "gift_not_available",
            "Gift not available",
            "The requested gift is not currently available.",
        )
    eligible, reason = await gift_is_eligible(db, user_id, gift)
    if not eligible:
        raise APIError(
            403,
            "gift_not_eligible",
            "Gift eligibility requirement not met",
            "Your account does not meet this gift's eligibility requirements.",
            extra={"eligibility_requirement": reason},
        )
    return gift


def manifest_asset_ids(manifest: RuntimeManifest) -> set[uuid.UUID]:
    identifiers = {reference.asset_id for reference in manifest.assets}
    if manifest.source_metadata is not None:
        identifiers.add(manifest.source_metadata.source_asset_id)
    for layer in manifest.layers:
        if hasattr(layer, "asset_id"):
            identifiers.add(layer.asset_id)
    for particles in manifest.particle_systems:
        if particles.texture_asset_id is not None:
            identifiers.add(particles.texture_asset_id)
    for shader in manifest.shaders:
        identifiers.add(shader.shader_asset_id)
        identifiers.update(shader.texture_asset_ids)
    identifiers.update(track.asset_id for track in manifest.audio)
    identifiers.update(
        identifier
        for identifier in (
            manifest.fallbacks.low_end_asset_id,
            manifest.fallbacks.reduced_motion_asset_id,
            manifest.fallbacks.no_audio_asset_id,
        )
        if identifier is not None
    )
    return identifiers


async def validate_publishable_version(db: AsyncSession, version: GiftVersion) -> list[str]:
    if version.state != GiftLifecycle.review:
        raise APIError(
            409,
            "gift_version_not_in_review",
            "Gift version is not in review",
            "Only a submitted review version can be published.",
        )
    try:
        manifest = RuntimeManifest.model_validate(version.runtime_manifest)
    except ValueError as exc:
        raise APIError(
            422,
            "invalid_runtime_manifest",
            "Invalid runtime manifest",
            "The runtime manifest does not satisfy the strict runtime contract.",
        ) from exc
    fallback_ids = {
        manifest.fallbacks.low_end_asset_id,
        manifest.fallbacks.reduced_motion_asset_id,
        manifest.fallbacks.no_audio_asset_id,
    }
    if None in fallback_ids:
        raise APIError(
            422,
            "manifest_fallbacks_required",
            "Runtime fallbacks required",
            "Low-end, reduced-motion, and no-audio fallbacks are required for publication.",
        )
    referenced_ids = manifest_asset_ids(manifest)
    assets = list(
        (
            await db.scalars(
                select(GiftAsset).where(
                    GiftAsset.gift_version_id == version.id,
                    GiftAsset.id.in_(referenced_ids),
                )
            )
        ).all()
    )
    asset_by_id = {asset.id: asset for asset in assets}
    if set(asset_by_id) != referenced_ids:
        raise APIError(
            422,
            "manifest_asset_missing",
            "Manifest asset missing",
            "Every manifest asset reference must belong to this gift version.",
        )
    if any(asset.state != GiftAssetState.verified for asset in assets):
        raise APIError(
            422,
            "manifest_asset_unverified",
            "Manifest asset not verified",
            "Every referenced asset must pass S3 metadata and checksum verification.",
        )
    low_end_id = manifest.fallbacks.low_end_asset_id
    assert low_end_id is not None
    if asset_by_id[low_end_id].quality_tier != GiftQualityTier.low:
        raise APIError(
            422,
            "low_end_fallback_invalid",
            "Low-end fallback invalid",
            "The low-end fallback must reference a verified low-quality-tier asset.",
        )
    total_bytes = sum(asset.byte_size for asset in assets)
    total_particles = sum(item.max_particles for item in manifest.particle_systems)
    total_shader_instructions = sum(shader.instruction_count for shader in manifest.shaders)
    budgets = manifest.quality_budgets
    if (
        total_bytes > budgets.max_download_bytes
        or manifest.duration_ms > budgets.max_duration_ms
        or total_particles > budgets.max_particles
        or total_shader_instructions > budgets.max_shader_instructions
        or any(track.peak_dbfs > budgets.max_audio_peak_dbfs for track in manifest.audio)
    ):
        raise APIError(
            422,
            "gift_quality_budget_exceeded",
            "Gift quality budget exceeded",
            "Assets, duration, particles, shaders, or audio exceed the declared quality budget.",
        )
    return [
        "strict_manifest",
        "all_assets_verified",
        "low_end_fallback",
        "reduced_motion_fallback",
        "no_audio_fallback",
        "download_budget",
        "duration_budget",
        "particle_budget",
        "shader_budget",
        "audio_loudness_budget",
    ]


async def catalog_gift_response(
    db: AsyncSession,
    gift: GiftDefinition,
    *,
    version: GiftVersion | None = None,
) -> CatalogGiftResponse:
    selected = version or await published_version(db, gift.id)
    manifest = RuntimeManifest.model_validate(selected.runtime_manifest)
    return CatalogGiftResponse(
        id=gift.id,
        author_user_id=gift.author_user_id,
        category_id=gift.category_id,
        slug=gift.slug,
        name=gift.name,
        description=gift.description,
        price_minor=gift.price_minor,
        creator_revenue_share_bps=gift.creator_revenue_share_bps,
        tier=gift.tier,
        state=gift.state,
        available_from=gift.available_from,
        available_until=gift.available_until,
        supply_cap=gift.supply_cap,
        sold_count=gift.sold_count,
        per_user_limit=gift.per_user_limit,
        required_subscription_tier=gift.required_subscription_tier,
        minimum_level=gift.minimum_level,
        required_achievement=gift.required_achievement,
        required_event=gift.required_event,
        search_tags=list(gift.search_tags),
        locale_metadata={str(key): str(value) for key, value in gift.locale_metadata.items()},
        version_id=selected.id,
        version_number=selected.version_number,
        renderer_targets=list(manifest.renderer_targets),
        asset_ids=sorted(manifest_asset_ids(manifest), key=lambda item: item.int),
    )


async def record_affinity(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    category_id: uuid.UUID,
    view_increment: int = 0,
    purchase_increment: int = 0,
) -> GiftAffinity:
    affinity = await db.scalar(
        select(GiftAffinity).where(
            GiftAffinity.user_id == user_id,
            GiftAffinity.category_id == category_id,
        )
    )
    if affinity is None:
        affinity = GiftAffinity(user_id=user_id, category_id=category_id)
        db.add(affinity)
        await db.flush()
    affinity.view_count += view_increment
    affinity.purchase_count += purchase_increment
    return affinity


async def gift_preference(db: AsyncSession, user_id: uuid.UUID) -> UserGiftPreference:
    preference = await db.get(UserGiftPreference, user_id)
    if preference is None:
        preference = UserGiftPreference(user_id=user_id)
        db.add(preference)
        await db.flush()
    return preference


async def creator_monetization(db: AsyncSession, user_id: uuid.UUID) -> CreatorMonetizationSetting:
    setting = await db.get(CreatorMonetizationSetting, user_id)
    if setting is None:
        setting = CreatorMonetizationSetting(user_id=user_id, gifts_enabled=False)
        db.add(setting)
        await db.flush()
    return setting


class GiftConnectionHub:
    """Bounded process-local fan-out; GiftEvent rows provide durable replay."""

    def __init__(self, queue_size: int = 100) -> None:
        self.queue_size = queue_size
        self._queues: dict[uuid.UUID, set[asyncio.Queue[GiftEventResponse]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: uuid.UUID) -> asyncio.Queue[GiftEventResponse]:
        queue: asyncio.Queue[GiftEventResponse] = asyncio.Queue(maxsize=self.queue_size)
        async with self._lock:
            self._queues[user_id].add(queue)
        return queue

    async def unsubscribe(
        self, user_id: uuid.UUID, queue: asyncio.Queue[GiftEventResponse]
    ) -> None:
        async with self._lock:
            self._queues[user_id].discard(queue)
            if not self._queues[user_id]:
                self._queues.pop(user_id, None)

    async def publish(self, user_id: uuid.UUID, event: GiftEventResponse) -> None:
        async with self._lock:
            queues = tuple(self._queues.get(user_id, ()))
        for queue in queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)


def event_response(settings: Any, record: GiftEvent) -> GiftEventResponse:
    return GiftEventResponse(
        event=record.event_type,
        cursor=encode_cursor(settings, "gift-events", record.created_at, record.id),
        gift_send_id=record.gift_send_id,
        gift_version_id=record.gift_version_id,
        combination_id=record.combination_id,
        payload={
            str(key): value
            for key, value in record.event_payload.items()
            if value is None
            or isinstance(value, (str, int, bool))
            or (isinstance(value, list) and all(isinstance(item, str) for item in value))
        },
        occurred_at=record.created_at,
    )


async def deliver_gift_send(
    db: AsyncSession,
    gift_send: GiftSend,
    delivery: GiftDelivery,
) -> list[GiftEvent]:
    if gift_send.status == GiftSendStatus.delivered:
        return []
    version = await db.get(GiftVersion, gift_send.gift_version_id)
    if version is None or version.state != GiftLifecycle.published:
        gift_send.status = GiftSendStatus.failed
        gift_send.failure_code = "version_retired"
        gift_send.failed_at = utcnow()
        delivery.status = DeliveryStatus.failed
        delivery.error_code = "version_retired"
        delivery.completed_at = utcnow()
        await db.flush()
        return []
    manifest = RuntimeManifest.model_validate(version.runtime_manifest)
    recipient_preference = await gift_preference(db, gift_send.recipient_user_id)
    now = utcnow()
    gift_send.status = GiftSendStatus.delivered
    gift_send.delivered_at = now
    gift_send.failure_code = None
    delivery.status = DeliveryStatus.delivered
    delivery.completed_at = now
    common_payload = {
        "gift_definition_id": str(gift_send.gift_definition_id),
        "gift_version_id": str(gift_send.gift_version_id),
        "asset_ids": [
            str(item) for item in sorted(manifest_asset_ids(manifest), key=lambda item: item.int)
        ],
        "audio_enabled": recipient_preference.allow_audio,
    }
    records = [
        GiftEvent(
            user_id=gift_send.recipient_user_id,
            event_type="gift_received",
            gift_send_id=gift_send.id,
            gift_version_id=gift_send.gift_version_id,
            event_payload={
                **common_payload,
                "sender_user_id": str(gift_send.sender_user_id),
            },
        ),
        GiftEvent(
            user_id=gift_send.sender_user_id,
            event_type="gift_delivered",
            gift_send_id=gift_send.id,
            gift_version_id=gift_send.gift_version_id,
            event_payload={
                **common_payload,
                "recipient_user_id": str(gift_send.recipient_user_id),
            },
        ),
    ]
    db.add_all(records)
    await db.flush()
    combination = await create_combination_if_applicable(db, gift_send, manifest)
    if combination is not None:
        combination_event = GiftEvent(
            user_id=gift_send.recipient_user_id,
            event_type="gift_combination",
            gift_send_id=gift_send.id,
            gift_version_id=gift_send.gift_version_id,
            combination_id=combination.id,
            event_payload={"combination_key": combination.combination_key},
        )
        db.add(combination_event)
        records.append(combination_event)
        await db.flush()
    return records


async def create_combination_if_applicable(
    db: AsyncSession,
    gift_send: GiftSend,
    manifest: RuntimeManifest,
) -> GiftCombination | None:
    if not manifest.combinations:
        return None
    max_window = max(rule.window_seconds for rule in manifest.combinations)
    prior_sends = list(
        (
            await db.scalars(
                select(GiftSend)
                .where(
                    GiftSend.recipient_user_id == gift_send.recipient_user_id,
                    GiftSend.id != gift_send.id,
                    GiftSend.status == GiftSendStatus.delivered,
                    GiftSend.delivered_at >= utcnow() - timedelta(seconds=max_window),
                )
                .order_by(GiftSend.delivered_at.desc())
                .limit(50)
            )
        ).all()
    )
    for prior in prior_sends:
        prior_version = await db.get(GiftVersion, prior.gift_version_id)
        if prior_version is None:
            continue
        prior_manifest = RuntimeManifest.model_validate(prior_version.runtime_manifest)
        prior_ids = {rule.combination_id for rule in prior_manifest.combinations}
        for rule in manifest.combinations:
            if not prior.delivered_at:
                continue
            if aware(prior.delivered_at) < utcnow() - timedelta(seconds=rule.window_seconds):
                continue
            matches = prior_ids.intersection(rule.compatible_combination_ids)
            if matches:
                key = f"{rule.combination_id}+{sorted(matches)[0]}"
                combination = GiftCombination(
                    recipient_user_id=gift_send.recipient_user_id,
                    combination_key=key,
                    gift_send_ids=[str(prior.id), str(gift_send.id)],
                )
                db.add(combination)
                await db.flush()
                return combination
    return None
