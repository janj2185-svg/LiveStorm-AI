from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import and_, case, delete, exists, func, literal, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.errors import APIError
from app.models import AccessSession, AccountSettings, Profile, User, UserStatus
from app.rate_limit import rate_limit
from app.schemas import MessageResponse
from app.security import utcnow
from app.social_models import (
    Block,
    Bookmark,
    Channel,
    Comment,
    Community,
    CommunityMembership,
    CommunityRole,
    CommunityVisibility,
    ContentReport,
    Follow,
    FollowRequest,
    Friendship,
    MembershipStatus,
    ModerationAction,
    Mute,
    Notification,
    NotificationPreference,
    PollOption,
    PollVote,
    Post,
    PostKind,
    PostLifecycle,
    Reaction,
    RelationStatus,
    ReportStatus,
    Repost,
)
from app.social_schemas import (
    SLUG_PATTERN,
    ChannelCreate,
    ChannelPatch,
    ChannelResponse,
    CommentCreate,
    CommentPatch,
    CommentResponse,
    CommunityCreate,
    CommunityPatch,
    CommunityResponse,
    CommunitySearchResponse,
    FriendRequestsResponse,
    FriendRequestSummaryResponse,
    FriendSuggestionResponse,
    FriendSummaryResponse,
    MembershipResponse,
    MembershipRolePatch,
    ModerationDecisionRequest,
    NotificationMuteRequest,
    NotificationPageResponse,
    NotificationPreferenceResponse,
    NotificationResponse,
    PollVoteRequest,
    PollVoteResponse,
    PostCreate,
    PostPageResponse,
    PostPatch,
    PostResponse,
    PostSearchResponse,
    PublicProfileResponse,
    ReactionRequest,
    ReactionResponse,
    RecommendationResponse,
    RelationResponse,
    ReportCreate,
    ReportPageResponse,
    ReportResponse,
    UserSearchResponse,
)
from app.social_service import (
    accessible_post_condition,
    apply_cursor,
    can_view_profile,
    canonical_user_pair,
    create_notification,
    decode_cursor,
    encode_cursor,
    ensure_not_blocked,
    not_blocked_condition,
    post_response,
    profile_for_handle,
    public_profile_response,
    require_handle,
    visible_post,
)

router = APIRouter(prefix="/social", tags=["Social"])


async def commit_and_refresh(db: AsyncSession, record: object) -> None:
    await db.commit()
    await db.refresh(record)


async def active_membership(
    db: AsyncSession, community_id: uuid.UUID, user_id: uuid.UUID
) -> CommunityMembership | None:
    return await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.community_id == community_id,
            CommunityMembership.user_id == user_id,
            CommunityMembership.status == MembershipStatus.active,
        )
    )


async def community_by_slug(db: AsyncSession, slug: str) -> Community:
    if len(slug) > 64 or not SLUG_PATTERN.fullmatch(slug):
        raise APIError(
            422,
            "invalid_community_slug",
            "Invalid community slug",
            "Community slugs must be lowercase and URL-safe.",
        )
    community = await db.scalar(
        select(Community).where(Community.slug == slug, Community.deleted_at.is_(None))
    )
    if community is None:
        raise APIError(
            404,
            "community_not_found",
            "Community not found",
            "The requested community does not exist.",
        )
    return community


async def require_community_role(
    db: AsyncSession,
    community_id: uuid.UUID,
    user_id: uuid.UUID,
    allowed: set[CommunityRole],
) -> CommunityMembership:
    membership = await active_membership(db, community_id, user_id)
    if membership is None or membership.role not in allowed:
        raise APIError(
            403,
            "community_permission_denied",
            "Community permission denied",
            "Your community role cannot perform this action.",
        )
    return membership


async def community_response(
    db: AsyncSession, community: Community, viewer_id: uuid.UUID
) -> CommunityResponse:
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.community_id == community.id,
            CommunityMembership.user_id == viewer_id,
        )
    )
    return CommunityResponse(
        id=community.id,
        slug=community.slug,
        name=community.name,
        description=community.description,
        visibility=community.visibility,
        created_by_id=community.created_by_id,
        created_at=community.created_at,
        updated_at=community.updated_at,
        viewer_role=membership.role if membership else None,
        viewer_membership_status=membership.status if membership else None,
    )


async def ensure_owner_invariant(
    db: AsyncSession, membership: CommunityMembership, replacement_role: CommunityRole | None
) -> None:
    if membership.role != CommunityRole.owner or replacement_role == CommunityRole.owner:
        return
    owner_count = await db.scalar(
        select(func.count())
        .select_from(CommunityMembership)
        .where(
            CommunityMembership.community_id == membership.community_id,
            CommunityMembership.status == MembershipStatus.active,
            CommunityMembership.role == CommunityRole.owner,
        )
    )
    if int(owner_count or 0) <= 1:
        raise APIError(
            409,
            "last_owner_required",
            "Community owner required",
            "Assign another owner before removing or demoting the last owner.",
        )


def normalized_search_query(query: str) -> str:
    normalized = query.strip()
    if len(normalized) < 2:
        raise APIError(
            422,
            "invalid_search_query",
            "Invalid search query",
            "Search queries must contain at least two non-whitespace characters.",
        )
    return normalized


@router.get("/profiles/me", response_model=PublicProfileResponse)
async def get_social_profile(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PublicProfileResponse:
    profile = await require_handle(db, auth.user.id)
    return await public_profile_response(db, auth.user.id, profile)


@router.get("/profiles/{handle}", response_model=PublicProfileResponse)
async def get_public_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PublicProfileResponse:
    profile = await profile_for_handle(db, handle)
    if not await can_view_profile(db, auth.user.id, profile.user_id):
        raise APIError(
            404,
            "profile_not_found",
            "Profile not found",
            "The requested profile does not exist.",
        )
    return await public_profile_response(db, auth.user.id, profile)


@router.post("/follows/{handle}", response_model=RelationResponse)
async def follow_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> RelationResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    if target.user_id == auth.user.id:
        raise APIError(422, "self_follow", "Invalid follow", "You cannot follow yourself.")
    await ensure_not_blocked(db, auth.user.id, target.user_id)
    existing = await db.scalar(
        select(Follow).where(
            Follow.follower_id == auth.user.id, Follow.followed_id == target.user_id
        )
    )
    if existing is not None:
        return RelationResponse(id=existing.id, status="following", target_handle=handle)
    target_settings = await db.get(AccountSettings, target.user_id)
    if target_settings is not None and target_settings.profile_visibility == "public":
        relation = Follow(follower_id=auth.user.id, followed_id=target.user_id)
        db.add(relation)
        await db.flush()
        await create_notification(
            db,
            user_id=target.user_id,
            notification_type="follow",
            actor_user_id=auth.user.id,
            target_type="user",
            target_id=auth.user.id,
        )
        await commit_and_refresh(db, relation)
        return RelationResponse(id=relation.id, status="following", target_handle=handle)
    request_record = await db.scalar(
        select(FollowRequest).where(
            FollowRequest.requester_id == auth.user.id,
            FollowRequest.target_id == target.user_id,
        )
    )
    if request_record is None:
        request_record = FollowRequest(
            requester_id=auth.user.id,
            target_id=target.user_id,
            status=RelationStatus.pending,
        )
        db.add(request_record)
    else:
        request_record.status = RelationStatus.pending
        request_record.responded_at = None
    await db.flush()
    await create_notification(
        db,
        user_id=target.user_id,
        notification_type="follow_request",
        actor_user_id=auth.user.id,
        target_type="follow_request",
        target_id=request_record.id,
    )
    await commit_and_refresh(db, request_record)
    return RelationResponse(id=request_record.id, status="requested", target_handle=handle)


@router.delete("/follows/{handle}", response_model=MessageResponse)
async def unfollow_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    await db.execute(
        delete(Follow).where(
            Follow.follower_id == auth.user.id, Follow.followed_id == target.user_id
        )
    )
    await db.execute(
        update(FollowRequest)
        .where(
            FollowRequest.requester_id == auth.user.id,
            FollowRequest.target_id == target.user_id,
            FollowRequest.status == RelationStatus.pending,
        )
        .values(status=RelationStatus.cancelled, responded_at=utcnow())
    )
    await db.commit()
    return MessageResponse(status="unfollowed")


async def follow_request_for_action(
    db: AsyncSession, request_id: uuid.UUID, user_id: uuid.UUID
) -> FollowRequest:
    request_record = await db.scalar(
        select(FollowRequest).where(
            FollowRequest.id == request_id,
            FollowRequest.target_id == user_id,
            FollowRequest.status == RelationStatus.pending,
        )
    )
    if request_record is None:
        raise APIError(
            404,
            "follow_request_not_found",
            "Follow request not found",
            "The pending follow request does not exist.",
        )
    return request_record


@router.post("/follow-requests/{request_id}/accept", response_model=RelationResponse)
async def accept_follow_request(
    request_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> RelationResponse:
    request_record = await follow_request_for_action(db, request_id, auth.user.id)
    await ensure_not_blocked(db, auth.user.id, request_record.requester_id)
    follow = await db.scalar(
        select(Follow).where(
            Follow.follower_id == request_record.requester_id,
            Follow.followed_id == auth.user.id,
        )
    )
    if follow is None:
        follow = Follow(follower_id=request_record.requester_id, followed_id=auth.user.id)
        db.add(follow)
    request_record.status = RelationStatus.accepted
    request_record.responded_at = utcnow()
    requester_handle = await db.scalar(
        select(Profile.handle).where(Profile.user_id == request_record.requester_id)
    )
    await db.flush()
    await create_notification(
        db,
        user_id=request_record.requester_id,
        notification_type="follow_accepted",
        actor_user_id=auth.user.id,
        target_type="user",
        target_id=auth.user.id,
    )
    await commit_and_refresh(db, follow)
    return RelationResponse(
        id=follow.id, status="following", target_handle=requester_handle or "deleted"
    )


@router.post("/follow-requests/{request_id}/reject", response_model=MessageResponse)
async def reject_follow_request(
    request_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    request_record = await follow_request_for_action(db, request_id, auth.user.id)
    request_record.status = RelationStatus.rejected
    request_record.responded_at = utcnow()
    await db.commit()
    return MessageResponse(status="rejected")


@router.delete("/follow-requests/{request_id}", response_model=MessageResponse)
async def cancel_follow_request(
    request_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    request_record = await db.scalar(
        select(FollowRequest).where(
            FollowRequest.id == request_id,
            FollowRequest.requester_id == auth.user.id,
            FollowRequest.status == RelationStatus.pending,
        )
    )
    if request_record is None:
        raise APIError(
            404,
            "follow_request_not_found",
            "Follow request not found",
            "The pending follow request does not exist.",
        )
    request_record.status = RelationStatus.cancelled
    request_record.responded_at = utcnow()
    await db.commit()
    return MessageResponse(status="cancelled")


def aware_datetime(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def friendship_other_id(viewer_id: uuid.UUID) -> object:
    return case(
        (Friendship.user_low_id == viewer_id, Friendship.user_high_id),
        else_=Friendship.user_low_id,
    )


async def accepted_friendship_map(
    db: AsyncSession, user_id: uuid.UUID
) -> dict[uuid.UUID, uuid.UUID]:
    other_id = friendship_other_id(user_id).label("friend_id")
    rows = (
        await db.execute(
            select(Friendship.id.label("friendship_id"), other_id)
            .select_from(Friendship)
            .where(
                Friendship.status == RelationStatus.accepted,
                or_(
                    Friendship.user_low_id == user_id,
                    Friendship.user_high_id == user_id,
                ),
            )
        )
    ).all()
    return {row.friend_id: row.friendship_id for row in rows}


async def last_seen_by_user(
    db: AsyncSession, user_ids: set[uuid.UUID]
) -> dict[uuid.UUID, datetime]:
    if not user_ids:
        return {}
    rows = (
        await db.execute(
            select(AccessSession.user_id, AccessSession.last_used_at, AccessSession.created_at)
            .where(
                AccessSession.user_id.in_(user_ids),
                AccessSession.revoked_at.is_(None),
            )
            .order_by(AccessSession.created_at.desc())
        )
    ).all()
    last_seen: dict[uuid.UUID, datetime] = {}
    for user_id, last_used_at, created_at in rows:
        seen_at = last_used_at or created_at
        if seen_at is None:
            continue
        aware_seen = aware_datetime(seen_at)
        if user_id not in last_seen or aware_seen > last_seen[user_id]:
            last_seen[user_id] = aware_seen
    return last_seen


def friend_summary(
    *,
    friendship_id: uuid.UUID,
    handle: str,
    display_name: str,
    avatar_url: str | None,
    last_seen_at: datetime | None,
) -> FriendSummaryResponse:
    online_cutoff = utcnow() - timedelta(minutes=5)
    return FriendSummaryResponse(
        friendship_id=friendship_id,
        handle=handle,
        display_name=display_name,
        avatar_url=avatar_url,
        online=last_seen_at is not None and last_seen_at >= online_cutoff,
        last_seen_at=last_seen_at,
    )


async def friend_request_rows(
    db: AsyncSession, user_id: uuid.UUID, *, incoming: bool
) -> list[FriendRequestSummaryResponse]:
    other_id = friendship_other_id(user_id)
    requested_by_filter = (
        Friendship.requested_by_id != user_id if incoming else Friendship.requested_by_id == user_id
    )
    rows = (
        await db.execute(
            select(
                Friendship.id.label("request_id"),
                Friendship.created_at.label("requested_at"),
                Profile.handle,
                Profile.display_name,
                Profile.avatar_url,
            )
            .select_from(Friendship)
            .join(Profile, Profile.user_id == other_id)
            .where(
                Friendship.status == RelationStatus.pending,
                requested_by_filter,
                or_(
                    Friendship.user_low_id == user_id,
                    Friendship.user_high_id == user_id,
                ),
                Profile.handle.is_not(None),
                not_blocked_condition(user_id, Profile.user_id),
            )
            .order_by(Friendship.created_at.desc(), Friendship.id.desc())
        )
    ).all()
    return [
        FriendRequestSummaryResponse(
            id=row.request_id,
            handle=row.handle,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            requested_at=row.requested_at,
        )
        for row in rows
        if row.handle is not None
    ]


@router.get("/friends", response_model=list[FriendSummaryResponse])
async def list_friends(
    limit: int = Query(default=100, ge=1, le=500),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[FriendSummaryResponse]:
    await require_handle(db, auth.user.id)
    other_id = friendship_other_id(auth.user.id)
    rows = (
        await db.execute(
            select(
                Friendship.id.label("friendship_id"),
                Profile.user_id,
                Profile.handle,
                Profile.display_name,
                Profile.avatar_url,
            )
            .select_from(Friendship)
            .join(Profile, Profile.user_id == other_id)
            .where(
                Friendship.status == RelationStatus.accepted,
                or_(
                    Friendship.user_low_id == auth.user.id,
                    Friendship.user_high_id == auth.user.id,
                ),
                Profile.handle.is_not(None),
                not_blocked_condition(auth.user.id, Profile.user_id),
            )
            .order_by(Profile.display_name.asc(), Profile.handle.asc())
            .limit(limit)
        )
    ).all()
    last_seen = await last_seen_by_user(db, {row.user_id for row in rows})
    return [
        friend_summary(
            friendship_id=row.friendship_id,
            handle=row.handle,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            last_seen_at=last_seen.get(row.user_id),
        )
        for row in rows
        if row.handle is not None
    ]


@router.get("/friend-requests", response_model=FriendRequestsResponse)
async def list_friend_requests(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> FriendRequestsResponse:
    await require_handle(db, auth.user.id)
    return FriendRequestsResponse(
        incoming=await friend_request_rows(db, auth.user.id, incoming=True),
        outgoing=await friend_request_rows(db, auth.user.id, incoming=False),
    )


@router.delete("/friend-requests/{friendship_id}/cancel", response_model=MessageResponse)
async def cancel_friendship_request(
    friendship_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    friendship = await db.scalar(
        select(Friendship).where(
            Friendship.id == friendship_id,
            Friendship.status == RelationStatus.pending,
            Friendship.requested_by_id == auth.user.id,
            or_(
                Friendship.user_low_id == auth.user.id,
                Friendship.user_high_id == auth.user.id,
            ),
        )
    )
    if friendship is None:
        raise APIError(
            404,
            "friend_request_not_found",
            "Friend request not found",
            "The pending outgoing friend request does not exist.",
        )
    friendship.status = RelationStatus.cancelled
    friendship.responded_at = utcnow()
    await db.commit()
    return MessageResponse(status="cancelled")


@router.get("/friends/suggestions", response_model=list[FriendSuggestionResponse])
async def list_friend_suggestions(
    limit: int = Query(default=20, ge=1, le=20),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[FriendSuggestionResponse]:
    await require_handle(db, auth.user.id)
    current_friend_ids = set((await accepted_friendship_map(db, auth.user.id)).keys())
    current_followed_ids = set(
        (
            await db.scalars(select(Follow.followed_id).where(Follow.follower_id == auth.user.id))
        ).all()
    )
    friend_overlap = (
        select(func.count())
        .select_from(Friendship)
        .where(
            Friendship.status == RelationStatus.accepted,
            or_(
                and_(
                    Friendship.user_low_id == Profile.user_id,
                    Friendship.user_high_id.in_(current_friend_ids),
                ),
                and_(
                    Friendship.user_high_id == Profile.user_id,
                    Friendship.user_low_id.in_(current_friend_ids),
                ),
            ),
        )
        .correlate(Profile)
        .scalar_subquery()
        if current_friend_ids
        else literal(0)
    )
    follow_overlap = (
        select(func.count())
        .select_from(Follow)
        .where(
            Follow.follower_id == Profile.user_id,
            Follow.followed_id.in_(current_followed_ids),
        )
        .correlate(Profile)
        .scalar_subquery()
        if current_followed_ids
        else literal(0)
    )
    mutual_count = (friend_overlap + follow_overlap).label("mutual_count")
    connected_or_pending = exists(
        select(Friendship.id).where(
            Friendship.status.in_([RelationStatus.accepted, RelationStatus.pending]),
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
    )
    visible_candidate = or_(
        AccountSettings.profile_visibility == "public",
        exists(
            select(Follow.id).where(
                Follow.follower_id == auth.user.id,
                Follow.followed_id == Profile.user_id,
            )
        ),
    )
    rows = (
        await db.execute(
            select(Profile.handle, Profile.display_name, Profile.avatar_url, mutual_count)
            .join(AccountSettings, AccountSettings.user_id == Profile.user_id)
            .where(
                Profile.user_id != auth.user.id,
                Profile.handle.is_not(None),
                visible_candidate,
                not_blocked_condition(auth.user.id, Profile.user_id),
                ~connected_or_pending,
            )
            .order_by(mutual_count.desc(), Profile.display_name.asc(), Profile.handle.asc())
            .limit(limit)
        )
    ).all()
    return [
        FriendSuggestionResponse(
            handle=row.handle,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            mutual_count=int(row.mutual_count or 0),
        )
        for row in rows
        if row.handle is not None
    ]


@router.get("/friends/{handle}/mutuals", response_model=list[FriendSummaryResponse])
async def list_mutual_friends(
    handle: str,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[FriendSummaryResponse]:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    if not await can_view_profile(db, auth.user.id, target.user_id):
        raise APIError(
            404,
            "profile_not_found",
            "Profile not found",
            "The requested profile does not exist.",
        )
    current_friendships = await accepted_friendship_map(db, auth.user.id)
    target_friendships = await accepted_friendship_map(db, target.user_id)
    mutual_ids = set(current_friendships) & set(target_friendships)
    if not mutual_ids:
        return []
    rows = (
        await db.execute(
            select(Profile.user_id, Profile.handle, Profile.display_name, Profile.avatar_url)
            .where(
                Profile.user_id.in_(mutual_ids),
                Profile.handle.is_not(None),
                not_blocked_condition(auth.user.id, Profile.user_id),
            )
            .order_by(Profile.display_name.asc(), Profile.handle.asc())
            .limit(limit)
        )
    ).all()
    last_seen = await last_seen_by_user(db, {row.user_id for row in rows})
    return [
        friend_summary(
            friendship_id=current_friendships[row.user_id],
            handle=row.handle,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            last_seen_at=last_seen.get(row.user_id),
        )
        for row in rows
        if row.handle is not None
    ]


@router.post("/friends/{handle}", response_model=RelationResponse)
async def request_friendship(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> RelationResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    await ensure_not_blocked(db, auth.user.id, target.user_id)
    low, high = canonical_user_pair(auth.user.id, target.user_id)
    friendship = await db.scalar(
        select(Friendship).where(Friendship.user_low_id == low, Friendship.user_high_id == high)
    )
    if friendship is None:
        friendship = Friendship(
            user_low_id=low,
            user_high_id=high,
            requested_by_id=auth.user.id,
            status=RelationStatus.pending,
        )
        db.add(friendship)
    elif friendship.status != RelationStatus.accepted:
        friendship.requested_by_id = auth.user.id
        friendship.status = RelationStatus.pending
        friendship.responded_at = None
    await db.flush()
    if friendship.status == RelationStatus.pending:
        await create_notification(
            db,
            user_id=target.user_id,
            notification_type="friend_request",
            actor_user_id=auth.user.id,
            target_type="friendship",
            target_id=friendship.id,
        )
    await commit_and_refresh(db, friendship)
    return RelationResponse(
        id=friendship.id,
        status="friends" if friendship.status == RelationStatus.accepted else "requested",
        target_handle=handle,
    )


async def friendship_for_action(
    db: AsyncSession, friendship_id: uuid.UUID, user_id: uuid.UUID
) -> Friendship:
    friendship = await db.scalar(
        select(Friendship).where(
            Friendship.id == friendship_id,
            Friendship.status == RelationStatus.pending,
            Friendship.requested_by_id != user_id,
            or_(
                Friendship.user_low_id == user_id,
                Friendship.user_high_id == user_id,
            ),
        )
    )
    if friendship is None:
        raise APIError(
            404,
            "friend_request_not_found",
            "Friend request not found",
            "The pending friend request does not exist.",
        )
    return friendship


@router.post("/friend-requests/{friendship_id}/accept", response_model=RelationResponse)
async def accept_friendship(
    friendship_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> RelationResponse:
    friendship = await friendship_for_action(db, friendship_id, auth.user.id)
    await ensure_not_blocked(db, friendship.user_low_id, friendship.user_high_id)
    friendship.status = RelationStatus.accepted
    friendship.responded_at = utcnow()
    requester_handle = await db.scalar(
        select(Profile.handle).where(Profile.user_id == friendship.requested_by_id)
    )
    await create_notification(
        db,
        user_id=friendship.requested_by_id,
        notification_type="friend_accepted",
        actor_user_id=auth.user.id,
        target_type="friendship",
        target_id=friendship.id,
    )
    await commit_and_refresh(db, friendship)
    return RelationResponse(
        id=friendship.id,
        status="friends",
        target_handle=requester_handle or "deleted",
    )


@router.post("/friend-requests/{friendship_id}/reject", response_model=MessageResponse)
async def reject_friendship(
    friendship_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    friendship = await friendship_for_action(db, friendship_id, auth.user.id)
    friendship.status = RelationStatus.rejected
    friendship.responded_at = utcnow()
    await db.commit()
    return MessageResponse(status="rejected")


@router.delete("/friends/{handle}", response_model=MessageResponse)
async def remove_friendship(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    target = await profile_for_handle(db, handle)
    low, high = canonical_user_pair(auth.user.id, target.user_id)
    await db.execute(
        delete(Friendship).where(Friendship.user_low_id == low, Friendship.user_high_id == high)
    )
    await db.commit()
    return MessageResponse(status="removed")


@router.post("/blocks/{handle}", response_model=MessageResponse)
async def block_profile(
    handle: str,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    canonical_user_pair(auth.user.id, target.user_id)
    block = await db.get(Block, {"blocker_id": auth.user.id, "blocked_id": target.user_id})
    if block is None:
        db.add(Block(blocker_id=auth.user.id, blocked_id=target.user_id))
    await db.execute(
        delete(Follow).where(
            or_(
                and_(
                    Follow.follower_id == auth.user.id,
                    Follow.followed_id == target.user_id,
                ),
                and_(
                    Follow.follower_id == target.user_id,
                    Follow.followed_id == auth.user.id,
                ),
            )
        )
    )
    await db.execute(
        delete(FollowRequest).where(
            or_(
                and_(
                    FollowRequest.requester_id == auth.user.id,
                    FollowRequest.target_id == target.user_id,
                ),
                and_(
                    FollowRequest.requester_id == target.user_id,
                    FollowRequest.target_id == auth.user.id,
                ),
            )
        )
    )
    low, high = canonical_user_pair(auth.user.id, target.user_id)
    await db.execute(
        delete(Friendship).where(Friendship.user_low_id == low, Friendship.user_high_id == high)
    )
    add_audit_event(
        db,
        request,
        settings,
        "social.user_blocked",
        actor_user_id=auth.user.id,
        target_user_id=target.user_id,
    )
    await db.commit()
    return MessageResponse(status="blocked")


@router.delete("/blocks/{handle}", response_model=MessageResponse)
async def unblock_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    target = await profile_for_handle(db, handle)
    await db.execute(
        delete(Block).where(Block.blocker_id == auth.user.id, Block.blocked_id == target.user_id)
    )
    await db.commit()
    return MessageResponse(status="unblocked")


@router.post("/mutes/{handle}", response_model=MessageResponse)
async def mute_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, handle)
    canonical_user_pair(auth.user.id, target.user_id)
    if await db.get(Mute, {"muter_id": auth.user.id, "muted_id": target.user_id}) is None:
        db.add(Mute(muter_id=auth.user.id, muted_id=target.user_id))
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == auth.user.id,
            Notification.actor_user_id == target.user_id,
            Notification.muted_at.is_(None),
        )
        .values(muted_at=utcnow())
    )
    await db.commit()
    return MessageResponse(status="muted")


@router.delete("/mutes/{handle}", response_model=MessageResponse)
async def unmute_profile(
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    target = await profile_for_handle(db, handle)
    await db.execute(
        delete(Mute).where(Mute.muter_id == auth.user.id, Mute.muted_id == target.user_id)
    )
    await db.commit()
    return MessageResponse(status="unmuted")


@router.post(
    "/communities",
    response_model=CommunityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_community(
    payload: CommunityCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityResponse:
    await require_handle(db, auth.user.id)
    if await db.scalar(select(Community.id).where(Community.slug == payload.slug)) is not None:
        raise APIError(
            409,
            "community_slug_unavailable",
            "Community slug unavailable",
            "That community slug is already in use.",
        )
    community = Community(created_by_id=auth.user.id, **payload.model_dump())
    db.add(community)
    await db.flush()
    db.add(
        CommunityMembership(
            community_id=community.id,
            user_id=auth.user.id,
            role=CommunityRole.owner,
            status=MembershipStatus.active,
        )
    )
    await commit_and_refresh(db, community)
    return await community_response(db, community, auth.user.id)


@router.get("/communities/{slug}", response_model=CommunityResponse)
async def get_community(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityResponse:
    community = await community_by_slug(db, slug)
    membership = await active_membership(db, community.id, auth.user.id)
    if community.visibility != CommunityVisibility.public and membership is None:
        raise APIError(
            404,
            "community_not_found",
            "Community not found",
            "The requested community does not exist.",
        )
    return await community_response(db, community, auth.user.id)


@router.patch("/communities/{slug}", response_model=CommunityResponse)
async def update_community(
    slug: str,
    payload: CommunityPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CommunityResponse:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db, community.id, auth.user.id, {CommunityRole.owner, CommunityRole.admin}
    )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(community, field, value)
    add_audit_event(
        db,
        request,
        settings,
        "social.community_updated",
        actor_user_id=auth.user.id,
        metadata={"community_id": str(community.id)},
    )
    await commit_and_refresh(db, community)
    return await community_response(db, community, auth.user.id)


@router.delete("/communities/{slug}", response_model=MessageResponse)
async def delete_community(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    community = await community_by_slug(db, slug)
    await require_community_role(db, community.id, auth.user.id, {CommunityRole.owner})
    community.deleted_at = utcnow()
    await db.execute(
        update(Channel)
        .where(Channel.community_id == community.id, Channel.deleted_at.is_(None))
        .values(deleted_at=utcnow())
    )
    await db.commit()
    return MessageResponse(status="deleted")


@router.post(
    "/communities/{slug}/channels",
    response_model=ChannelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_channel(
    slug: str,
    payload: ChannelCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Channel:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin},
    )
    duplicate = await db.scalar(
        select(Channel.id).where(
            Channel.community_id == community.id,
            Channel.slug == payload.slug,
            Channel.deleted_at.is_(None),
        )
    )
    if duplicate is not None:
        raise APIError(
            409,
            "channel_slug_unavailable",
            "Channel slug unavailable",
            "That channel slug is already in use.",
        )
    channel = Channel(
        community_id=community.id,
        created_by_id=auth.user.id,
        **payload.model_dump(),
    )
    db.add(channel)
    await commit_and_refresh(db, channel)
    return channel


@router.get("/communities/{slug}/channels", response_model=list[ChannelResponse])
async def list_channels(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[Channel]:
    community = await community_by_slug(db, slug)
    if (
        community.visibility != CommunityVisibility.public
        and await active_membership(db, community.id, auth.user.id) is None
    ):
        raise APIError(
            404,
            "community_not_found",
            "Community not found",
            "The requested community does not exist.",
        )
    return list(
        (
            await db.scalars(
                select(Channel)
                .where(Channel.community_id == community.id, Channel.deleted_at.is_(None))
                .order_by(Channel.created_at.asc())
            )
        ).all()
    )


@router.patch(
    "/communities/{slug}/channels/{channel_id}",
    response_model=ChannelResponse,
)
async def update_channel(
    slug: str,
    channel_id: uuid.UUID,
    payload: ChannelPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Channel:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin},
    )
    channel = await db.scalar(
        select(Channel).where(
            Channel.id == channel_id,
            Channel.community_id == community.id,
            Channel.deleted_at.is_(None),
        )
    )
    if channel is None:
        raise APIError(
            404,
            "channel_not_found",
            "Channel not found",
            "The channel does not exist.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(channel, field, value)
    await commit_and_refresh(db, channel)
    return channel


@router.delete(
    "/communities/{slug}/channels/{channel_id}",
    response_model=MessageResponse,
)
async def delete_channel(
    slug: str,
    channel_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin},
    )
    channel = await db.scalar(
        select(Channel).where(
            Channel.id == channel_id,
            Channel.community_id == community.id,
            Channel.deleted_at.is_(None),
        )
    )
    if channel is None:
        raise APIError(
            404,
            "channel_not_found",
            "Channel not found",
            "The channel does not exist.",
        )
    channel.deleted_at = utcnow()
    await db.commit()
    return MessageResponse(status="deleted")


@router.post("/communities/{slug}/join", response_model=MembershipResponse)
async def join_community(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityMembership:
    await require_handle(db, auth.user.id)
    community = await community_by_slug(db, slug)
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.community_id == community.id,
            CommunityMembership.user_id == auth.user.id,
        )
    )
    if community.visibility == CommunityVisibility.invite_only and (
        membership is None or membership.status != MembershipStatus.invited
    ):
        raise APIError(
            403,
            "invitation_required",
            "Invitation required",
            "This community can only be joined with an invitation.",
        )
    desired = (
        MembershipStatus.pending
        if community.visibility == CommunityVisibility.private
        and (membership is None or membership.status != MembershipStatus.invited)
        else MembershipStatus.active
    )
    if membership is None:
        membership = CommunityMembership(
            community_id=community.id,
            user_id=auth.user.id,
            role=CommunityRole.member,
            status=desired,
        )
        db.add(membership)
    elif membership.status != MembershipStatus.active:
        membership.status = desired
    await commit_and_refresh(db, membership)
    return membership


@router.delete("/communities/{slug}/leave", response_model=MessageResponse)
async def leave_community(
    slug: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    community = await community_by_slug(db, slug)
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.community_id == community.id,
            CommunityMembership.user_id == auth.user.id,
        )
    )
    if membership is None:
        raise APIError(
            404,
            "membership_not_found",
            "Membership not found",
            "You do not have a membership or request for this community.",
        )
    if membership.status == MembershipStatus.active:
        await ensure_owner_invariant(db, membership, None)
    await db.delete(membership)
    await db.commit()
    return MessageResponse(
        status="left" if membership.status == MembershipStatus.active else "cancelled"
    )


@router.post(
    "/communities/{slug}/invitations/{handle}",
    response_model=MembershipResponse,
)
async def invite_to_community(
    slug: str,
    handle: str,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityMembership:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin},
    )
    target = await profile_for_handle(db, handle)
    await ensure_not_blocked(db, auth.user.id, target.user_id)
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.community_id == community.id,
            CommunityMembership.user_id == target.user_id,
        )
    )
    if membership is None:
        membership = CommunityMembership(
            community_id=community.id,
            user_id=target.user_id,
            role=CommunityRole.member,
            status=MembershipStatus.invited,
            invited_by_id=auth.user.id,
        )
        db.add(membership)
    elif membership.status != MembershipStatus.active:
        membership.status = MembershipStatus.invited
        membership.invited_by_id = auth.user.id
    await db.flush()
    await create_notification(
        db,
        user_id=target.user_id,
        notification_type="community_invitation",
        actor_user_id=auth.user.id,
        target_type="community",
        target_id=community.id,
    )
    await commit_and_refresh(db, membership)
    return membership


@router.post(
    "/communities/{slug}/memberships/{membership_id}/approve",
    response_model=MembershipResponse,
)
async def approve_membership(
    slug: str,
    membership_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityMembership:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin, CommunityRole.moderator},
    )
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.id == membership_id,
            CommunityMembership.community_id == community.id,
            CommunityMembership.status == MembershipStatus.pending,
        )
    )
    if membership is None:
        raise APIError(
            404,
            "membership_request_not_found",
            "Membership request not found",
            "The pending membership request does not exist.",
        )
    membership.status = MembershipStatus.active
    await create_notification(
        db,
        user_id=membership.user_id,
        notification_type="community_membership_approved",
        actor_user_id=auth.user.id,
        target_type="community",
        target_id=community.id,
    )
    await commit_and_refresh(db, membership)
    return membership


@router.post(
    "/communities/{slug}/memberships/{membership_id}/reject",
    response_model=MembershipResponse,
)
async def reject_membership(
    slug: str,
    membership_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunityMembership:
    community = await community_by_slug(db, slug)
    await require_community_role(
        db,
        community.id,
        auth.user.id,
        {CommunityRole.owner, CommunityRole.admin, CommunityRole.moderator},
    )
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.id == membership_id,
            CommunityMembership.community_id == community.id,
            CommunityMembership.status == MembershipStatus.pending,
        )
    )
    if membership is None:
        raise APIError(
            404,
            "membership_request_not_found",
            "Membership request not found",
            "The pending membership request does not exist.",
        )
    membership.status = MembershipStatus.rejected
    await commit_and_refresh(db, membership)
    return membership


@router.patch(
    "/communities/{slug}/memberships/{membership_id}/role",
    response_model=MembershipResponse,
)
async def change_membership_role(
    slug: str,
    membership_id: uuid.UUID,
    payload: MembershipRolePatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CommunityMembership:
    community = await community_by_slug(db, slug)
    actor_membership = await require_community_role(
        db, community.id, auth.user.id, {CommunityRole.owner, CommunityRole.admin}
    )
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.id == membership_id,
            CommunityMembership.community_id == community.id,
            CommunityMembership.status == MembershipStatus.active,
        )
    )
    if membership is None:
        raise APIError(
            404,
            "membership_not_found",
            "Membership not found",
            "The active membership does not exist.",
        )
    if payload.role == CommunityRole.owner and actor_membership.role != CommunityRole.owner:
        raise APIError(
            403,
            "community_permission_denied",
            "Community permission denied",
            "Only an owner can assign the owner role.",
        )
    if membership.role == CommunityRole.owner and actor_membership.role != CommunityRole.owner:
        raise APIError(
            403,
            "community_permission_denied",
            "Community permission denied",
            "Only an owner can change another owner's role.",
        )
    await ensure_owner_invariant(db, membership, payload.role)
    old_role = membership.role
    membership.role = payload.role
    add_audit_event(
        db,
        request,
        settings,
        "social.community_role_changed",
        actor_user_id=auth.user.id,
        target_user_id=membership.user_id,
        metadata={
            "community_id": str(community.id),
            "old_role": old_role.value,
            "new_role": payload.role.value,
        },
    )
    await commit_and_refresh(db, membership)
    return membership


@router.delete(
    "/communities/{slug}/memberships/{membership_id}",
    response_model=MessageResponse,
)
async def remove_membership(
    slug: str,
    membership_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    community = await community_by_slug(db, slug)
    actor_membership = await require_community_role(
        db, community.id, auth.user.id, {CommunityRole.owner, CommunityRole.admin}
    )
    membership = await db.scalar(
        select(CommunityMembership).where(
            CommunityMembership.id == membership_id,
            CommunityMembership.community_id == community.id,
        )
    )
    if membership is None:
        raise APIError(
            404,
            "membership_not_found",
            "Membership not found",
            "The membership does not exist.",
        )
    if membership.role == CommunityRole.owner and actor_membership.role != CommunityRole.owner:
        raise APIError(
            403,
            "community_permission_denied",
            "Community permission denied",
            "Only an owner can remove another owner.",
        )
    await ensure_owner_invariant(db, membership, None)
    await db.delete(membership)
    await db.commit()
    return MessageResponse(status="removed")


async def validate_post_community(
    db: AsyncSession,
    user_id: uuid.UUID,
    community_id: uuid.UUID | None,
    channel_id: uuid.UUID | None,
) -> None:
    if community_id is None:
        return
    community = await db.scalar(
        select(Community).where(Community.id == community_id, Community.deleted_at.is_(None))
    )
    if community is None or await active_membership(db, community_id, user_id) is None:
        raise APIError(
            403,
            "community_post_denied",
            "Community posting denied",
            "An active community membership is required.",
        )
    if channel_id is not None:
        channel = await db.scalar(
            select(Channel).where(
                Channel.id == channel_id,
                Channel.community_id == community_id,
                Channel.deleted_at.is_(None),
            )
        )
        if channel is None:
            raise APIError(
                422,
                "invalid_channel",
                "Invalid channel",
                "The channel does not belong to the selected community.",
            )


@router.get("/posts", response_model=PostPageResponse)
async def list_posts(
    author: str | None = Query(default=None, min_length=3, max_length=30),
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PostPageResponse:
    profile = (
        await profile_for_handle(db, author)
        if author is not None
        else await require_handle(db, auth.user.id)
    )
    scope = f"posts:{profile.user_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    if profile.user_id == auth.user.id:
        statement = select(Post).where(
            Post.author_id == auth.user.id,
            Post.lifecycle != PostLifecycle.deleted,
            Post.deleted_at.is_(None),
        )
    else:
        statement = select(Post).where(
            Post.author_id == profile.user_id,
            accessible_post_condition(auth.user.id),
        )
    statement = apply_cursor(statement, Post.created_at, Post.id, cursor_value)
    posts = list(
        (
            await db.scalars(
                statement.order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = posts[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(posts) > limit and visible
        else None
    )
    return PostPageResponse(
        items=[await post_response(db, auth.user.id, post) for post in visible],
        next_cursor=next_cursor,
    )


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PostResponse:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="posts",
        subject=str(auth.user.id),
        limit=settings.post_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    await validate_post_community(db, auth.user.id, payload.community_id, payload.channel_id)
    values = payload.model_dump(exclude={"poll"})
    values["media_references"] = [
        reference.model_dump(mode="json") for reference in payload.media_references
    ]
    if payload.link_url is not None:
        values["link_url"] = str(payload.link_url)
    post = Post(
        author_id=auth.user.id,
        published_at=utcnow() if payload.lifecycle == PostLifecycle.published else None,
        **values,
    )
    db.add(post)
    await db.flush()
    if payload.poll is not None:
        for position, option in enumerate(payload.poll.options):
            db.add(
                PollOption(
                    post_id=post.id,
                    text=option.text,
                    position=position,
                    closes_at=payload.poll.closes_at,
                )
            )
    await db.commit()
    await db.refresh(post)
    return await post_response(db, auth.user.id, post)


@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PostResponse:
    owned = await db.scalar(
        select(Post).where(
            Post.id == post_id, Post.author_id == auth.user.id, Post.deleted_at.is_(None)
        )
    )
    post = owned or await visible_post(db, auth.user.id, post_id)
    return await post_response(db, auth.user.id, post)


@router.patch("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: uuid.UUID,
    payload: PostPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PostResponse:
    post = await db.scalar(
        select(Post).where(
            Post.id == post_id,
            Post.author_id == auth.user.id,
            Post.deleted_at.is_(None),
        )
    )
    if post is None:
        raise APIError(404, "post_not_found", "Post not found", "The post does not exist.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "media_references" and value is not None:
            value = [
                reference.model_dump(mode="json") for reference in payload.media_references or []
            ]
        setattr(post, field, value)
    if post.lifecycle == PostLifecycle.archived and post.archived_at is None:
        post.archived_at = utcnow()
    post.edited_at = utcnow()
    await db.commit()
    await db.refresh(post)
    return await post_response(db, auth.user.id, post)


@router.post("/posts/{post_id}/publish", response_model=PostResponse)
async def publish_post(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PostResponse:
    post = await db.scalar(
        select(Post).where(
            Post.id == post_id,
            Post.author_id == auth.user.id,
            Post.lifecycle == PostLifecycle.draft,
            Post.deleted_at.is_(None),
        )
    )
    if post is None:
        raise APIError(
            409,
            "post_not_publishable",
            "Post cannot be published",
            "Only an owned draft can be published.",
        )
    post.lifecycle = PostLifecycle.published
    post.published_at = utcnow()
    await db.commit()
    await db.refresh(post)
    return await post_response(db, auth.user.id, post)


@router.delete("/posts/{post_id}", response_model=MessageResponse)
async def delete_post(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    post = await db.scalar(select(Post).where(Post.id == post_id, Post.author_id == auth.user.id))
    if post is None:
        raise APIError(404, "post_not_found", "Post not found", "The post does not exist.")
    post.lifecycle = PostLifecycle.deleted
    post.deleted_at = utcnow()
    post.body = ""
    post.media_references = []
    post.link_url = None
    await db.commit()
    return MessageResponse(status="deleted")


@router.get("/feed", response_model=PostPageResponse)
async def get_feed(
    mode: Literal["following", "communities", "chronological"] = "chronological",
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> PostPageResponse:
    cursor_value = decode_cursor(settings, f"feed:{mode}", cursor)
    statement = select(Post).where(
        accessible_post_condition(auth.user.id),
        Post.published_at.is_not(None),
        ~exists(
            select(Mute.muter_id).where(
                Mute.muter_id == auth.user.id, Mute.muted_id == Post.author_id
            )
        ),
    )
    if mode == "following":
        statement = statement.where(
            exists(
                select(Follow.id).where(
                    Follow.follower_id == auth.user.id,
                    Follow.followed_id == Post.author_id,
                )
            )
        )
    elif mode == "communities":
        statement = statement.where(
            exists(
                select(CommunityMembership.id).where(
                    CommunityMembership.user_id == auth.user.id,
                    CommunityMembership.community_id == Post.community_id,
                    CommunityMembership.status == MembershipStatus.active,
                )
            )
        )
    statement = apply_cursor(statement, Post.published_at, Post.id, cursor_value)
    posts = list(
        (
            await db.scalars(
                statement.order_by(Post.published_at.desc(), Post.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    has_more = len(posts) > limit
    visible = posts[:limit]
    next_cursor = None
    if has_more and visible and visible[-1].published_at is not None:
        next_cursor = encode_cursor(
            settings, f"feed:{mode}", visible[-1].published_at, visible[-1].id
        )
    return PostPageResponse(
        items=[await post_response(db, auth.user.id, post) for post in visible],
        next_cursor=next_cursor,
    )


@router.get("/recommendations", response_model=list[RecommendationResponse])
async def get_recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[RecommendationResponse]:
    posts = list(
        (
            await db.scalars(
                select(Post)
                .where(
                    accessible_post_condition(auth.user.id),
                    Post.published_at.is_not(None),
                    Post.author_id != auth.user.id,
                    ~exists(
                        select(Mute.muter_id).where(
                            Mute.muter_id == auth.user.id,
                            Mute.muted_id == Post.author_id,
                        )
                    ),
                )
                .order_by(Post.published_at.desc())
                .limit(200)
            )
        ).all()
    )
    followed_ids = set(
        (
            await db.scalars(select(Follow.followed_id).where(Follow.follower_id == auth.user.id))
        ).all()
    )
    community_ids = set(
        (
            await db.scalars(
                select(CommunityMembership.community_id).where(
                    CommunityMembership.user_id == auth.user.id,
                    CommunityMembership.status == MembershipStatus.active,
                )
            )
        ).all()
    )
    category_rows = (
        await db.scalars(
            select(Post.category).where(Post.author_id == auth.user.id, Post.category.is_not(None))
        )
    ).all()
    categories = {category for category in category_rows if category}
    now = utcnow()
    scored: list[tuple[float, Post, list[str]]] = []
    for post in posts:
        explanations: list[str] = []
        score = 0.0
        if post.author_id in followed_ids:
            score += 3.0
            explanations.append("author_you_follow")
        if post.community_id in community_ids:
            score += 2.0
            explanations.append("community_you_joined")
        if post.category and post.category in categories:
            score += 1.5
            explanations.append(f"category:{post.category}")
        published = post.published_at
        if published is not None:
            aware_published = (
                published.replace(tzinfo=UTC) if published.tzinfo is None else published
            )
            recency = max(0.0, 2.0 - (now - aware_published).total_seconds() / 604_800)
            score += recency
            if recency > 0:
                explanations.append("recent")
        if explanations:
            scored.append((score, post, explanations))
    scored.sort(key=lambda item: (item[0], item[1].published_at, item[1].id), reverse=True)
    return [
        RecommendationResponse(
            post=await post_response(db, auth.user.id, post),
            score=round(score, 4),
            explanations=explanations,
        )
        for score, post, explanations in scored[:limit]
    ]


async def comment_response(db: AsyncSession, comment: Comment) -> CommentResponse:
    handle = await db.scalar(select(Profile.handle).where(Profile.user_id == comment.author_id))
    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        author_id=comment.author_id,
        author_handle=handle or "deleted",
        parent_id=comment.parent_id,
        body="[deleted]" if comment.deleted_at else comment.body,
        created_at=comment.created_at,
        edited_at=comment.edited_at,
        deleted_at=comment.deleted_at,
    )


@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[CommentResponse]:
    await visible_post(db, auth.user.id, post_id)
    comments = (
        await db.scalars(
            select(Comment)
            .where(
                Comment.post_id == post_id,
                not_blocked_condition(auth.user.id, Comment.author_id),
            )
            .order_by(Comment.created_at.asc())
        )
    ).all()
    return [await comment_response(db, comment) for comment in comments]


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: uuid.UUID,
    payload: CommentCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CommentResponse:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="comments",
        subject=str(auth.user.id),
        limit=settings.comment_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    post = await visible_post(db, auth.user.id, post_id)
    comment = Comment(post_id=post.id, author_id=auth.user.id, body=payload.body)
    db.add(comment)
    await db.flush()
    await create_notification(
        db,
        user_id=post.author_id,
        notification_type="comment",
        actor_user_id=auth.user.id,
        target_type="post",
        target_id=post.id,
    )
    await commit_and_refresh(db, comment)
    return await comment_response(db, comment)


@router.post(
    "/comments/{comment_id}/replies",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply(
    comment_id: uuid.UUID,
    payload: CommentCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> CommentResponse:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="comments",
        subject=str(auth.user.id),
        limit=settings.comment_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    parent = await db.scalar(
        select(Comment).where(Comment.id == comment_id, Comment.deleted_at.is_(None))
    )
    if parent is None:
        raise APIError(404, "comment_not_found", "Comment not found", "The comment does not exist.")
    await visible_post(db, auth.user.id, parent.post_id)
    if parent.parent_id is not None:
        raise APIError(
            422,
            "reply_depth_exceeded",
            "Reply depth exceeded",
            "Replies are limited to one nested level.",
        )
    reply = Comment(
        post_id=parent.post_id,
        author_id=auth.user.id,
        parent_id=parent.id,
        body=payload.body,
    )
    db.add(reply)
    await db.flush()
    await create_notification(
        db,
        user_id=parent.author_id,
        notification_type="reply",
        actor_user_id=auth.user.id,
        target_type="comment",
        target_id=parent.id,
    )
    await commit_and_refresh(db, reply)
    return await comment_response(db, reply)


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: uuid.UUID,
    payload: CommentPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommentResponse:
    comment = await db.scalar(
        select(Comment).where(
            Comment.id == comment_id,
            Comment.author_id == auth.user.id,
            Comment.deleted_at.is_(None),
        )
    )
    if comment is None:
        raise APIError(404, "comment_not_found", "Comment not found", "The comment does not exist.")
    comment.body = payload.body
    comment.edited_at = utcnow()
    await commit_and_refresh(db, comment)
    return await comment_response(db, comment)


@router.delete("/comments/{comment_id}", response_model=MessageResponse)
async def delete_comment(
    comment_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    comment = await db.scalar(
        select(Comment).where(Comment.id == comment_id, Comment.author_id == auth.user.id)
    )
    if comment is None:
        raise APIError(404, "comment_not_found", "Comment not found", "The comment does not exist.")
    comment.deleted_at = utcnow()
    comment.body = ""
    await db.commit()
    return MessageResponse(status="deleted")


async def validate_reaction_target(
    db: AsyncSession, viewer_id: uuid.UUID, target_type: str, target_id: uuid.UUID
) -> uuid.UUID:
    if target_type == "post":
        return (await visible_post(db, viewer_id, target_id)).author_id
    comment = await db.scalar(
        select(Comment).where(Comment.id == target_id, Comment.deleted_at.is_(None))
    )
    if comment is None:
        raise APIError(404, "comment_not_found", "Comment not found", "The comment does not exist.")
    await visible_post(db, viewer_id, comment.post_id)
    await ensure_not_blocked(db, viewer_id, comment.author_id)
    return comment.author_id


@router.put(
    "/reactions/{target_type}/{target_id}",
    response_model=ReactionResponse,
)
async def set_reaction(
    target_type: Literal["post", "comment"],
    target_id: uuid.UUID,
    payload: ReactionRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Reaction:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="reactions",
        subject=str(auth.user.id),
        limit=settings.reaction_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    target_author_id = await validate_reaction_target(db, auth.user.id, target_type, target_id)
    reaction = await db.scalar(
        select(Reaction).where(
            Reaction.user_id == auth.user.id,
            Reaction.target_type == target_type,
            Reaction.target_id == target_id,
        )
    )
    if reaction is None:
        reaction = Reaction(
            user_id=auth.user.id,
            target_type=target_type,
            target_id=target_id,
            value=payload.value,
        )
        db.add(reaction)
    else:
        reaction.value = payload.value
    await db.flush()
    await create_notification(
        db,
        user_id=target_author_id,
        notification_type="reaction",
        actor_user_id=auth.user.id,
        target_type=target_type,
        target_id=target_id,
        metadata={"reaction": payload.value.value},
    )
    await commit_and_refresh(db, reaction)
    return reaction


@router.delete("/reactions/{target_type}/{target_id}", response_model=MessageResponse)
async def remove_reaction(
    target_type: Literal["post", "comment"],
    target_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await db.execute(
        delete(Reaction).where(
            Reaction.user_id == auth.user.id,
            Reaction.target_type == target_type,
            Reaction.target_id == target_id,
        )
    )
    await db.commit()
    return MessageResponse(status="removed")


@router.post("/posts/{post_id}/repost", response_model=MessageResponse)
async def repost(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await require_handle(db, auth.user.id)
    post = await visible_post(db, auth.user.id, post_id)
    existing = await db.scalar(
        select(Repost).where(Repost.user_id == auth.user.id, Repost.post_id == post.id)
    )
    if existing is None:
        db.add(Repost(user_id=auth.user.id, post_id=post.id))
        await create_notification(
            db,
            user_id=post.author_id,
            notification_type="repost",
            actor_user_id=auth.user.id,
            target_type="post",
            target_id=post.id,
        )
        await db.commit()
    return MessageResponse(status="reposted")


@router.delete("/posts/{post_id}/repost", response_model=MessageResponse)
async def remove_repost(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await db.execute(
        delete(Repost).where(Repost.user_id == auth.user.id, Repost.post_id == post_id)
    )
    await db.commit()
    return MessageResponse(status="removed")


@router.post("/posts/{post_id}/bookmark", response_model=MessageResponse)
async def bookmark(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await require_handle(db, auth.user.id)
    await visible_post(db, auth.user.id, post_id)
    existing = await db.scalar(
        select(Bookmark).where(Bookmark.user_id == auth.user.id, Bookmark.post_id == post_id)
    )
    if existing is None:
        db.add(Bookmark(user_id=auth.user.id, post_id=post_id))
        await db.commit()
    return MessageResponse(status="bookmarked")


@router.delete("/posts/{post_id}/bookmark", response_model=MessageResponse)
async def remove_bookmark(
    post_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await db.execute(
        delete(Bookmark).where(Bookmark.user_id == auth.user.id, Bookmark.post_id == post_id)
    )
    await db.commit()
    return MessageResponse(status="removed")


@router.get("/bookmarks", response_model=list[PostResponse])
async def list_bookmarks(
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[PostResponse]:
    posts = (
        await db.scalars(
            select(Post)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(
                Bookmark.user_id == auth.user.id,
                accessible_post_condition(auth.user.id),
            )
            .order_by(Bookmark.created_at.desc())
            .limit(limit)
        )
    ).all()
    return [await post_response(db, auth.user.id, post) for post in posts]


@router.post("/polls/{post_id}/vote", response_model=PollVoteResponse)
async def vote_poll(
    post_id: uuid.UUID,
    payload: PollVoteRequest,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PollVoteResponse:
    await require_handle(db, auth.user.id)
    post = await visible_post(db, auth.user.id, post_id)
    if post.kind != PostKind.poll:
        raise APIError(422, "not_a_poll", "Not a poll", "The selected post is not a poll.")
    option = await db.scalar(
        select(PollOption).where(PollOption.id == payload.option_id, PollOption.post_id == post.id)
    )
    if option is None:
        raise APIError(
            422, "invalid_poll_option", "Invalid poll option", "Select an option from this poll."
        )
    if option.closes_at is not None:
        closes_at = (
            option.closes_at.replace(tzinfo=UTC)
            if option.closes_at.tzinfo is None
            else option.closes_at
        )
        if closes_at <= utcnow():
            raise APIError(409, "poll_closed", "Poll closed", "This poll is closed.")
    vote = await db.scalar(
        select(PollVote).where(PollVote.post_id == post.id, PollVote.user_id == auth.user.id)
    )
    if vote is None:
        vote = PollVote(post_id=post.id, option_id=option.id, user_id=auth.user.id)
        db.add(vote)
    else:
        vote.option_id = option.id
    await db.commit()
    return PollVoteResponse(post_id=post.id, option_id=option.id)


@router.get("/search/users", response_model=UserSearchResponse)
async def search_users(
    q: str = Query(min_length=2, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> UserSearchResponse:
    pattern = f"%{normalized_search_query(q)}%"
    statement = (
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
            or_(Profile.handle.ilike(pattern), Profile.display_name.ilike(pattern)),
        )
        .order_by(Profile.handle.asc())
        .offset((page - 1) * limit)
        .limit(limit + 1)
    )
    profiles = list((await db.scalars(statement)).all())
    return UserSearchResponse(
        items=[
            await public_profile_response(db, auth.user.id, profile) for profile in profiles[:limit]
        ],
        page=page,
        has_more=len(profiles) > limit,
    )


@router.get("/search/posts", response_model=PostSearchResponse)
async def search_posts(
    q: str = Query(min_length=2, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PostSearchResponse:
    pattern = f"%{normalized_search_query(q)}%"
    posts = list(
        (
            await db.scalars(
                select(Post)
                .where(
                    accessible_post_condition(auth.user.id),
                    Post.body.ilike(pattern),
                )
                .order_by(Post.published_at.desc(), Post.id.desc())
                .offset((page - 1) * limit)
                .limit(limit + 1)
            )
        ).all()
    )
    return PostSearchResponse(
        items=[await post_response(db, auth.user.id, post) for post in posts[:limit]],
        page=page,
        has_more=len(posts) > limit,
    )


@router.get("/search/communities", response_model=CommunitySearchResponse)
async def search_communities(
    q: str = Query(min_length=2, max_length=100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> CommunitySearchResponse:
    pattern = f"%{normalized_search_query(q)}%"
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
                .order_by(Community.name.asc())
                .offset((page - 1) * limit)
                .limit(limit + 1)
            )
        ).all()
    )
    return CommunitySearchResponse(
        items=[
            await community_response(db, community, auth.user.id)
            for community in communities[:limit]
        ],
        page=page,
        has_more=len(communities) > limit,
    )


@router.get("/notifications", response_model=NotificationPageResponse)
async def list_notifications(
    cursor: str | None = None,
    include_muted: bool = False,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> NotificationPageResponse:
    cursor_value = decode_cursor(settings, "notifications", cursor)
    statement = select(Notification).where(
        Notification.user_id == auth.user.id,
        or_(
            Notification.actor_user_id.is_(None),
            not_blocked_condition(auth.user.id, Notification.actor_user_id),
        ),
    )
    if not include_muted:
        statement = statement.where(Notification.muted_at.is_(None))
    statement = apply_cursor(statement, Notification.created_at, Notification.id, cursor_value)
    notifications = list(
        (
            await db.scalars(
                statement.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = notifications[:limit]
    next_cursor = (
        encode_cursor(settings, "notifications", visible[-1].created_at, visible[-1].id)
        if len(notifications) > limit and visible
        else None
    )
    return NotificationPageResponse(
        items=[NotificationResponse.model_validate(item) for item in visible],
        next_cursor=next_cursor,
    )


@router.post("/notifications/read-all", response_model=MessageResponse)
async def read_all_notifications(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == auth.user.id, Notification.read_at.is_(None))
        .values(read_at=utcnow())
    )
    await db.commit()
    return MessageResponse(status="read")


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Notification:
    notification = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == auth.user.id,
        )
    )
    if notification is None:
        raise APIError(
            404,
            "notification_not_found",
            "Notification not found",
            "The notification does not exist.",
        )
    notification.read_at = notification.read_at or utcnow()
    await commit_and_refresh(db, notification)
    return notification


@router.put(
    "/notifications/mutes/{notification_type}",
    response_model=NotificationPreferenceResponse,
)
async def set_notification_mute(
    notification_type: str,
    payload: NotificationMuteRequest,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> NotificationPreference:
    if not notification_type or len(notification_type) > 64:
        raise APIError(
            422,
            "invalid_notification_type",
            "Invalid notification type",
            "Notification types must contain between 1 and 64 characters.",
        )
    preference = await db.scalar(
        select(NotificationPreference).where(
            NotificationPreference.user_id == auth.user.id,
            NotificationPreference.notification_type == notification_type,
        )
    )
    if preference is None:
        preference = NotificationPreference(
            user_id=auth.user.id,
            notification_type=notification_type,
            muted=payload.muted,
        )
        db.add(preference)
    else:
        preference.muted = payload.muted
    if payload.muted:
        await db.execute(
            update(Notification)
            .where(
                Notification.user_id == auth.user.id,
                Notification.notification_type == notification_type,
                Notification.muted_at.is_(None),
            )
            .values(muted_at=utcnow())
        )
    await commit_and_refresh(db, preference)
    return preference


async def validate_report_target(
    db: AsyncSession, reporter_id: uuid.UUID, target_type: str, target_id: uuid.UUID
) -> None:
    if target_type == "post":
        await visible_post(db, reporter_id, target_id)
    elif target_type == "comment":
        comment = await db.get(Comment, target_id)
        if comment is None:
            raise APIError(
                404, "target_not_found", "Target not found", "The report target does not exist."
            )
        await visible_post(db, reporter_id, comment.post_id)
    elif target_type == "user":
        profile = await db.get(Profile, target_id)
        if profile is None or not await can_view_profile(db, reporter_id, target_id):
            raise APIError(
                404, "target_not_found", "Target not found", "The report target does not exist."
            )
    elif target_type == "community":
        community = await db.get(Community, target_id)
        if community is None or community.deleted_at is not None:
            raise APIError(
                404, "target_not_found", "Target not found", "The report target does not exist."
            )
    elif target_type == "message":
        from app.social_models import ConversationParticipant, Message

        message = await db.get(Message, target_id)
        participant = (
            await db.get(
                ConversationParticipant,
                {"conversation_id": message.conversation_id, "user_id": reporter_id},
            )
            if message is not None and message.conversation_id is not None
            else None
        )
        if message is None or participant is None:
            raise APIError(
                404, "target_not_found", "Target not found", "The report target does not exist."
            )


@router.post(
    "/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    payload: ReportCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ContentReport:
    await require_handle(db, auth.user.id)
    await validate_report_target(db, auth.user.id, payload.target_type, payload.target_id)
    duplicate = await db.scalar(
        select(ContentReport.id).where(
            ContentReport.reporter_id == auth.user.id,
            ContentReport.target_type == payload.target_type,
            ContentReport.target_id == payload.target_id,
        )
    )
    if duplicate is not None:
        raise APIError(
            409,
            "report_already_submitted",
            "Report already submitted",
            "You have already reported this target.",
        )
    report = ContentReport(reporter_id=auth.user.id, **payload.model_dump())
    db.add(report)
    await db.flush()
    add_audit_event(
        db,
        request,
        settings,
        "social.content_reported",
        actor_user_id=auth.user.id,
        metadata={
            "report_id": str(report.id),
            "target_type": report.target_type,
            "target_id": str(report.target_id),
        },
    )
    await commit_and_refresh(db, report)
    return report


@router.get("/moderation/reports", response_model=ReportPageResponse)
async def moderation_queue(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ReportPageResponse:
    cursor_value = decode_cursor(settings, "moderation_reports", cursor)
    statement = select(ContentReport).where(
        ContentReport.status.in_([ReportStatus.open, ReportStatus.reviewing])
    )
    statement = apply_cursor(statement, ContentReport.created_at, ContentReport.id, cursor_value)
    reports = list(
        (
            await db.scalars(
                statement.order_by(ContentReport.created_at.desc(), ContentReport.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = reports[:limit]
    next_cursor = (
        encode_cursor(
            settings,
            "moderation_reports",
            visible[-1].created_at,
            visible[-1].id,
        )
        if len(reports) > limit and visible
        else None
    )
    return ReportPageResponse(
        items=[ReportResponse.model_validate(report) for report in visible],
        next_cursor=next_cursor,
    )


async def report_target_user_id(db: AsyncSession, report: ContentReport) -> uuid.UUID | None:
    if report.target_type == "user":
        return report.target_id
    if report.target_type == "post":
        return await db.scalar(select(Post.author_id).where(Post.id == report.target_id))
    if report.target_type == "comment":
        return await db.scalar(select(Comment.author_id).where(Comment.id == report.target_id))
    if report.target_type == "message":
        from app.social_models import Message

        return await db.scalar(select(Message.sender_id).where(Message.id == report.target_id))
    return None


@router.post(
    "/moderation/reports/{report_id}/decision",
    response_model=ReportResponse,
)
async def decide_report(
    report_id: uuid.UUID,
    payload: ModerationDecisionRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ContentReport:
    report = await db.get(ContentReport, report_id)
    if report is None:
        raise APIError(404, "report_not_found", "Report not found", "The report does not exist.")
    if report.status in {ReportStatus.resolved, ReportStatus.dismissed}:
        raise APIError(
            409,
            "report_already_decided",
            "Report already decided",
            "A final moderation decision already exists.",
        )
    report.status = payload.status
    db.add(
        ModerationAction(
            report_id=report.id,
            moderator_id=auth.user.id,
            action=payload.action,
            notes=payload.notes,
        )
    )
    if payload.action in {"hide_content", "remove_content"}:
        if report.target_type == "post":
            post = await db.get(Post, report.target_id)
            if post is not None:
                post.lifecycle = (
                    PostLifecycle.deleted
                    if payload.action == "remove_content"
                    else PostLifecycle.archived
                )
                post.deleted_at = (
                    utcnow() if payload.action == "remove_content" else post.deleted_at
                )
                post.archived_at = utcnow()
        elif report.target_type == "comment":
            comment = await db.get(Comment, report.target_id)
            if comment is not None:
                comment.deleted_at = utcnow()
                comment.body = ""
    target_user_id = await report_target_user_id(db, report)
    if payload.action == "suspend_user" and target_user_id is not None:
        target_user = await db.get(User, target_user_id)
        if target_user is not None:
            target_user.status = UserStatus.suspended
            target_user.token_version += 1
    await create_notification(
        db,
        user_id=target_user_id or report.reporter_id,
        notification_type="moderation_decision",
        actor_user_id=auth.user.id,
        target_type="report",
        target_id=report.id,
        metadata={"status": payload.status.value, "action": payload.action},
    )
    add_audit_event(
        db,
        request,
        settings,
        "social.moderation_decision",
        actor_user_id=auth.user.id,
        target_user_id=target_user_id,
        metadata={
            "report_id": str(report.id),
            "status": payload.status.value,
            "action": payload.action,
        },
    )
    await commit_and_refresh(db, report)
    return report
