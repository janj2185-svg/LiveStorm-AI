from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.core.exceptions import bad_request, conflict, forbidden
from platform_api.domains.notifications.service import NotificationService
from platform_api.domains.profile.models import Profile
from platform_api.domains.social_graph.models import Block, Follow


class SocialGraphService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.notifications = NotificationService(db)

    async def follow(self, follower_id: UUID, target_handle: str) -> None:
        target = await self._profile_by_handle(target_handle)
        if target.user_id == follower_id:
            raise bad_request("cannot_follow_self", "You cannot follow yourself")

        if await self._is_blocked(follower_id, target.user_id):
            raise forbidden("Cannot follow this user")

        existing = await self.db.scalar(
            select(Follow.id).where(
                Follow.follower_id == follower_id,
                Follow.followed_id == target.user_id,
            )
        )
        if existing:
            return

        self.db.add(Follow(follower_id=follower_id, followed_id=target.user_id))
        await self.db.flush()
        await self.notifications.notify_follow(
            recipient_id=target.user_id,
            actor_id=follower_id,
            entity_id=target.user_id,
        )
        await self.db.commit()

    async def unfollow(self, follower_id: UUID, target_handle: str) -> None:
        target = await self._profile_by_handle(target_handle)
        result = await self.db.execute(
            select(Follow).where(
                Follow.follower_id == follower_id,
                Follow.followed_id == target.user_id,
            )
        )
        follow = result.scalar_one_or_none()
        if follow:
            await self.db.delete(follow)
            await self.db.commit()

    async def block(self, blocker_id: UUID, target_handle: str) -> None:
        target = await self._profile_by_handle(target_handle)
        if target.user_id == blocker_id:
            raise bad_request("cannot_block_self", "You cannot block yourself")

        existing = await self.db.scalar(
            select(Block.id).where(
                Block.blocker_id == blocker_id,
                Block.blocked_id == target.user_id,
            )
        )
        if not existing:
            self.db.add(Block(blocker_id=blocker_id, blocked_id=target.user_id))
            follows = (
                await self.db.execute(
                    select(Follow).where(
                        or_(
                            and_(
                                Follow.follower_id == blocker_id,
                                Follow.followed_id == target.user_id,
                            ),
                            and_(
                                Follow.follower_id == target.user_id,
                                Follow.followed_id == blocker_id,
                            ),
                        )
                    )
                )
            ).scalars().all()
            for follow in follows:
                await self.db.delete(follow)
            await self.db.commit()

    async def is_following(self, follower_id: UUID, followed_id: UUID) -> bool:
        result = await self.db.scalar(
            select(Follow.id).where(
                Follow.follower_id == follower_id,
                Follow.followed_id == followed_id,
            )
        )
        return result is not None

    async def _profile_by_handle(self, handle: str) -> Profile:
        from platform_api.core.exceptions import SyloraHTTPException
        from fastapi import status

        profile = await self.db.scalar(select(Profile).where(Profile.handle == handle.lower()))
        if profile is None:
            raise SyloraHTTPException(status.HTTP_404_NOT_FOUND, "not_found", "User not found")
        return profile

    async def _is_blocked(self, user_a: UUID, user_b: UUID) -> bool:
        result = await self.db.scalar(
            select(Block.id).where(
                or_(
                    and_(Block.blocker_id == user_a, Block.blocked_id == user_b),
                    and_(Block.blocker_id == user_b, Block.blocked_id == user_a),
                )
            )
        )
        return result is not None

    async def blocked_user_ids(self, viewer_id: UUID) -> set[UUID]:
        rows = await self.db.execute(
            select(Block.blocked_id).where(Block.blocker_id == viewer_id)
        )
        blocked = set(rows.scalars().all())
        rows = await self.db.execute(
            select(Block.blocker_id).where(Block.blocked_id == viewer_id)
        )
        blocked.update(rows.scalars().all())
        return blocked
