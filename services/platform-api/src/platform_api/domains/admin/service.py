import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from platform_api.domains.admin.models import AuditLog
from platform_api.domains.content.models import Post
from platform_api.domains.identity.models import User, UserStatus
from platform_api.domains.profile.models import Profile
from platform_api.domains.social_graph.models import Follow


class AdminService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def stats(self) -> dict:
        users = await self.db.scalar(select(func.count()).select_from(User))
        posts = await self.db.scalar(
            select(func.count()).select_from(Post).where(Post.deleted_at.is_(None))
        )
        follows = await self.db.scalar(select(func.count()).select_from(Follow))
        active = await self.db.scalar(
            select(func.count()).select_from(User).where(User.status == UserStatus.ACTIVE)
        )
        return {
            "users_total": int(users or 0),
            "users_active": int(active or 0),
            "posts_total": int(posts or 0),
            "follows_total": int(follows or 0),
        }

    async def list_users(self, *, limit: int = 50, offset: int = 0) -> list[dict]:
        result = await self.db.execute(
            select(User, Profile)
            .join(Profile, Profile.user_id == User.id)
            .order_by(User.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return [
            {
                "id": str(user.id),
                "email": user.email,
                "handle": profile.handle,
                "display_name": profile.display_name,
                "status": user.status.value,
                "system_role": user.system_role.value,
                "created_at": user.created_at.isoformat(),
            }
            for user, profile in result.all()
        ]

    async def log_action(
        self,
        *,
        actor_id: uuid.UUID | None,
        action: str,
        entity_type: str,
        entity_id: str | None = None,
        details: dict | None = None,
        ip_address: str | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details or {},
                ip_address=ip_address,
            )
        )
        await self.db.commit()
