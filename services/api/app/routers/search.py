from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.business_models import (
    BusinessDocument,
    WorkspaceMembership,
    WorkspaceMembershipStatus,
)
from app.business_service import ROLE_PERMISSIONS, can_read_document
from app.dependencies import AuthContext, current_auth, get_session, has_permission
from app.errors import APIError
from app.gift_models import GiftDefinition, GiftLifecycle
from app.gift_service import gift_is_eligible, published_version
from app.live_models import LiveSession, LiveSessionState
from app.models import AccountSettings, Profile
from app.music_models import MusicTrack, MusicTrackStatus
from app.music_schemas import MusicTrackResponse
from app.platform_models import (
    Course,
    CourseState,
    CourseVersion,
    MarketplaceProduct,
    MarketplaceStore,
    ProductInventory,
    ProductState,
    ProductVersion,
)
from app.routers.social import community_response, normalized_search_query
from app.search_schemas import (
    CourseSearchItem,
    DocumentSearchItem,
    GiftSearchItem,
    GlobalSearchResponse,
    LiveSessionSearchItem,
    MarketplaceProductSearchItem,
)
from app.security import utcnow
from app.social_models import (
    Community,
    CommunityMembership,
    CommunityVisibility,
    Follow,
    Friendship,
    MembershipStatus,
    Post,
    RelationStatus,
)
from app.social_service import (
    accessible_post_condition,
    not_blocked_condition,
    post_response,
    public_profile_response,
)

router = APIRouter(tags=["Search"])


@router.get("/search", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(min_length=2, max_length=100),
    limit: int = Query(default=10, ge=1, le=50),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> GlobalSearchResponse:
    query = normalized_search_query(q)
    pattern = f"%{query}%"
    now = utcnow()

    profiles = list(
        (
            await db.scalars(
                select(Profile)
                .join(AccountSettings, AccountSettings.user_id == Profile.user_id)
                .where(
                    Profile.handle.is_not(None),
                    not_blocked_condition(auth.user.id, Profile.user_id),
                    or_(
                        AccountSettings.profile_visibility == "public",
                        Profile.user_id == auth.user.id,
                        exists(
                            select(Follow.id).where(
                                Follow.follower_id == auth.user.id,
                                Follow.followed_id == Profile.user_id,
                            )
                        ),
                        exists(
                            select(Friendship.id).where(
                                Friendship.status == RelationStatus.accepted,
                                or_(
                                    and_(
                                        Friendship.user_low_id == auth.user.id,
                                        Friendship.user_high_id == Profile.user_id,
                                    ),
                                    and_(
                                        Friendship.user_high_id == auth.user.id,
                                        Friendship.user_low_id == Profile.user_id,
                                    ),
                                ),
                            )
                        ),
                    ),
                    or_(
                        Profile.handle.ilike(pattern),
                        Profile.display_name.ilike(pattern),
                    ),
                )
                .order_by(Profile.handle)
                .limit(limit)
            )
        ).all()
    )

    posts = list(
        (
            await db.scalars(
                select(Post)
                .where(
                    accessible_post_condition(auth.user.id),
                    Post.body.ilike(pattern),
                )
                .order_by(Post.published_at.desc(), Post.id.desc())
                .limit(limit)
            )
        ).all()
    )

    communities = list(
        (
            await db.scalars(
                select(Community)
                .where(
                    Community.deleted_at.is_(None),
                    or_(
                        Community.visibility == CommunityVisibility.public,
                        exists(
                            select(CommunityMembership.id).where(
                                CommunityMembership.community_id == Community.id,
                                CommunityMembership.user_id == auth.user.id,
                                CommunityMembership.status == MembershipStatus.active,
                            )
                        ),
                    ),
                    or_(
                        Community.slug.ilike(pattern),
                        Community.name.ilike(pattern),
                        Community.description.ilike(pattern),
                    ),
                )
                .order_by(Community.name)
                .limit(limit)
            )
        ).all()
    )

    gift_candidates = list(
        (
            await db.scalars(
                select(GiftDefinition)
                .where(
                    GiftDefinition.state == GiftLifecycle.published,
                    or_(
                        GiftDefinition.available_from.is_(None),
                        GiftDefinition.available_from <= now,
                    ),
                    or_(
                        GiftDefinition.available_until.is_(None),
                        GiftDefinition.available_until > now,
                    ),
                    or_(
                        GiftDefinition.supply_cap.is_(None),
                        GiftDefinition.sold_count < GiftDefinition.supply_cap,
                    ),
                    or_(
                        GiftDefinition.slug.ilike(pattern),
                        GiftDefinition.name.ilike(pattern),
                        GiftDefinition.description.ilike(pattern),
                    ),
                )
                .order_by(GiftDefinition.created_at.desc(), GiftDefinition.id.desc())
                .limit(limit * 5)
            )
        ).all()
    )
    gifts: list[GiftDefinition] = []
    for gift in gift_candidates:
        eligible, _ = await gift_is_eligible(db, auth.user.id, gift)
        if not eligible:
            continue
        try:
            await published_version(db, gift.id)
        except APIError:
            continue
        gifts.append(gift)
        if len(gifts) == limit:
            break

    product_rows = (
        await db.execute(
            select(MarketplaceProduct, ProductVersion)
            .join(MarketplaceStore, MarketplaceStore.id == MarketplaceProduct.store_id)
            .join(ProductVersion, ProductVersion.id == MarketplaceProduct.published_version_id)
            .join(ProductInventory, ProductInventory.product_id == MarketplaceProduct.id)
            .where(
                MarketplaceProduct.state == ProductState.published,
                MarketplaceStore.active.is_(True),
                ProductInventory.active.is_(True),
                or_(
                    ProductInventory.quantity_available.is_(None),
                    ProductInventory.quantity_available > 0,
                ),
                or_(
                    ProductInventory.available_from.is_(None),
                    ProductInventory.available_from <= now,
                ),
                or_(
                    ProductInventory.available_until.is_(None),
                    ProductInventory.available_until > now,
                ),
                or_(
                    MarketplaceProduct.slug.ilike(pattern),
                    ProductVersion.title.ilike(pattern),
                    ProductVersion.description.ilike(pattern),
                ),
            )
            .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
            .limit(limit)
        )
    ).all()

    course_rows = (
        await db.execute(
            select(Course, CourseVersion)
            .join(CourseVersion, CourseVersion.id == Course.published_version_id)
            .where(
                Course.state == CourseState.published,
                or_(
                    Course.slug.ilike(pattern),
                    CourseVersion.title.ilike(pattern),
                    CourseVersion.description.ilike(pattern),
                ),
            )
            .order_by(Course.created_at.desc(), Course.id.desc())
            .limit(limit)
        )
    ).all()

    live_sessions = list(
        (
            await db.scalars(
                select(LiveSession)
                .where(
                    LiveSession.owner_user_id.is_not(None),
                    LiveSession.state.in_(
                        [
                            LiveSessionState.starting,
                            LiveSessionState.live,
                            LiveSessionState.reconnecting,
                        ]
                    ),
                    LiveSession.title.ilike(pattern),
                )
                .order_by(LiveSession.started_at.desc(), LiveSession.id.desc())
                .limit(limit)
            )
        ).all()
    )

    music_tracks = list(
        (
            await db.scalars(
                select(MusicTrack)
                .where(
                    MusicTrack.status == MusicTrackStatus.published,
                    or_(
                        MusicTrack.title.ilike(pattern),
                        MusicTrack.artist_name.ilike(pattern),
                        MusicTrack.genre.ilike(pattern),
                    ),
                )
                .order_by(MusicTrack.created_at.desc(), MusicTrack.id.desc())
                .limit(limit)
            )
        ).all()
    )

    if await has_permission(db, auth.user.id, "workspaces:manage:any"):
        document_statement = select(BusinessDocument).where(
            BusinessDocument.deleted_at.is_(None),
            BusinessDocument.title.ilike(pattern),
        )
        memberships_by_workspace = {}
    else:
        memberships = list(
            (
                await db.scalars(
                    select(WorkspaceMembership).where(
                        WorkspaceMembership.user_id == auth.user.id,
                        WorkspaceMembership.status == WorkspaceMembershipStatus.active,
                    )
                )
            ).all()
        )
        readable_memberships = [
            membership
            for membership in memberships
            if membership.permission_overrides.get("documents.read") is not False
            and (
                membership.permission_overrides.get("documents.read") is True
                or "*" in ROLE_PERMISSIONS[membership.role]
                or "documents.read" in ROLE_PERMISSIONS[membership.role]
            )
        ]
        memberships_by_workspace = {
            membership.workspace_id: membership for membership in readable_memberships
        }
        document_statement = select(BusinessDocument).where(
            BusinessDocument.workspace_id.in_(list(memberships_by_workspace)),
            BusinessDocument.deleted_at.is_(None),
            BusinessDocument.title.ilike(pattern),
        )
    document_candidates = list(
        (
            await db.scalars(
                document_statement.order_by(
                    BusinessDocument.updated_at.desc(),
                    BusinessDocument.id.desc(),
                ).limit(limit * 5)
            )
        ).all()
    )
    documents = [
        document
        for document in document_candidates
        if can_read_document(
            document,
            memberships_by_workspace.get(document.workspace_id),
            auth.user.id,
        )
    ][:limit]

    return GlobalSearchResponse(
        query=query,
        users=[
            await public_profile_response(db, auth.user.id, profile) for profile in profiles
        ],
        posts=[await post_response(db, auth.user.id, post) for post in posts],
        communities=[
            await community_response(db, community, auth.user.id)
            for community in communities
        ],
        gifts=[
            GiftSearchItem(
                id=gift.id,
                slug=gift.slug,
                name=gift.name,
                description=gift.description,
                tier=gift.tier,
                price_minor=gift.price_minor,
            )
            for gift in gifts
        ],
        marketplace_products=[
            MarketplaceProductSearchItem(
                id=product.id,
                slug=product.slug,
                title=version.title,
                description=version.description,
                category=product.category,
                kind=product.kind,
            )
            for product, version in product_rows
        ],
        courses=[
            CourseSearchItem(
                id=course.id,
                slug=course.slug,
                title=version.title,
                description=version.description,
                category=course.category,
                settlement_method=course.settlement_method,
            )
            for course, version in course_rows
        ],
        live_sessions=[
            LiveSessionSearchItem(
                id=session.id,
                owner_user_id=session.owner_user_id,
                title=session.title,
                language=session.language,
                state=session.state,
                started_at=session.started_at,
            )
            for session in live_sessions
            if session.owner_user_id is not None
        ],
        music_tracks=[
            MusicTrackResponse.model_validate(track) for track in music_tracks
        ],
        documents=[
            DocumentSearchItem(
                id=document.id,
                workspace_id=document.workspace_id,
                title=document.title,
                state=document.state,
                classification=document.classification,
                updated_at=document.updated_at,
            )
            for document in documents
        ],
    )
