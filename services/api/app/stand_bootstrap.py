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
from sqlalchemy.orm import selectinload

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


async def _load_user_with_profile(db: AsyncSession, *, email: str | None = None, user_id: uuid.UUID | None = None) -> User | None:
    """Async-safe user load — never touch lazy profile/settings without selectinload."""
    stmt = select(User).options(selectinload(User.profile), selectinload(User.settings))
    if user_id is not None:
        stmt = stmt.where(User.id == user_id)
    elif email is not None:
        stmt = stmt.where(User.email == email)
    else:
        return None
    return await db.scalar(stmt)


async def ensure_welcome_world(db: AsyncSession) -> dict[str, Any]:
    """Idempotent public feed so Home is never a dead planet on the stand."""
    from app.models import AccountSettings, Profile
    from app.social_models import Post, PostKind, PostLifecycle, PostVisibility

    user = await _load_user_with_profile(db, email=WELCOME_EMAIL)
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
        # Re-load with relationships for safe access after flush.
        user = await _load_user_with_profile(db, email=WELCOME_EMAIL)
        assert user is not None
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


# ---------------------------------------------------------------------------
# Living platform seed — creators, social, learning, marketplace, business, music
# ---------------------------------------------------------------------------

STAND_NS = uuid.NAMESPACE_URL

DEMO_CREATORS: tuple[tuple[int, str, str, str], ...] = (
    (1, "olena.koval", "Olena Koval", "Live host & community builder from Kyiv."),
    (2, "mark.reid", "Mark Reid", "Music producer and Live BGM curator."),
    (3, "sofia.march", "Sofia March", "Learning designer — courses that feel human."),
    (4, "james.holt", "James Holt", "Digital products & creator commerce."),
    (5, "nina.blake", "Nina Blake", "Business ops and team workspaces."),
)

# Extra public posts beyond welcome (welcome has 4 → total 8–12).
# Prefer Ukrainian; keep one English living-feed post.
LIVING_POSTS: tuple[tuple[str, str, str, str], ...] = (
    (
        "living-aura-music-001",
        "aura",
        "music",
        "Увімкни настрій у Music — спокій, енергія чи нічний орбіт. Я підберу плейлист під твій ефір.",
    ),
    (
        "living-aura-learn-002",
        "aura",
        "learning",
        "Learning у SYLORA — не сухі слайди. Короткі курси від творців, щоб рости поруч із Live і Music.",
    ),
    (
        "living-olena-live-003",
        "olena.koval",
        "live",
        "Сьогодні ввечері виходжу в Live. Заходь — поговоримо про сцену, чат і теплі подарунки залу.",
    ),
    (
        "living-mark-music-004",
        "mark.reid",
        "music",
        "Новий BGM для ефірів уже в каталозі. Royalty-free, щоб сцена звучала чисто.",
    ),
    (
        "living-sofia-learn-005",
        "sofia.march",
        "learning",
        "Опублікувала короткий курс про перший Live на SYLORA — один урок, без зайвого шуму.",
    ),
    (
        "living-james-biz-006",
        "james.holt",
        "business",
        "Marketplace прокидається: цифрові паки для творців. Дивись вітрину — мінімум тесту, максимум користі.",
    ),
    (
        "living-nina-en-007",
        "nina.blake",
        "business",
        "Demo workspace is live for the stand — pipelines, teams, and calm ops without empty dashboards.",
    ),
    (
        "living-olena-create-008",
        "olena.koval",
        "welcome",
        "SYLORA відчувається живою, коли поруч є люди. Підпишись, напиши Aura, увімкни ефір.",
    ),
)


def _stand_uuid(key: str) -> uuid.UUID:
    return uuid.uuid5(STAND_NS, f"sylora:stand:{key}")


async def _ensure_creator_role(db: AsyncSession, user_id: uuid.UUID) -> None:
    role = await db.scalar(select(Role).where(Role.name == "creator"))
    if role is None:
        return
    existing = await db.scalar(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
    )
    if existing is None:
        db.add(UserRole(user_id=user_id, role_id=role.id))


async def _ensure_demo_creators(db: AsyncSession) -> dict[str, Any]:
    from app.models import AccountSettings, Profile

    created = 0
    by_handle: dict[str, uuid.UUID] = {}
    for n, handle, display_name, bio in DEMO_CREATORS:
        email = f"creator.{n}@sylora.stand.local"
        user_id = _stand_uuid(f"creator:{n}")
        user = await _load_user_with_profile(db, user_id=user_id)
        if user is None:
            user = await _load_user_with_profile(db, email=email)
        if user is None:
            handle_taken = await db.scalar(select(Profile).where(Profile.handle == handle))
            if handle_taken is not None:
                by_handle[handle] = handle_taken.user_id
                continue
            user = User(
                id=user_id,
                email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                status=UserStatus.active,
                email_verified_at=utcnow(),
            )
            user.profile = Profile(
                display_name=display_name,
                handle=handle,
                bio=bio,
                locale="uk",
            )
            user.settings = AccountSettings(profile_visibility="public")
            db.add(user)
            await db.flush()
            await _ensure_creator_role(db, user.id)
            user = await _load_user_with_profile(db, user_id=user_id)
            assert user is not None
            created += 1
        else:
            if user.profile is None:
                user.profile = Profile(
                    display_name=display_name, handle=handle, bio=bio, locale="uk"
                )
            else:
                if user.profile.handle is None:
                    user.profile.handle = handle
                if not user.profile.display_name:
                    user.profile.display_name = display_name
            if user.settings is None:
                user.settings = AccountSettings(profile_visibility="public")
            else:
                user.settings.profile_visibility = "public"
            await _ensure_creator_role(db, user.id)
        by_handle[handle] = user.id
    return {"created": created, "handles": by_handle}


async def _ensure_living_posts(
    db: AsyncSession, *, aura_id: uuid.UUID, handles: dict[str, uuid.UUID]
) -> int:
    from app.social_models import Post, PostKind, PostLifecycle, PostVisibility

    authors = {**handles, WELCOME_HANDLE: aura_id}
    created = 0
    now = utcnow()
    for key, handle, category, body in LIVING_POSTS:
        author_id = authors.get(handle)
        if author_id is None:
            continue
        post_id = _stand_uuid(f"post:{key}")
        if await db.get(Post, post_id) is not None:
            continue
        db.add(
            Post(
                id=post_id,
                author_id=author_id,
                kind=PostKind.text,
                body=body,
                media_references=[],
                visibility=PostVisibility.public,
                lifecycle=PostLifecycle.published,
                published_at=now,
                category=category,
            )
        )
        created += 1
    return created


async def _ensure_learning_courses(db: AsyncSession, *, author_id: uuid.UUID) -> dict[str, Any]:
    from app.platform_models import (
        Course,
        CourseModule,
        CourseState,
        CourseVersion,
        Lesson,
        LessonKind,
        SettlementMethod,
    )

    specs = (
        (
            "stand-first-live",
            "live",
            "Перший Live на SYLORA",
            "Короткий старт: сцена, чат і тепло залу без зайвого шуму.",
            ["Відкрити Live", "Привітати зал", "Залишитись у ефірі"],
            "Урок 1: вихід на сцену",
            "Один дотик — і ти в ефірі. Дихай спокійно, вітай людей, дозволь Aura бути поруч.",
        ),
        (
            "stand-creator-rhythm",
            "music",
            "Ритм творця: Music і Live",
            "Як обрати настрій, BGM і залишитись у потоці під час ефіру.",
            ["Обрати mood", "Підключити BGM", "Тримати ритм"],
            "Урок 1: музика як партнер",
            "Music у SYLORA — не фон, а партнер сцени. Обери calm або energy і відчуй різницю.",
        ),
    )
    created = 0
    now = utcnow()
    for slug, category, title, description, objectives, lesson_title, lesson_body in specs:
        course_id = _stand_uuid(f"course:{slug}")
        version_id = _stand_uuid(f"course-version:{slug}:1")
        module_id = _stand_uuid(f"course-module:{slug}:1")
        lesson_id = _stand_uuid(f"course-lesson:{slug}:1")

        course = await db.get(Course, course_id)
        if course is None:
            course = await db.scalar(select(Course).where(Course.slug == slug))
        if course is not None and course.state == CourseState.published:
            continue

        if course is None:
            course = Course(
                id=course_id,
                author_user_id=author_id,
                slug=slug,
                category=category,
                state=CourseState.draft,
                settlement_method=SettlementMethod.free,
                price_minor=None,
            )
            db.add(course)
            await db.flush()
            created += 1

        version = await db.get(CourseVersion, version_id)
        if version is None:
            version = CourseVersion(
                id=version_id,
                course_id=course.id,
                version_number=1,
                state=CourseState.published,
                title=title,
                description=description,
                learning_objectives=list(objectives),
                created_by_id=author_id,
                reviewed_by_id=author_id,
                reviewed_at=now,
                published_at=now,
            )
            db.add(version)
            await db.flush()

        module = await db.get(CourseModule, module_id)
        if module is None:
            module = CourseModule(
                id=module_id,
                course_version_id=version.id,
                title="Старт",
                description="Мінімальний модуль для публічного стенду",
                position=0,
            )
            db.add(module)
            await db.flush()

        if await db.get(Lesson, lesson_id) is None:
            db.add(
                Lesson(
                    id=lesson_id,
                    module_id=module.id,
                    kind=LessonKind.text,
                    title=lesson_title,
                    body=lesson_body,
                    position=0,
                    required=True,
                    required_seconds=0,
                    required_heartbeat_seconds=0,
                )
            )

        course.state = CourseState.published
        course.published_version_id = version.id
        course.updated_at = now

    return {"created": created, "slugs": [s[0] for s in specs]}


async def _ensure_marketplace_products(
    db: AsyncSession, *, owner_id: uuid.UUID
) -> dict[str, Any]:
    from app.platform_models import (
        MarketplaceProduct,
        MarketplaceStore,
        ProductInventory,
        ProductKind,
        ProductPrice,
        ProductState,
        ProductVersion,
        SettlementMethod,
    )

    store_id = _stand_uuid("marketplace-store:stand-creators")
    store = await db.get(MarketplaceStore, store_id)
    if store is None:
        store = await db.scalar(
            select(MarketplaceStore).where(MarketplaceStore.owner_user_id == owner_id)
        )
    if store is None:
        store = MarketplaceStore(
            id=store_id,
            owner_user_id=owner_id,
            slug="stand-creators",
            name="SYLORA Stand Creators",
            description="Demo digital listings for the public test stand.",
            active=True,
        )
        db.add(store)
        await db.flush()
    elif not store.active:
        store.active = True

    products = (
        (
            "soft-stage-pack",
            "gifts",
            "Soft Stage Pack",
            "Міні-пак ідей для теплого старту ефіру: привітання, паузи, soft gifts.",
            "Digital download for stand demo — no physical goods.",
            250,
        ),
        (
            "live-checklist",
            "live",
            "Live Checklist",
            "Короткий чекліст перед виходом у Live: звук, світло, настрій залу.",
            "Instant digital checklist for creators on the stand.",
            150,
        ),
        (
            "creator-mood-notes",
            "music",
            "Creator Mood Notes",
            "Нотатки настроїв Music: calm, energy, night — як тримати ритм сцени.",
            "Digital notes pack for Music + Live pairing.",
            200,
        ),
        (
            "workspace-starter",
            "business",
            "Workspace Starter Kit",
            "Шаблон пайплайну для демо-бізнесу: lead → won без порожніх дашбордів.",
            "Digital starter kit for business workspace demos.",
            300,
        ),
    )
    created = 0
    now = utcnow()
    for slug, category, title, description, terms, amount in products:
        product_id = _stand_uuid(f"product:{slug}")
        version_id = _stand_uuid(f"product-version:{slug}:1")
        price_id = _stand_uuid(f"product-price:{slug}:1")

        product = await db.get(MarketplaceProduct, product_id)
        if product is None:
            product = await db.scalar(
                select(MarketplaceProduct).where(
                    MarketplaceProduct.store_id == store.id,
                    MarketplaceProduct.slug == slug,
                )
            )
        if product is not None and product.state == ProductState.published:
            continue

        if product is None:
            product = MarketplaceProduct(
                id=product_id,
                store_id=store.id,
                slug=slug,
                kind=ProductKind.digital,
                category=category,
                state=ProductState.draft,
            )
            db.add(product)
            await db.flush()
            created += 1

        version = await db.get(ProductVersion, version_id)
        if version is None:
            version = ProductVersion(
                id=version_id,
                product_id=product.id,
                version_number=1,
                state=ProductState.published,
                title=title,
                description=description,
                fulfillment_terms=terms,
                created_by_id=owner_id,
                published_at=now,
            )
            db.add(version)
            await db.flush()

        price = await db.get(ProductPrice, price_id)
        if price is None:
            has_price = await db.scalar(
                select(ProductPrice.id).where(
                    ProductPrice.product_id == product.id, ProductPrice.active.is_(True)
                )
            )
            if has_price is None:
                db.add(
                    ProductPrice(
                        id=price_id,
                        product_id=product.id,
                        settlement_method=SettlementMethod.credits,
                        amount_minor=amount,
                        currency="SYLORA_CREDIT",
                        active=True,
                    )
                )

        inventory = await db.get(ProductInventory, product.id)
        if inventory is None:
            db.add(
                ProductInventory(
                    product_id=product.id,
                    quantity_available=None,
                    quantity_sold=0,
                    active=True,
                )
            )
        else:
            inventory.active = True

        product.state = ProductState.published
        product.published_version_id = version.id
        product.updated_at = now

    return {"created": created, "store_id": str(store.id), "count": len(products)}


async def _ensure_demo_workspace(db: AsyncSession, *, owner_id: uuid.UUID) -> dict[str, Any]:
    from app.business_models import (
        Workspace,
        WorkspaceMembership,
        WorkspaceMembershipStatus,
        WorkspaceRole,
        WorkspaceStatus,
        WorkspaceType,
    )
    from app.business_service import create_workspace_defaults

    slug = "sylora-stand-demo"
    workspace_id = _stand_uuid(f"workspace:{slug}")
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        workspace = await db.scalar(select(Workspace).where(Workspace.slug == slug))
    if workspace is not None:
        return {"status": "already", "workspace_id": str(workspace.id)}

    workspace = Workspace(
        id=workspace_id,
        slug=slug,
        name="SYLORA Stand Demo",
        type=WorkspaceType.team,
        owner_user_id=owner_id,
        status=WorkspaceStatus.active,
        locale="uk",
        timezone="Europe/Kyiv",
        currency="USD",
        settings={"stand": True, "demo": True},
    )
    db.add(workspace)
    await db.flush()
    db.add(
        WorkspaceMembership(
            id=_stand_uuid(f"workspace-membership:{slug}:owner"),
            workspace_id=workspace.id,
            user_id=owner_id,
            role=WorkspaceRole.owner,
            status=WorkspaceMembershipStatus.active,
            permission_overrides={},
            joined_at=utcnow(),
        )
    )
    await create_workspace_defaults(db, workspace, owner_id)
    return {"status": "created", "workspace_id": str(workspace.id)}


async def _ensure_music_catalog(db: AsyncSession) -> dict[str, Any]:
    """Ensure DB music catalog is non-empty (service already code-seeds into DB)."""
    from app.music_models import MusicTrack
    from app.music_service import ensure_seed_catalog

    before = int(await db.scalar(select(func.count()).select_from(MusicTrack)) or 0)
    await ensure_seed_catalog(db)
    after = int(await db.scalar(select(func.count()).select_from(MusicTrack)) or 0)
    return {"before": before, "after": after, "seeded": after > before}


async def ensure_living_platform(db: AsyncSession) -> dict[str, Any]:
    """Idempotently seed creators, posts, learning, marketplace, business, music."""
    from app.models import AccountSettings, Profile

    # Aura must exist as the living feed anchor (always selectinload profile/settings).
    aura = await _load_user_with_profile(db, email=WELCOME_EMAIL)
    if aura is None:
        welcome = await ensure_welcome_world(db)
        aura = await _load_user_with_profile(db, user_id=uuid.UUID(welcome["author_id"]))
    if aura is None:
        raise RuntimeError("Aura welcome user missing after ensure_welcome_world")

    if aura.profile is None:
        aura.profile = Profile(display_name="Aura", handle=WELCOME_HANDLE, locale="uk")
    if aura.settings is None:
        aura.settings = AccountSettings(profile_visibility="public")
    else:
        aura.settings.profile_visibility = "public"

    creators = await _ensure_demo_creators(db)
    posts_created = await _ensure_living_posts(
        db, aura_id=aura.id, handles=creators["handles"]
    )

    # Prefer learning/marketplace author from a demo creator when available.
    sofia_id = creators["handles"].get("sofia.march", aura.id)
    james_id = creators["handles"].get("james.holt", aura.id)
    nina_id = creators["handles"].get("nina.blake", aura.id)

    learning = await _ensure_learning_courses(db, author_id=sofia_id)
    marketplace = await _ensure_marketplace_products(db, owner_id=james_id)
    business = await _ensure_demo_workspace(db, owner_id=nina_id)
    music = await _ensure_music_catalog(db)

    await db.commit()
    result = {
        "status": "ok",
        "creators": creators,
        "posts_created": posts_created,
        "learning": learning,
        "marketplace": marketplace,
        "business": business,
        "music": music,
        "aura_id": str(aura.id),
    }
    logger.info(
        "living platform seeded creators=%s posts=%s courses=%s products=%s music=%s",
        creators.get("created"),
        posts_created,
        learning.get("created"),
        marketplace.get("created"),
        music.get("after"),
    )
    return result
