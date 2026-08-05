"""Bootstrap soft-ping gift for public test stands (no S3 required)."""

from __future__ import annotations

import hashlib
import secrets
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gift_models import (
    GiftAsset,
    GiftAssetPlatform,
    GiftAssetState,
    GiftCategory,
    GiftDefinition,
    GiftLifecycle,
    GiftQualityTier,
    GiftTier,
    GiftVersion,
)
from app.gift_schemas import RuntimeManifest
from app.models import Role, User, UserRole, UserStatus
from app.security import hash_password, utcnow

logger = logging.getLogger(__name__)

SYSTEM_EMAIL = "soft-ping-system@sylora.stand.local"


def _artifact_roots() -> list[Path]:
    roots: list[Path] = []
    env_root = os.environ.get("STAND_ARTIFACTS_ROOT")
    if env_root:
        roots.append(Path(env_root))
    roots.append(Path(__file__).resolve().parents[3] / "artifacts" / "sylora-gift-100-originals")
    roots.append(Path("/artifacts/sylora-gift-100-originals"))
    return roots


def _soft_paths() -> tuple[Path, Path] | None:
    for root in _artifact_roots():
        soft = root / "soft-ping"
        seed = root / "seed.json"
        if soft.is_dir() and seed.is_file():
            return soft, seed
    return None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def _soft_ping_manifest(
    soft: Path, glb_id: uuid.UUID, audio_id: uuid.UUID, poster_id: uuid.UUID
) -> dict[str, Any]:
    raw = json.loads((soft / "runtime-manifest.json").read_text(encoding="utf-8"))
    raw.pop("source_metadata", None)
    blob = json.dumps(raw)
    blob = blob.replace(raw["assets"][0]["asset_id"], str(glb_id))
    blob = blob.replace(
        next(a["asset_id"] for a in raw["assets"] if a["role"] == "primary_audio"),
        str(audio_id),
    )
    blob = blob.replace(
        next(a["asset_id"] for a in raw["assets"] if a["role"] == "poster"),
        str(poster_id),
    )
    manifest = json.loads(blob)
    RuntimeManifest.model_validate(manifest)
    return manifest


async def ensure_soft_ping_catalog(db: AsyncSession) -> dict[str, Any]:
    """Idempotently publish soft-ping into the stand catalog."""
    existing = await db.scalar(select(GiftDefinition).where(GiftDefinition.slug == "soft-ping"))
    if existing is not None and existing.state == GiftLifecycle.published:
        return {"status": "already_published", "gift_id": str(existing.id)}

    paths = _soft_paths()
    if paths is None:
        logger.warning("soft-ping artifacts missing; catalog seed skipped")
        return {"status": "assets_missing"}
    soft, seed_path = paths

    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    soft_entry = next(g for g in seed["gifts"] if g["slug"] == "soft-ping")
    payload = dict(soft_entry["definition_payload"])

    author = await db.scalar(select(User).where(User.email == SYSTEM_EMAIL))
    if author is None:
        from app.models import AccountSettings, Profile

        author = User(
            email=SYSTEM_EMAIL,
            password_hash=hash_password(f"stand-{uuid.uuid4()}"),
            status=UserStatus.active,
            email_verified_at=utcnow(),
        )
        author.profile = Profile(display_name="SYLORA Gift System", handle="sylora-gifts")
        author.settings = AccountSettings()
        db.add(author)
        await db.flush()
        creator_role = await db.scalar(select(Role).where(Role.name == "creator"))
        if creator_role is not None:
            db.add(UserRole(user_id=author.id, role_id=creator_role.id))

    category = await db.scalar(
        select(GiftCategory).where(GiftCategory.slug == "official-gift-library")
    )
    if category is None:
        category = GiftCategory(
            slug="official-gift-library",
            name="Official Gift Library",
            description="SYLORA official originals for public stand testing",
            created_by_id=author.id,
        )
        db.add(category)
        await db.flush()

    if existing is None:
        gift = GiftDefinition(
            author_user_id=author.id,
            category_id=category.id,
            slug="soft-ping",
            name=str(payload.get("name", "Soft Ping")),
            description=str(payload.get("description", "SYLORA soft-ping test gift")),
            price_minor=int(payload.get("price_minor", 10)),
            creator_revenue_share_bps=int(payload.get("creator_revenue_share_bps", 7000)),
            tier=GiftTier(payload.get("tier", "rare")),
            state=GiftLifecycle.draft,
            search_tags=list(payload.get("search_tags") or ["soft-ping", "stand"]),
            locale_metadata=dict(payload.get("locale_metadata") or {}),
        )
        db.add(gift)
        await db.flush()
    else:
        gift = existing

    glb_id = uuid.uuid4()
    audio_id = uuid.uuid4()
    poster_id = uuid.uuid4()
    manifest = _soft_ping_manifest(soft, glb_id, audio_id, poster_id)

    next_version = (
        int(
            (
                await db.scalar(
                    select(func.coalesce(func.max(GiftVersion.version_number), 0)).where(
                        GiftVersion.gift_definition_id == gift.id
                    )
                )
            )
            or 0
        )
        + 1
    )

    version = GiftVersion(
        gift_definition_id=gift.id,
        version_number=next_version,
        state=GiftLifecycle.published,
        runtime_manifest=manifest,
        published_at=utcnow(),
        created_by_id=author.id,
        reviewed_by_id=author.id,
        submitted_by_id=author.id,
        submitted_at=utcnow(),
    )
    db.add(version)
    await db.flush()

    glb = soft / "model.glb"
    wav = soft / "sound" / "main.wav"
    poster = soft / "poster.png"
    for asset_id, path, content_type, tier in (
        (glb_id, glb, "model/gltf-binary", GiftQualityTier.low),
        (audio_id, wav, "audio/wav", GiftQualityTier.medium),
        (poster_id, poster, "image/png", GiftQualityTier.medium),
    ):
        if not path.is_file():
            raise FileNotFoundError(f"soft-ping asset missing: {path}")
        db.add(
            GiftAsset(
                id=asset_id,
                gift_version_id=version.id,
                object_key=f"stand/soft-ping/{version.id}/{path.name}",
                content_type=content_type,
                byte_size=path.stat().st_size,
                sha256=_sha256(path),
                platform=GiftAssetPlatform.universal,
                quality_tier=tier,
                state=GiftAssetState.verified,
                verified_at=utcnow(),
            )
        )

    gift.state = GiftLifecycle.published
    gift.updated_at = utcnow()
    await db.commit()
    logger.info("soft-ping catalog seeded for public stand gift_id=%s", gift.id)
    return {"status": "published", "gift_id": str(gift.id), "version_id": str(version.id)}



WELCOME_EMAIL = "aura.world@sylora.stand.local"
WELCOME_HANDLE = "aura"
WELCOME_POSTS = (
    (
        "welcome-aura-001",
        "Привіт. Я Aura — жива супутниця SYLORA. Напиши мені як людині: я слухаю, памʼятаю і залишаюсь поруч.",
    ),
    (
        "welcome-live-002",
        "Ефір — серце SYLORA. Вийди на сцену одним дотиком. Я можу бути співведучою: чат, подарунки, тепло залу.",
    ),
    (
        "welcome-create-003",
        "Твій світ чекає першого сигналу. Поділись думкою, знайди людей, увімкни музику — і нехай усе відчувається живим.",
    ),
    (
        "welcome-en-004",
        "Welcome to SYLORA. Talk to Aura, go Live, find people — one premium world where AI meets soul.",
    ),
)


async def ensure_welcome_world(db: AsyncSession) -> dict[str, Any]:
    """Idempotent public feed so Home is never a dead planet on the stand."""
    from app.models import AccountSettings, Profile
    from app.social_models import Post, PostKind, PostLifecycle, PostVisibility

    user = await db.scalar(select(User).where(User.email == WELCOME_EMAIL))
    if user is None:
        user = User(
            email=WELCOME_EMAIL,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            status=UserStatus.active,
            email_verified_at=utcnow(),
        )
        user.profile = Profile(display_name="Aura", handle=WELCOME_HANDLE, locale="uk")
        user.settings = AccountSettings(profile_visibility="public")
        db.add(user)
        await db.flush()
        role = await db.scalar(select(Role).where(Role.name == "creator"))
        if role is not None:
            db.add(UserRole(user_id=user.id, role_id=role.id))
    else:
        if user.profile is None:
            user.profile = Profile(display_name="Aura", handle=WELCOME_HANDLE, locale="uk")
        elif user.profile.handle is None:
            user.profile.handle = WELCOME_HANDLE
        if user.settings is None:
            user.settings = AccountSettings(profile_visibility="public")
        else:
            user.settings.profile_visibility = "public"

    created = 0
    now = utcnow()
    for key, body in WELCOME_POSTS:
        # Deterministic UUID from key so re-runs are idempotent.
        post_id = uuid.uuid5(uuid.NAMESPACE_URL, f"sylora:welcome:{key}")
        exists = await db.get(Post, post_id)
        if exists is not None:
            continue
        db.add(
            Post(
                id=post_id,
                author_id=user.id,
                kind=PostKind.text,
                body=body,
                media_references=[],
                visibility=PostVisibility.public,
                lifecycle=PostLifecycle.published,
                published_at=now,
                category="welcome",
            )
        )
        created += 1
    await db.commit()
    logger.info("welcome world seeded posts_created=%s author=%s", created, user.id)
    return {"status": "ok", "created": created, "author_id": str(user.id)}
