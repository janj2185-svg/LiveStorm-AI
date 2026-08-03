from __future__ import annotations

import hashlib
import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gift_models import (
    GiftAsset,
    GiftAssetPlatform,
    GiftAssetState,
    GiftCategory,
    GiftCollection,
    GiftCollectionItem,
    GiftDefinition,
    GiftLifecycle,
    GiftQualityTier,
    GiftTier,
    GiftVersion,
)
from app.gift_schemas import RuntimeManifest
from app.gift_service import validate_publishable_version
from app.models import AccountSettings, Profile, Role, User, UserRole, UserStatus
from app.security import hash_password, utcnow

READY_STARTER_SLUGS = (
    "lumen-seed",
    "paper-koi",
    "signal-ribbon",
    "tea-steam-heart",
    "constellation-pin",
    "stage-curtain-rise",
    "opera-mask-reveal",
    "worldfold-letter",
    "sylora-genesis-spire",
    "celestial-phoenix",
)

READY_STARTER_SYSTEM_EMAIL = "ready-gifts-system@sylora.stand.local"
READY_STARTER_CATEGORY_SLUG = "official-gift-library"
READY_STARTER_COLLECTION_SLUG = "lumen-starter-pack"
READY_STARTER_NAMESPACE = uuid.UUID("fd04f7fd-16d8-4faa-8f47-d21d4bc6d226")


@dataclass(frozen=True)
class SeedAsset:
    id: uuid.UUID
    role: str
    object_key: str
    content_type: str
    platform: GiftAssetPlatform
    quality_tier: GiftQualityTier
    payload: bytes

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.payload).hexdigest()

    @property
    def byte_size(self) -> int:
        return len(self.payload)


@dataclass(frozen=True)
class StarterCandidate:
    slug: str
    name: str
    description: str
    price_minor: int
    tier: GiftTier
    duration_ms: int
    form_family: str
    vfx_family: str
    source_status: str


def gift_library_root() -> Path:
    env_root = os.environ.get("GIFT_LIBRARY_ROOT")
    if env_root:
        return Path(env_root)
    return Path(__file__).resolve().parents[3] / "artifacts" / "gift-library"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _stable_uuid(slug: str, purpose: str) -> uuid.UUID:
    return uuid.uuid5(READY_STARTER_NAMESPACE, f"{slug}:{purpose}")


def _asset_payload(slug: str, role: str, payload: dict[str, Any]) -> bytes:
    body = {
        "pack": READY_STARTER_COLLECTION_SLUG,
        "slug": slug,
        "role": role,
        "quality": "procedural-starter",
        "payload": payload,
    }
    return (json.dumps(body, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _catalog_by_slug(root: Path) -> dict[str, dict[str, Any]]:
    catalog_path = root / "catalog.json"
    if not catalog_path.is_file():
        return {}
    catalog = _read_json(catalog_path)
    return {str(item["slug"]): item for item in catalog.get("gifts", [])}


def _tier(value: str | None, rarity: str | None) -> GiftTier:
    if value:
        try:
            return GiftTier(value)
        except ValueError:
            pass
    rarity_map = {
        "Rare": GiftTier.rare,
        "Epic": GiftTier.epic,
        "Legendary": GiftTier.legendary,
        "Mythic": GiftTier.mythical,
        "Divine": GiftTier.ultra_premium,
    }
    return rarity_map.get(str(rarity or ""), GiftTier.simple)


def starter_candidates(
    root: Path | None = None, *, limit: int | None = None
) -> list[StarterCandidate]:
    library = root or gift_library_root()
    catalog = _catalog_by_slug(library)
    candidates: list[StarterCandidate] = []
    for slug in READY_STARTER_SLUGS[:limit]:
        gift_dir = library / slug
        spec = _read_json(gift_dir / "spec.json")
        metadata_path = gift_dir / "metadata.json"
        metadata = _read_json(metadata_path) if metadata_path.is_file() else {}
        entry = catalog.get(slug, {})
        duration_ms = int(
            metadata.get("duration_ms") or spec.get("duration_ms") or entry.get("duration_ms")
        )
        form_family = str(spec.get("form_family") or entry.get("form_family") or "procedural_lumen")
        vfx_family = str(spec.get("vfx_family") or entry.get("vfx_family") or "lumen_motes")
        api_tier = str(
            metadata.get("api_tier") or spec.get("api_tier") or entry.get("api_tier") or ""
        )
        candidates.append(
            StarterCandidate(
                slug=slug,
                name=str(metadata.get("name") or spec.get("name") or entry.get("name") or slug),
                description=(
                    "Sandbox/staging Lumen starter gift based on the "
                    f"{form_family.replace('_', ' ')} "
                    f"concept with procedural {vfx_family.replace('_', ' ')} motion."
                ),
                price_minor=int(
                    metadata.get("price_minor") or spec.get("price_minor") or entry.get("cost")
                ),
                tier=_tier(
                    api_tier,
                    str(metadata.get("rarity") or spec.get("rarity") or entry.get("rarity") or ""),
                ),
                duration_ms=min(duration_ms, 15_000),
                form_family=form_family,
                vfx_family=vfx_family,
                source_status=str(spec.get("status") or entry.get("status") or "SPEC_ONLY"),
            )
        )
    return candidates


def _starter_assets(candidate: StarterCandidate) -> list[SeedAsset]:
    shader_id = _stable_uuid(candidate.slug, "starter-shader")
    particle_id = _stable_uuid(candidate.slug, "starter-particles")
    fallback_id = _stable_uuid(candidate.slug, "starter-runtime")
    return [
        SeedAsset(
            id=fallback_id,
            role="runtime_config",
            object_key=f"seed/{READY_STARTER_COLLECTION_SLUG}/{candidate.slug}/runtime-config.json",
            content_type="application/json",
            platform=GiftAssetPlatform.universal,
            quality_tier=GiftQualityTier.low,
            payload=_asset_payload(
                candidate.slug,
                "runtime_config",
                {
                    "form_family": candidate.form_family,
                    "duration_ms": candidate.duration_ms,
                    "reduced_motion": True,
                    "no_audio": True,
                },
            ),
        ),
        SeedAsset(
            id=particle_id,
            role="particle_config",
            object_key=f"seed/{READY_STARTER_COLLECTION_SLUG}/{candidate.slug}/particles.json",
            content_type="application/json",
            platform=GiftAssetPlatform.universal,
            quality_tier=GiftQualityTier.medium,
            payload=_asset_payload(
                candidate.slug,
                "particle_config",
                {
                    "vfx_family": candidate.vfx_family,
                    "max_particles": 180,
                    "spawn_rate_per_second": 24,
                    "deterministic_seed": (
                        _stable_uuid(candidate.slug, "particle-seed").int % 2_147_483_647
                    ),
                },
            ),
        ),
        SeedAsset(
            id=shader_id,
            role="shader_config",
            object_key=f"seed/{READY_STARTER_COLLECTION_SLUG}/{candidate.slug}/shader.json",
            content_type="application/json",
            platform=GiftAssetPlatform.universal,
            quality_tier=GiftQualityTier.medium,
            payload=_asset_payload(
                candidate.slug,
                "shader_config",
                {
                    "material": "soft_lumen_gradient",
                    "instruction_count": 96,
                    "palette": ["#9BE7FF", "#F7D77A", "#F6A6FF"],
                },
            ),
        ),
    ]


def starter_runtime_manifest(candidate: StarterCandidate) -> tuple[dict[str, Any], list[SeedAsset]]:
    assets = _starter_assets(candidate)
    asset_by_role = {asset.role: asset for asset in assets}
    fallback_id = asset_by_role["runtime_config"].id
    particle_id = asset_by_role["particle_config"].id
    shader_id = asset_by_role["shader_config"].id
    duration_ms = candidate.duration_ms
    particle_seed = _stable_uuid(candidate.slug, "manifest-particles").int % 2_147_483_647
    manifest = RuntimeManifest(
        schema_version="1.0",
        renderer_targets=["threejs", "flutter"],
        animation_tier="starter",
        particle_hints={
            "quality_note": "procedural starter-pack art; not final premium art",
            "vfx_family": candidate.vfx_family,
            "max_particles": 180,
            "spawn_rate_per_second": 24,
            "deterministic_seed": particle_seed,
        },
        duration_ms=duration_ms,
        assets=[{"asset_id": asset.id, "role": asset.role} for asset in assets],
        layers=[
            {
                "kind": "text",
                "name": "gift_title",
                "localization_key": f"gift.{candidate.slug}.title",
                "transform": {
                    "position": {"x": 0, "y": 0.25, "z": 0},
                    "rotation_degrees": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                },
            }
        ],
        timelines=[
            {
                "name": "main",
                "duration_ms": duration_ms,
                "loop": False,
                "tracks": [
                    {
                        "target": "gift_title",
                        "property": "opacity",
                        "keyframes": [
                            {"time_ms": 0, "value": 0.0, "easing": "ease_out"},
                            {"time_ms": min(600, duration_ms), "value": 1.0, "easing": "ease_out"},
                            {"time_ms": duration_ms, "value": 0.0, "easing": "ease_in"},
                        ],
                    },
                    {
                        "target": "gift_title",
                        "property": "scale",
                        "keyframes": [
                            {"time_ms": 0, "value": 0.86, "easing": "ease_out"},
                            {"time_ms": duration_ms, "value": 1.08, "easing": "ease_in_out"},
                        ],
                    },
                ],
            }
        ],
        particle_systems=[
            {
                "name": f"starter_{candidate.vfx_family}",
                "max_particles": 180,
                "spawn_rate_per_second": 24,
                "texture_asset_id": None,
                "deterministic_seed": particle_seed,
            }
        ],
        shaders=[
            {
                "name": "soft_lumen_gradient",
                "shader_asset_id": shader_id,
                "instruction_count": 96,
                "texture_asset_ids": [particle_id],
            }
        ],
        lighting=[
            {"kind": "ambient", "color_hex": "#101820", "intensity": 0.45},
            {
                "kind": "directional",
                "color_hex": "#FFF2D8",
                "intensity": 1.6,
                "position": {"x": 2, "y": 4, "z": 3},
            },
        ],
        audio=[],
        interaction_hooks=[
            {"hook": "arrival", "action": "sylora.gift.play"},
            {"hook": "completion", "action": "sylora.gift.complete"},
            {"hook": "tap", "action": "sylora.gift.replay"},
        ],
        combinations=[
            {
                "combination_id": f"sylora.gift.{candidate.slug}",
                "compatible_combination_ids": ["sylora.gift.combo.any"],
                "window_seconds": 120,
            }
        ],
        procedural_parameters=[
            {"name": "seed", "source": "deterministic", "value_type": "seed"},
            {
                "name": "accent_color",
                "source": "deterministic",
                "value_type": "color",
                "allowed_values": ["#9BE7FF", "#F7D77A", "#F6A6FF"],
            },
        ],
        effects=[{"name": f"{candidate.slug}_starter", "scope": "viewer", "timeline_name": "main"}],
        fallbacks={
            "low_end_asset_id": fallback_id,
            "reduced_motion_asset_id": fallback_id,
            "no_audio_asset_id": fallback_id,
        },
        quality_budgets={
            "max_download_bytes": 100_000,
            "max_duration_ms": max(duration_ms, 3_000),
            "max_particles": 180,
            "max_shader_instructions": 128,
            "max_audio_peak_dbfs": -1,
        },
    ).model_dump(mode="json")
    return manifest, assets


def _built_asset_for_role(
    gift_dir: Path, slug: str, asset_id: uuid.UUID, role: str
) -> SeedAsset | None:
    role_files: dict[str, tuple[Path, str, GiftQualityTier]] = {
        "primary_model": (gift_dir / "model.glb", "model/gltf-binary", GiftQualityTier.medium),
        "low_end_fallback": (gift_dir / "model.glb", "model/gltf-binary", GiftQualityTier.low),
        "primary_audio": (gift_dir / "sound" / "main.wav", "audio/wav", GiftQualityTier.medium),
        "poster": (gift_dir / "poster.png", "image/png", GiftQualityTier.medium),
    }
    role_file = role_files.get(role)
    if role_file is None:
        return None
    path, content_type, quality_tier = role_file
    if not path.is_file():
        return None
    return SeedAsset(
        id=asset_id,
        role=role,
        object_key=f"gift-library/{slug}/{role}/{path.relative_to(gift_dir).as_posix()}",
        content_type=content_type,
        platform=GiftAssetPlatform.universal,
        quality_tier=quality_tier,
        payload=path.read_bytes(),
    )


def built_runtime_manifest(
    candidate: StarterCandidate, root: Path
) -> tuple[dict[str, Any], list[SeedAsset]] | None:
    gift_dir = root / candidate.slug
    manifest_path = gift_dir / "runtime-manifest.json"
    if not manifest_path.is_file():
        return None
    raw = _read_json(manifest_path)
    raw.pop("source_metadata", None)
    assets_by_id: dict[uuid.UUID, SeedAsset] = {}
    for reference in raw.get("assets", []):
        asset_id = uuid.UUID(str(reference["asset_id"]))
        role = str(reference["role"])
        seed_asset = _built_asset_for_role(gift_dir, candidate.slug, asset_id, role)
        if seed_asset is None:
            return None
        existing = assets_by_id.get(asset_id)
        if existing is None or seed_asset.quality_tier == GiftQualityTier.low:
            assets_by_id[asset_id] = seed_asset

    total_bytes = sum(asset.byte_size for asset in assets_by_id.values())
    budgets = dict(raw.get("quality_budgets") or {})
    budgets["max_download_bytes"] = max(int(budgets.get("max_download_bytes") or 1), total_bytes)
    raw["quality_budgets"] = budgets
    particle_systems = list(raw.get("particle_systems") or [])
    raw["animation_tier"] = "starter"
    raw["particle_hints"] = {
        "quality_note": "procedural starter-pack art; not final premium art",
        "vfx_family": candidate.vfx_family,
        "asset_mode": "built_assets",
        "max_particles": sum(int(item.get("max_particles") or 0) for item in particle_systems),
        "spawn_rate_per_second": sum(
            int(item.get("spawn_rate_per_second") or 0) for item in particle_systems
        ),
    }
    manifest = RuntimeManifest.model_validate(raw).model_dump(mode="json")
    return manifest, list(assets_by_id.values())


def seed_runtime_manifest(
    candidate: StarterCandidate, root: Path
) -> tuple[dict[str, Any], list[SeedAsset], str]:
    built = built_runtime_manifest(candidate, root)
    if built is not None:
        manifest, assets = built
        return manifest, assets, "built_assets"
    manifest, assets = starter_runtime_manifest(candidate)
    return manifest, assets, "procedural_starter"


async def _ensure_seed_author(db: AsyncSession) -> User:
    author = await db.scalar(select(User).where(User.email == READY_STARTER_SYSTEM_EMAIL))
    if author is not None:
        return author
    author = User(
        email=READY_STARTER_SYSTEM_EMAIL,
        password_hash=hash_password(f"ready-gifts-{uuid.uuid4()}"),
        status=UserStatus.active,
        email_verified_at=utcnow(),
    )
    author.profile = Profile(display_name="SYLORA Ready Gift System", handle="sylora-ready-gifts")
    author.settings = AccountSettings()
    db.add(author)
    await db.flush()
    creator_role = await db.scalar(select(Role).where(Role.name == "creator"))
    if creator_role is not None:
        db.add(UserRole(user_id=author.id, role_id=creator_role.id))
    return author


async def _ensure_category(db: AsyncSession, author: User) -> GiftCategory:
    category = await db.scalar(
        select(GiftCategory).where(GiftCategory.slug == READY_STARTER_CATEGORY_SLUG)
    )
    if category is None:
        category = GiftCategory(
            slug=READY_STARTER_CATEGORY_SLUG,
            name="Official Gift Library",
            description="SYLORA official originals and honest sandbox starter gifts",
            created_by_id=author.id,
        )
        db.add(category)
        await db.flush()
    else:
        category.active = True
        category.description = "SYLORA official originals and honest sandbox starter gifts"
    return category


async def _ensure_collection(db: AsyncSession, author: User) -> GiftCollection:
    collection = await db.scalar(
        select(GiftCollection).where(GiftCollection.slug == READY_STARTER_COLLECTION_SLUG)
    )
    if collection is None:
        collection = GiftCollection(
            slug=READY_STARTER_COLLECTION_SLUG,
            name="Lumen Starter Pack",
            description=(
                "Sandbox/staging READY gifts backed by strict procedural runtime manifests."
            ),
            active=True,
            created_by_id=author.id,
        )
        db.add(collection)
        await db.flush()
    else:
        collection.active = True
        collection.description = (
            "Sandbox/staging READY gifts backed by strict procedural runtime manifests."
        )
    return collection


async def _ensure_collection_item(
    db: AsyncSession,
    collection: GiftCollection,
    gift: GiftDefinition,
    desired_position: int,
) -> None:
    existing = await db.scalar(
        select(GiftCollectionItem).where(
            GiftCollectionItem.collection_id == collection.id,
            GiftCollectionItem.gift_definition_id == gift.id,
        )
    )
    if existing is not None:
        return
    occupied = await db.scalar(
        select(GiftCollectionItem).where(
            GiftCollectionItem.collection_id == collection.id,
            GiftCollectionItem.position == desired_position,
        )
    )
    position = desired_position
    if occupied is not None:
        position = int(
            await db.scalar(
                select(func.coalesce(func.max(GiftCollectionItem.position), -1)).where(
                    GiftCollectionItem.collection_id == collection.id
                )
            )
            or -1
        ) + 1
    db.add(
        GiftCollectionItem(
            collection_id=collection.id,
            gift_definition_id=gift.id,
            position=position,
        )
    )


async def _ensure_assets(db: AsyncSession, version: GiftVersion, assets: list[SeedAsset]) -> None:
    for seed_asset in assets:
        existing = await db.get(GiftAsset, seed_asset.id)
        if existing is not None:
            if existing.gift_version_id != version.id:
                raise RuntimeError(
                    f"Seed asset {seed_asset.id} already belongs to another gift version"
                )
            continue
        db.add(
            GiftAsset(
                id=seed_asset.id,
                gift_version_id=version.id,
                object_key=seed_asset.object_key,
                content_type=seed_asset.content_type,
                byte_size=seed_asset.byte_size,
                sha256=seed_asset.sha256,
                platform=seed_asset.platform,
                quality_tier=seed_asset.quality_tier,
                state=GiftAssetState.verified,
                verified_at=utcnow(),
            )
        )


async def _matching_published_version(
    db: AsyncSession, gift: GiftDefinition, manifest: dict[str, Any]
) -> GiftVersion | None:
    versions = list(
        (
            await db.scalars(
                select(GiftVersion).where(
                    GiftVersion.gift_definition_id == gift.id,
                    GiftVersion.state == GiftLifecycle.published,
                )
            )
        ).all()
    )
    for version in versions:
        if version.runtime_manifest == manifest:
            return version
    return None


async def _next_version_number(db: AsyncSession, gift: GiftDefinition) -> int:
    return (
        int(
            await db.scalar(
                select(func.coalesce(func.max(GiftVersion.version_number), 0)).where(
                    GiftVersion.gift_definition_id == gift.id
                )
            )
            or 0
        )
        + 1
    )


async def seed_ready_starter_gifts(
    db: AsyncSession,
    *,
    root: Path | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    """Publish honest sandbox/staging READY starter gifts through the API runtime gate."""

    library = root or gift_library_root()
    candidates = starter_candidates(library, limit=limit)
    author = await _ensure_seed_author(db)
    category = await _ensure_category(db, author)
    collection = await _ensure_collection(db, author)
    results: list[dict[str, Any]] = []
    created_versions = 0
    already_published = 0

    for position, candidate in enumerate(candidates):
        manifest, assets, asset_mode = seed_runtime_manifest(candidate, library)
        gift = await db.scalar(select(GiftDefinition).where(GiftDefinition.slug == candidate.slug))
        if gift is None:
            gift = GiftDefinition(
                author_user_id=author.id,
                category_id=category.id,
                slug=candidate.slug,
                name=candidate.name,
                description=candidate.description,
                price_minor=candidate.price_minor,
                creator_revenue_share_bps=7000,
                tier=candidate.tier,
                state=GiftLifecycle.draft,
                search_tags=[
                    "starter",
                    "lumen",
                    "sandbox",
                    candidate.form_family.replace("_", "-")[:40],
                    candidate.vfx_family.replace("_", "-")[:40],
                ],
                locale_metadata={
                    "en": candidate.name,
                    "quality_pack": "lumen_starter",
                    "ready_scope": "sandbox_staging",
                    "source_status": candidate.source_status,
                    "asset_mode": asset_mode,
                },
            )
            db.add(gift)
            await db.flush()
        else:
            gift.category_id = category.id
            gift.name = candidate.name
            gift.description = candidate.description
            gift.price_minor = candidate.price_minor
            gift.creator_revenue_share_bps = 7000
            gift.tier = candidate.tier
            gift.available_from = None
            gift.available_until = None
            gift.supply_cap = None
            gift.per_user_limit = None
            gift.required_subscription_tier = None
            gift.minimum_level = None
            gift.required_achievement = None
            gift.required_event = None
            gift.search_tags = [
                "starter",
                "lumen",
                "sandbox",
                candidate.form_family.replace("_", "-")[:40],
                candidate.vfx_family.replace("_", "-")[:40],
            ]
            gift.locale_metadata = {
                "en": candidate.name,
                "quality_pack": "lumen_starter",
                "ready_scope": "sandbox_staging",
                "source_status": candidate.source_status,
                "asset_mode": asset_mode,
            }

        version = await _matching_published_version(db, gift, manifest)
        checks: list[str]
        if version is None:
            version = GiftVersion(
                gift_definition_id=gift.id,
                version_number=await _next_version_number(db, gift),
                state=GiftLifecycle.review,
                runtime_manifest=manifest,
                created_by_id=author.id,
                submitted_by_id=author.id,
                reviewed_by_id=author.id,
                submitted_at=utcnow(),
            )
            db.add(version)
            await db.flush()
            await _ensure_assets(db, version, assets)
            await db.flush()
            checks = await validate_publishable_version(db, version)
            version.state = GiftLifecycle.published
            version.published_at = utcnow()
            created_versions += 1
            seed_status = "published"
        else:
            await _ensure_assets(db, version, assets)
            checks = ["already_published"]
            already_published += 1
            seed_status = "already_published"

        gift.state = GiftLifecycle.published
        gift.retired_at = None
        gift.updated_at = utcnow()
        await _ensure_collection_item(db, collection, gift, position)
        results.append(
            {
                "slug": candidate.slug,
                "gift_id": str(gift.id),
                "version_id": str(version.id),
                "status": seed_status,
                "tier": candidate.tier.value,
                "price_minor": candidate.price_minor,
                "asset_mode": asset_mode,
                "checks": checks,
            }
        )

    await db.commit()
    asset_modes = {str(item["asset_mode"]) for item in results}
    return {
        "ready_count": len(results),
        "created_versions": created_versions,
        "already_published": already_published,
        "category": READY_STARTER_CATEGORY_SLUG,
        "collection": READY_STARTER_COLLECTION_SLUG,
        "asset_mode": next(iter(asset_modes)) if len(asset_modes) == 1 else "mixed",
        "gifts": results,
    }
