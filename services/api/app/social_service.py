from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.errors import APIError
from app.models import AccountSettings, Profile
from app.security import utcnow
from app.social_models import (
    Block,
    Bookmark,
    Comment,
    Community,
    CommunityMembership,
    CommunityVisibility,
    Follow,
    Friendship,
    MembershipStatus,
    Mute,
    Notification,
    NotificationPreference,
    PollOption,
    PollVote,
    Post,
    PostLifecycle,
    PostVisibility,
    Reaction,
    RelationStatus,
    Repost,
)
from app.social_schemas import (
    HANDLE_PATTERN,
    RESERVED_HANDLES,
    MediaReference,
    PollOptionResponse,
    PostResponse,
    PublicProfileResponse,
)


def canonical_user_pair(first: uuid.UUID, second: uuid.UUID) -> tuple[uuid.UUID, uuid.UUID]:
    if first == second:
        raise APIError(
            422,
            "self_interaction",
            "Invalid interaction",
            "You cannot perform this action on your own account.",
        )
    return (first, second) if first.int < second.int else (second, first)


def direct_pair_key(first: uuid.UUID, second: uuid.UUID) -> str:
    low, high = canonical_user_pair(first, second)
    return f"{low}:{high}"


def encode_cursor(
    settings: Settings,
    scope: str,
    created_at: datetime,
    record_id: uuid.UUID,
) -> str:
    aware_time = created_at.replace(tzinfo=UTC) if created_at.tzinfo is None else created_at
    payload = json.dumps(
        {"s": scope, "t": aware_time.isoformat(), "i": str(record_id)},
        separators=(",", ":"),
        sort_keys=True,
    ).encode()
    signature = hmac.new(
        settings.jwt_secret.get_secret_value().encode(), payload, hashlib.sha256
    ).digest()
    return base64.urlsafe_b64encode(payload + signature).decode().rstrip("=")


def decode_cursor(
    settings: Settings, scope: str, cursor: str | None
) -> tuple[datetime, uuid.UUID] | None:
    if cursor is None:
        return None
    try:
        padding = "=" * (-len(cursor) % 4)
        decoded = base64.urlsafe_b64decode(cursor + padding)
        if len(decoded) <= 32:
            raise ValueError
        payload, supplied_signature = decoded[:-32], decoded[-32:]
        expected_signature = hmac.new(
            settings.jwt_secret.get_secret_value().encode(), payload, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(supplied_signature, expected_signature):
            raise ValueError
        data = json.loads(payload)
        if data["s"] != scope:
            raise ValueError
        created_at = datetime.fromisoformat(data["t"])
        if created_at.tzinfo is None:
            raise ValueError
        return created_at, uuid.UUID(data["i"])
    except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        raise APIError(
            400,
            "invalid_cursor",
            "Invalid cursor",
            "The pagination cursor is invalid or belongs to another resource.",
        ) from exc


async def require_handle(db: AsyncSession, user_id: uuid.UUID) -> Profile:
    profile = await db.get(Profile, user_id)
    if profile is None or profile.handle is None:
        raise APIError(
            409,
            "handle_required",
            "Public handle required",
            "Set a valid public handle through the profile endpoint before using social features.",
        )
    return profile


async def profile_for_handle(db: AsyncSession, handle: str) -> Profile:
    if not HANDLE_PATTERN.fullmatch(handle) or handle in RESERVED_HANDLES:
        raise APIError(
            422,
            "invalid_handle",
            "Invalid handle",
            "Handles use 3-30 lowercase letters, digits, dots, or underscores.",
        )
    profile = await db.scalar(select(Profile).where(Profile.handle == handle))
    if profile is None:
        raise APIError(
            404,
            "profile_not_found",
            "Profile not found",
            "The requested profile does not exist.",
        )
    return profile


async def is_blocked(db: AsyncSession, first: uuid.UUID, second: uuid.UUID) -> bool:
    return (
        await db.scalar(
            select(Block.blocker_id)
            .where(
                or_(
                    and_(Block.blocker_id == first, Block.blocked_id == second),
                    and_(Block.blocker_id == second, Block.blocked_id == first),
                )
            )
            .limit(1)
        )
        is not None
    )


async def ensure_not_blocked(db: AsyncSession, first: uuid.UUID, second: uuid.UUID) -> None:
    if await is_blocked(db, first, second):
        raise APIError(
            404,
            "resource_not_found",
            "Resource not found",
            "The requested resource does not exist.",
        )


def not_blocked_condition(viewer_id: uuid.UUID, other_id: Any) -> Any:
    return ~exists(
        select(Block.blocker_id).where(
            or_(
                and_(Block.blocker_id == viewer_id, Block.blocked_id == other_id),
                and_(Block.blocker_id == other_id, Block.blocked_id == viewer_id),
            )
        )
    )


async def are_friends(db: AsyncSession, first: uuid.UUID, second: uuid.UUID) -> bool:
    low, high = canonical_user_pair(first, second)
    return (
        await db.scalar(
            select(Friendship.id).where(
                Friendship.user_low_id == low,
                Friendship.user_high_id == high,
                Friendship.status == RelationStatus.accepted,
            )
        )
        is not None
    )


async def can_view_profile(db: AsyncSession, viewer_id: uuid.UUID, target_id: uuid.UUID) -> bool:
    if viewer_id == target_id:
        return True
    statement = (
        select(Profile.user_id)
        .join(AccountSettings, AccountSettings.user_id == Profile.user_id)
        .where(
            Profile.user_id == target_id,
            Profile.handle.is_not(None),
            not_blocked_condition(viewer_id, Profile.user_id),
            or_(
                AccountSettings.profile_visibility == "public",
                exists(
                    select(Follow.id).where(
                        Follow.follower_id == viewer_id,
                        Follow.followed_id == Profile.user_id,
                    )
                ),
                exists(
                    select(Friendship.id).where(
                        Friendship.status == RelationStatus.accepted,
                        or_(
                            and_(
                                Friendship.user_low_id == viewer_id,
                                Friendship.user_high_id == Profile.user_id,
                            ),
                            and_(
                                Friendship.user_high_id == viewer_id,
                                Friendship.user_low_id == Profile.user_id,
                            ),
                        ),
                    )
                ),
            ),
        )
    )
    return await db.scalar(statement) is not None


async def public_profile_response(
    db: AsyncSession, viewer_id: uuid.UUID, profile: Profile
) -> PublicProfileResponse:
    settings = await db.get(AccountSettings, profile.user_id)
    followed = (
        await db.scalar(
            select(Follow.id).where(
                Follow.follower_id == viewer_id, Follow.followed_id == profile.user_id
            )
        )
        is not None
    )
    friends = viewer_id != profile.user_id and await are_friends(db, viewer_id, profile.user_id)
    if profile.handle is None or settings is None:
        raise APIError(404, "profile_not_found", "Profile not found", "The profile does not exist.")
    return PublicProfileResponse(
        user_id=profile.user_id,
        handle=profile.handle,
        display_name=profile.display_name,
        bio=profile.bio,
        avatar_url=profile.avatar_url,
        visibility=settings.profile_visibility,
        followed_by_viewer=followed,
        friend_with_viewer=friends,
    )


def accessible_post_condition(viewer_id: uuid.UUID) -> Any:
    active_member = exists(
        select(CommunityMembership.id).where(
            CommunityMembership.community_id == Post.community_id,
            CommunityMembership.user_id == viewer_id,
            CommunityMembership.status == MembershipStatus.active,
        )
    )
    community_access = or_(
        Post.community_id.is_(None),
        exists(
            select(Community.id).where(
                Community.id == Post.community_id,
                Community.deleted_at.is_(None),
                Community.visibility == CommunityVisibility.public,
            )
        ),
        active_member,
    )
    visibility_access = or_(
        Post.author_id == viewer_id,
        Post.visibility == PostVisibility.public,
        and_(
            Post.visibility == PostVisibility.followers,
            exists(
                select(Follow.id).where(
                    Follow.follower_id == viewer_id,
                    Follow.followed_id == Post.author_id,
                )
            ),
        ),
        and_(Post.visibility == PostVisibility.community, active_member),
    )
    return and_(
        Post.lifecycle == PostLifecycle.published,
        Post.deleted_at.is_(None),
        not_blocked_condition(viewer_id, Post.author_id),
        community_access,
        visibility_access,
    )


def apply_cursor(
    statement: Select[Any],
    created_column: Any,
    id_column: Any,
    cursor_value: tuple[datetime, uuid.UUID] | None,
) -> Select[Any]:
    if cursor_value is None:
        return statement
    created_at, record_id = cursor_value
    return statement.where(
        or_(created_column < created_at, and_(created_column == created_at, id_column < record_id))
    )


async def post_response(db: AsyncSession, viewer_id: uuid.UUID, post: Post) -> PostResponse:
    author_handle = await db.scalar(select(Profile.handle).where(Profile.user_id == post.author_id))
    if author_handle is None:
        author_handle = "deleted"
    poll_options: list[PollOptionResponse] = []
    if post.kind.value == "poll":
        options = (
            await db.scalars(
                select(PollOption)
                .where(PollOption.post_id == post.id)
                .order_by(PollOption.position.asc())
            )
        ).all()
        viewer_vote = await db.scalar(
            select(PollVote).where(PollVote.post_id == post.id, PollVote.user_id == viewer_id)
        )
        for option in options:
            count = await db.scalar(
                select(func.count()).select_from(PollVote).where(PollVote.option_id == option.id)
            )
            poll_options.append(
                PollOptionResponse(
                    id=option.id,
                    text=option.text,
                    position=option.position,
                    closes_at=option.closes_at,
                    vote_count=int(count or 0),
                    viewer_voted=viewer_vote is not None and viewer_vote.option_id == option.id,
                )
            )
    reaction_count = await db.scalar(
        select(func.count())
        .select_from(Reaction)
        .where(Reaction.target_type == "post", Reaction.target_id == post.id)
    )
    comment_count = await db.scalar(
        select(func.count())
        .select_from(Comment)
        .where(Comment.post_id == post.id, Comment.deleted_at.is_(None))
    )
    repost_count = await db.scalar(
        select(func.count()).select_from(Repost).where(Repost.post_id == post.id)
    )
    viewer_reaction = await db.scalar(
        select(Reaction.value).where(
            Reaction.user_id == viewer_id,
            Reaction.target_type == "post",
            Reaction.target_id == post.id,
        )
    )
    bookmarked = (
        await db.scalar(
            select(Bookmark.id).where(Bookmark.user_id == viewer_id, Bookmark.post_id == post.id)
        )
        is not None
    )
    return PostResponse(
        id=post.id,
        author_id=post.author_id,
        author_handle=author_handle,
        community_id=post.community_id,
        channel_id=post.channel_id,
        kind=post.kind,
        body=post.body,
        media_references=[MediaReference.model_validate(item) for item in post.media_references],
        link_url=post.link_url,
        category=post.category,
        visibility=post.visibility,
        lifecycle=post.lifecycle,
        created_at=post.created_at,
        published_at=post.published_at,
        edited_at=post.edited_at,
        poll_options=poll_options,
        reaction_count=int(reaction_count or 0),
        comment_count=int(comment_count or 0),
        repost_count=int(repost_count or 0),
        viewer_reaction=viewer_reaction,
        bookmarked=bookmarked,
    )


async def visible_post(db: AsyncSession, viewer_id: uuid.UUID, post_id: uuid.UUID) -> Post:
    post = await db.scalar(
        select(Post).where(Post.id == post_id, accessible_post_condition(viewer_id))
    )
    if post is None:
        raise APIError(
            404,
            "post_not_found",
            "Post not found",
            "The requested post does not exist.",
        )
    return post


async def create_notification(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    notification_type: str,
    actor_user_id: uuid.UUID | None,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    metadata: dict[str, str | int | float | bool | None] | None = None,
) -> Notification | None:
    if actor_user_id == user_id:
        return None
    if actor_user_id is not None and await is_blocked(db, user_id, actor_user_id):
        return None
    muted = False
    if actor_user_id is not None:
        muted = await db.get(Mute, {"muter_id": user_id, "muted_id": actor_user_id}) is not None
    preference = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.notification_type == notification_type,
            NotificationPreference.muted.is_(True),
        )
    )
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        actor_user_id=actor_user_id,
        target_type=target_type,
        target_id=target_id,
        event_metadata=metadata or {},
        muted_at=utcnow() if muted or preference is not None else None,
    )
    db.add(notification)
    return notification
