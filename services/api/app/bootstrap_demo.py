"""Local development bootstrap for friend/demo testing.

Creates verified accounts, roles, credits, monetization, and one published
low-tier Lottie gift with a PNG sprite primary. Development environment only.
"""

from __future__ import annotations

import hashlib
import json
import uuid
import zlib
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings
from app.gift_models import (
    CreatorMonetizationSetting,
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
from app.ledger_models import LedgerAccountType, LedgerSide, LedgerTransactionType
from app.ledger_schemas import LedgerPosting
from app.ledger_service import post_transaction, system_account, user_account
from app.models import AccountSettings, Profile, Role, User, UserRole, UserStatus
from app.security import hash_password, utcnow
from app.storage import S3ObjectStorage

DEMO_PASSWORD = "SyloraDemo2026!"


@dataclass(frozen=True)
class DemoAccount:
    email: str
    display_name: str
    handle: str
    roles: tuple[str, ...]
    credits_minor: int
    enable_gift_monetization: bool = False


ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount(
        email="admin@example.com",
        display_name="SYLORA Admin",
        handle="sylora_admin",
        roles=("admin", "creator", "moderator"),
        credits_minor=1_000_000,
        enable_gift_monetization=True,
    ),
    DemoAccount(
        email="creator@example.com",
        display_name="Demo Creator",
        handle="demo_creator",
        roles=("creator",),
        credits_minor=250_000,
        enable_gift_monetization=True,
    ),
    DemoAccount(
        email="sender@example.com",
        display_name="Gift Sender",
        handle="gift_sender",
        roles=("user",),
        credits_minor=500_000,
    ),
    DemoAccount(
        email="viewer@example.com",
        display_name="Demo Viewer",
        handle="demo_viewer",
        roles=("user",),
        credits_minor=50_000,
    ),
)


def _png_bytes(width: int = 64, height: int = 64) -> bytes:
    """Generate a tiny solid coral PNG without external dependencies."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            len(data).to_bytes(4, "big")
            + tag
            + data
            + zlib.crc32(tag + data).to_bytes(4, "big")
        )

    raw = b""
    for _y in range(height):
        raw += b"\x00"
        for _x in range(width):
            raw += b"\xff\x6b\x4a\xff"  # coral RGBA
    ihdr = width.to_bytes(4, "big") + height.to_bytes(4, "big") + b"\x08\x06\x00\x00\x00"
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def _lottie_bytes() -> bytes:
    """Minimal self-contained heart-pulse Lottie JSON (no external assets)."""
    payload = {
        "v": "5.7.4",
        "fr": 30,
        "ip": 0,
        "op": 60,
        "w": 256,
        "h": 256,
        "nm": "Sylora Demo Heart",
        "ddd": 0,
        "assets": [],
        "layers": [
            {
                "ddd": 0,
                "ind": 1,
                "ty": 4,
                "nm": "Heart",
                "sr": 1,
                "ks": {
                    "o": {"a": 0, "k": 100},
                    "r": {"a": 0, "k": 0},
                    "p": {"a": 0, "k": [128, 128, 0]},
                    "a": {"a": 0, "k": [0, 0, 0]},
                    "s": {
                        "a": 1,
                        "k": [
                            {"t": 0, "s": [80, 80, 100], "e": [110, 110, 100]},
                            {"t": 30, "s": [110, 110, 100], "e": [80, 80, 100]},
                            {"t": 60, "s": [80, 80, 100]},
                        ],
                    },
                },
                "ao": 0,
                "shapes": [
                    {
                        "ty": "el",
                        "p": {"a": 0, "k": [0, 0]},
                        "s": {"a": 0, "k": [120, 120]},
                    },
                    {
                        "ty": "fl",
                        "c": {"a": 0, "k": [1, 0.42, 0.29, 1]},
                        "o": {"a": 0, "k": 100},
                        "r": 1,
                    },
                ],
                "ip": 0,
                "op": 60,
                "st": 0,
                "bm": 0,
            }
        ],
    }
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


async def _ensure_user(
    db: AsyncSession,
    account: DemoAccount,
    roles_by_name: dict[str, Role],
) -> User:
    user = await db.scalar(select(User).where(User.email == account.email))
    if user is None:
        user = User(
            email=account.email,
            password_hash=hash_password(DEMO_PASSWORD),
            status=UserStatus.active,
            email_verified_at=utcnow(),
        )
        user.profile = Profile(
            display_name=account.display_name,
            handle=account.handle,
            locale="en",
        )
        user.settings = AccountSettings()
        db.add(user)
        await db.flush()
    else:
        user.password_hash = hash_password(DEMO_PASSWORD)
        user.status = UserStatus.active
        user.email_verified_at = user.email_verified_at or utcnow()
        profile = await db.get(Profile, user.id)
        if profile is None:
            user.profile = Profile(
                display_name=account.display_name,
                handle=account.handle,
                locale="en",
            )
        else:
            profile.display_name = account.display_name
            profile.handle = account.handle
        settings_row = await db.get(AccountSettings, user.id)
        if settings_row is None:
            user.settings = AccountSettings()
        await db.flush()

    existing_role_ids = {
        role_id
        for role_id in (
            await db.scalars(select(UserRole.role_id).where(UserRole.user_id == user.id))
        ).all()
    }
    for role_name in account.roles:
        role = roles_by_name[role_name]
        if role.id not in existing_role_ids:
            db.add(UserRole(user_id=user.id, role_id=role.id))
    await db.flush()
    return user


async def _issue_credits(
    db: AsyncSession,
    *,
    actor_id: uuid.UUID,
    user_id: uuid.UUID,
    amount_minor: int,
    key: str,
) -> None:
    issuance = await system_account(db, "system:platform_issuance")
    wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
    await post_transaction(
        db,
        transaction_type=LedgerTransactionType.issuance,
        actor_user_id=actor_id,
        idempotency_scope=f"demo-issuance:{user_id}",
        idempotency_key=key,
        postings=[
            LedgerPosting(
                account_id=issuance.id,
                side=LedgerSide.debit,
                amount_minor=amount_minor,
            ),
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.credit,
                amount_minor=amount_minor,
            ),
        ],
        metadata={"reason": "local demo bootstrap", "demo": True},
    )


async def _ensure_demo_gift(
    db: AsyncSession,
    storage: S3ObjectStorage,
    *,
    author: User,
) -> dict[str, Any]:
    existing = await db.scalar(
        select(GiftDefinition).where(GiftDefinition.slug == "demo-heart")
    )
    if existing is not None and existing.state == GiftLifecycle.published:
        version = await db.scalar(
            select(GiftVersion)
            .where(
                GiftVersion.gift_definition_id == existing.id,
                GiftVersion.state == GiftLifecycle.published,
            )
            .order_by(GiftVersion.version_number.desc())
        )
        return {
            "gift_id": str(existing.id),
            "slug": existing.slug,
            "version_id": str(version.id) if version else None,
            "status": "already_published",
        }

    png = _png_bytes()
    lottie = _lottie_bytes()
    png_sha = hashlib.sha256(png).hexdigest()
    lottie_sha = hashlib.sha256(lottie).hexdigest()
    png_id = uuid.uuid4()
    lottie_id = uuid.uuid4()
    category_id = uuid.uuid4()
    gift_id = existing.id if existing is not None else uuid.uuid4()
    version_id = uuid.uuid4()

    png_key = f"gifts/{gift_id}/versions/{version_id}/demo-heart.png"
    lottie_key = f"gifts/{gift_id}/versions/{version_id}/demo-heart.json"
    await storage.put_bytes(object_key=png_key, content_type="image/png", content=png)
    await storage.put_bytes(
        object_key=lottie_key, content_type="application/json", content=lottie
    )

    if existing is None:
        db.add(
            GiftCategory(
                id=category_id,
                slug="demo",
                name="Demo",
                created_by_id=author.id,
            )
        )
        await db.flush()
        db.add(
            GiftDefinition(
                id=gift_id,
                author_user_id=author.id,
                category_id=category_id,
                slug="demo-heart",
                name="Demo Heart",
                description=(
                    "Local demo gift: PNG sprite primary with Lottie fallback. "
                    "Not an AAA CGI asset."
                ),
                price_minor=100,
                creator_revenue_share_bps=7000,
                tier=GiftTier.simple,
                state=GiftLifecycle.published,
                search_tags=["demo", "heart", "lottie"],
                locale_metadata={
                    "en": "Demo Heart",
                    "uk": "Демо серце",
                    "pl": "Demo Serce",
                    "de": "Demo Herz",
                    "es": "Corazón Demo",
                    "fr": "Cœur Démo",
                    "it": "Cuore Demo",
                    "pt": "Coração Demo",
                },
            )
        )
        await db.flush()
    else:
        category_id = existing.category_id
        gift_id = existing.id
        existing.state = GiftLifecycle.published
        existing.price_minor = 100

    manifest = RuntimeManifest(
        schema_version="1.0",
        renderer_targets=["threejs", "lottie"],
        duration_ms=2_000,
        assets=[
            {"asset_id": png_id, "role": "primary_sprite"},
            {"asset_id": lottie_id, "role": "low_end_fallback"},
        ],
        layers=[
            {
                "kind": "sprite",
                "name": "heart",
                "asset_id": png_id,
                "billboard": True,
                "transform": {
                    "position": {"x": 0, "y": 0, "z": 0},
                    "rotation_degrees": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                },
            }
        ],
        timelines=[],
        particle_systems=[],
        shaders=[],
        lighting=[],
        audio=[],
        interaction_hooks=[],
        combinations=[],
        procedural_parameters=[],
        effects=[],
        fallbacks={
            "low_end_asset_id": lottie_id,
            "reduced_motion_asset_id": lottie_id,
            "no_audio_asset_id": lottie_id,
        },
        quality_budgets={
            "max_download_bytes": 50_000,
            "max_duration_ms": 3_000,
            "max_particles": 0,
            "max_shader_instructions": 0,
            "max_audio_peak_dbfs": -1,
        },
    )

    db.add(
        GiftVersion(
            id=version_id,
            gift_definition_id=gift_id,
            version_number=1 if existing is None else 2,
            state=GiftLifecycle.published,
            runtime_manifest=manifest.model_dump(mode="json"),
            created_by_id=author.id,
            submitted_by_id=author.id,
            reviewed_by_id=author.id,
            submitted_at=utcnow(),
            published_at=utcnow(),
        )
    )
    await db.flush()
    db.add(
        GiftAsset(
            id=png_id,
            gift_version_id=version_id,
            object_key=png_key,
            content_type="image/png",
            byte_size=len(png),
            sha256=png_sha,
            platform=GiftAssetPlatform.universal,
            quality_tier=GiftQualityTier.high,
            state=GiftAssetState.verified,
            verified_at=utcnow(),
        )
    )
    db.add(
        GiftAsset(
            id=lottie_id,
            gift_version_id=version_id,
            object_key=lottie_key,
            content_type="application/json",
            byte_size=len(lottie),
            sha256=lottie_sha,
            platform=GiftAssetPlatform.universal,
            quality_tier=GiftQualityTier.low,
            state=GiftAssetState.verified,
            verified_at=utcnow(),
        )
    )
    return {
        "gift_id": str(gift_id),
        "slug": "demo-heart",
        "version_id": str(version_id),
        "status": "published",
        "price_minor": 100,
        "animation": "PNG sprite + Lottie fallback (not AAA CGI)",
    }


async def bootstrap_demo(
    session_factory: async_sessionmaker[AsyncSession],
    settings: Settings,
    storage: S3ObjectStorage,
) -> dict[str, Any]:
    if settings.environment != "development":
        raise RuntimeError(
            "bootstrap-demo is allowed only when ENVIRONMENT=development"
        )
    storage.require_configured()

    async with session_factory() as db:
        roles = list((await db.scalars(select(Role))).all())
        roles_by_name = {role.name: role for role in roles}
        for required in ("admin", "creator", "moderator", "user"):
            if required not in roles_by_name:
                raise RuntimeError(
                    f"Required role '{required}' is missing; start the API once first"
                )

        users: dict[str, User] = {}
        for account in ACCOUNTS:
            users[account.email] = await _ensure_user(db, account, roles_by_name)
        await db.flush()

        admin = users["admin@example.com"]
        for account in ACCOUNTS:
            user = users[account.email]
            await _issue_credits(
                db,
                actor_id=admin.id,
                user_id=user.id,
                amount_minor=account.credits_minor,
                key=f"demo-bootstrap-{account.handle}-v2",
            )
            if account.enable_gift_monetization:
                setting = await db.get(CreatorMonetizationSetting, user.id)
                if setting is None:
                    setting = CreatorMonetizationSetting(
                        user_id=user.id, gifts_enabled=True
                    )
                    db.add(setting)
                else:
                    setting.gifts_enabled = True

        gift = await _ensure_demo_gift(
            db, storage, author=users["creator@example.com"]
        )
        await db.commit()

        return {
            "environment": settings.environment,
            "password": DEMO_PASSWORD,
            "accounts": [
                {
                    "email": account.email,
                    "display_name": account.display_name,
                    "handle": account.handle,
                    "user_id": str(users[account.email].id),
                    "roles": list(account.roles),
                    "credits_minor": account.credits_minor,
                    "gift_monetization": account.enable_gift_monetization,
                }
                for account in ACCOUNTS
            ],
            "demo_gift": gift,
            "notes": [
                "Accounts are local demo fixtures for ENVIRONMENT=development only.",
                "Gift animation playback is verified in Gift Studio / gift-runtime, "
                "not in Flutter Web (Flutter shows catalog/commerce, not VFX).",
                "AI chat requires a real provider configured via /v1/admin/ai/providers.",
                "AAA CGI gift libraries are not bundled; see "
                "docs/implementation/AAA_GIFT_PIPELINE.md.",
            ],
        }
