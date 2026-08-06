from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.errors import APIError
from app.gift_models import GiftDefinition, GiftLifecycle
from app.live_models import LiveSession, LiveSessionState
from app.models import Profile, User, UserStatus
from app.platform_models import (
    Course,
    CourseState,
    CourseVersion,
    MarketplaceProduct,
    ProductState,
    ProductVersion,
)
from app.search_schemas import SearchHit, SearchResponse, SearchSection
from app.social_models import Community, Post, PostLifecycle

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
async def global_search(
    q: Annotated[str, Query(min_length=1, max_length=120)],
    limit: Annotated[int, Query(ge=1, le=25)] = 8,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> SearchResponse:
    _ = auth
    query = q.strip()
    if not query:
        raise APIError(422, "invalid_query", "Invalid query", "Search query must not be blank.")
    pattern = f"%{query}%"
    sections: list[SearchSection] = []

    profiles = (
        await db.scalars(
            select(Profile)
            .join(User, User.id == Profile.user_id)
            .where(
                User.status == UserStatus.active,
                User.deleted_at.is_(None),
                or_(
                    Profile.handle.ilike(pattern),
                    Profile.display_name.ilike(pattern),
                    Profile.bio.ilike(pattern),
                ),
            )
            .order_by(Profile.handle.asc(), Profile.display_name.asc())
            .limit(limit)
        )
    ).all()
    if profiles:
        sections.append(
            SearchSection(
                type="users",
                items=[
                    SearchHit(
                        id=profile.user_id,
                        title=profile.display_name,
                        subtitle=profile.bio,
                        handle=profile.handle,
                    )
                    for profile in profiles
                ],
            )
        )

    posts = (
        await db.scalars(
            select(Post)
            .where(
                Post.lifecycle == PostLifecycle.published,
                Post.deleted_at.is_(None),
                Post.body.ilike(pattern),
            )
            .order_by(Post.published_at.desc(), Post.id.desc())
            .limit(limit)
        )
    ).all()
    if posts:
        sections.append(
            SearchSection(
                type="posts",
                items=[
                    SearchHit(
                        id=post.id,
                        title=(post.body[:120] + ("…" if len(post.body) > 120 else "")),
                        subtitle=post.category,
                        extra={"author_id": str(post.author_id)},
                    )
                    for post in posts
                ],
            )
        )

    communities = (
        await db.scalars(
            select(Community)
            .where(
                Community.deleted_at.is_(None),
                or_(
                    Community.name.ilike(pattern),
                    Community.slug.ilike(pattern),
                    Community.description.ilike(pattern),
                ),
            )
            .order_by(Community.name.asc())
            .limit(limit)
        )
    ).all()
    if communities:
        sections.append(
            SearchSection(
                type="communities",
                items=[
                    SearchHit(
                        id=community.id,
                        title=community.name,
                        subtitle=community.description,
                        slug=community.slug,
                    )
                    for community in communities
                ],
            )
        )

    gifts = (
        await db.scalars(
            select(GiftDefinition)
            .where(
                GiftDefinition.state == GiftLifecycle.published,
                GiftDefinition.retired_at.is_(None),
                or_(
                    GiftDefinition.name.ilike(pattern),
                    GiftDefinition.slug.ilike(pattern),
                    GiftDefinition.description.ilike(pattern),
                ),
            )
            .order_by(GiftDefinition.name.asc())
            .limit(limit)
        )
    ).all()
    if gifts:
        sections.append(
            SearchSection(
                type="gifts",
                items=[
                    SearchHit(
                        id=gift.id,
                        title=gift.name,
                        subtitle=gift.description[:160],
                        slug=gift.slug,
                        extra={"tier": gift.tier.value, "price_minor": gift.price_minor},
                    )
                    for gift in gifts
                ],
            )
        )

    product_rows = (
        await db.execute(
            select(MarketplaceProduct, ProductVersion)
            .join(
                ProductVersion,
                ProductVersion.id == MarketplaceProduct.published_version_id,
            )
            .where(
                MarketplaceProduct.state == ProductState.published,
                or_(
                    ProductVersion.title.ilike(pattern),
                    ProductVersion.description.ilike(pattern),
                    MarketplaceProduct.slug.ilike(pattern),
                    MarketplaceProduct.category.ilike(pattern),
                ),
            )
            .order_by(ProductVersion.title.asc())
            .limit(limit)
        )
    ).all()
    if product_rows:
        sections.append(
            SearchSection(
                type="products",
                items=[
                    SearchHit(
                        id=product.id,
                        title=version.title,
                        subtitle=version.description[:160] if version.description else None,
                        slug=product.slug,
                        extra={"category": product.category},
                    )
                    for product, version in product_rows
                ],
            )
        )

    course_rows = (
        await db.execute(
            select(Course, CourseVersion)
            .join(CourseVersion, CourseVersion.id == Course.published_version_id)
            .where(
                Course.state == CourseState.published,
                or_(
                    CourseVersion.title.ilike(pattern),
                    CourseVersion.description.ilike(pattern),
                    Course.slug.ilike(pattern),
                    Course.category.ilike(pattern),
                ),
            )
            .order_by(CourseVersion.title.asc())
            .limit(limit)
        )
    ).all()
    if course_rows:
        sections.append(
            SearchSection(
                type="courses",
                items=[
                    SearchHit(
                        id=course.id,
                        title=version.title,
                        subtitle=version.description[:160] if version.description else None,
                        slug=course.slug,
                        extra={"category": course.category},
                    )
                    for course, version in course_rows
                ],
            )
        )

    sessions = (
        await db.scalars(
            select(LiveSession)
            .where(
                LiveSession.title.ilike(pattern),
                LiveSession.state.in_(
                    [
                        LiveSessionState.live,
                        LiveSessionState.starting,
                        LiveSessionState.preflight,
                        LiveSessionState.reconnecting,
                    ]
                ),
            )
            .order_by(LiveSession.created_at.desc())
            .limit(limit)
        )
    ).all()
    if sessions:
        sections.append(
            SearchSection(
                type="live_sessions",
                items=[
                    SearchHit(
                        id=session.id,
                        title=session.title,
                        subtitle=session.state.value,
                        extra={
                            "owner_user_id": str(session.owner_user_id)
                            if session.owner_user_id
                            else None
                        },
                    )
                    for session in sessions
                ],
            )
        )

    return SearchResponse(query=query, sections=sections)
