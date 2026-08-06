from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.domains.identity.models import User
from platform_api.domains.notifications.models import Notification, NotificationType
from platform_api.domains.profile.models import Profile
from platform_api.infrastructure.redis import publish_notification_event


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def notify_follow(self, *, recipient_id: UUID, actor_id: UUID, entity_id: UUID) -> None:
        if recipient_id == actor_id:
            return
        notification = await self._create(
            user_id=recipient_id,
            actor_id=actor_id,
            type=NotificationType.FOLLOW,
            entity_type="user",
            entity_id=entity_id,
            payload={},
        )
        actor = await self.db.scalar(select(Profile).where(Profile.user_id == actor_id))
        if actor:
            await self.emit_realtime(notification, actor)

    async def notify_reaction(
        self,
        *,
        recipient_id: UUID,
        actor_id: UUID,
        post_id: UUID,
        kind: str,
    ) -> None:
        if recipient_id == actor_id:
            return
        notification = await self._create(
            user_id=recipient_id,
            actor_id=actor_id,
            type=NotificationType.REACTION,
            entity_type="post",
            entity_id=post_id,
            payload={"kind": kind},
        )
        actor = await self.db.scalar(select(Profile).where(Profile.user_id == actor_id))
        if actor:
            await self.emit_realtime(notification, actor)

    async def notify_comment(
        self,
        *,
        recipient_id: UUID,
        actor_id: UUID,
        post_id: UUID,
        comment_id: UUID,
        preview: str,
    ) -> None:
        if recipient_id == actor_id:
            return
        notification = await self._create(
            user_id=recipient_id,
            actor_id=actor_id,
            type=NotificationType.COMMENT,
            entity_type="post",
            entity_id=post_id,
            payload={"comment_id": str(comment_id), "preview": preview[:120]},
        )
        actor = await self.db.scalar(select(Profile).where(Profile.user_id == actor_id))
        if actor:
            await self.emit_realtime(notification, actor)

    async def _create(
        self,
        *,
        user_id: UUID,
        actor_id: UUID,
        type: NotificationType,
        entity_type: str,
        entity_id: UUID,
        payload: dict,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=type,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
        )
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def emit_realtime(self, notification: Notification, actor: Profile) -> None:
        await publish_notification_event(
            str(notification.user_id),
            {
                "id": str(notification.id),
                "type": notification.type.value,
                "entity_type": notification.entity_type,
                "entity_id": str(notification.entity_id),
                "payload": notification.payload,
                "created_at": notification.created_at.isoformat(),
                "actor": {
                    "id": str(actor.user_id),
                    "handle": actor.handle,
                    "display_name": actor.display_name,
                },
            },
        )

    async def list_for_user(self, user_id: UUID, *, limit: int = 30) -> tuple[list[dict], int]:
        from sqlalchemy import func

        unread_count = await self.db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
        )
        result = await self.db.execute(
            select(Notification, Profile, User)
            .join(User, User.id == Notification.actor_id)
            .join(Profile, Profile.user_id == User.id)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        items = []
        for notification, profile, _user in result.all():
            items.append(
                {
                    "id": notification.id,
                    "type": notification.type.value,
                    "entity_type": notification.entity_type,
                    "entity_id": notification.entity_id,
                    "payload": notification.payload,
                    "read": notification.read_at is not None,
                    "created_at": notification.created_at,
                    "actor": {
                        "id": profile.user_id,
                        "handle": profile.handle,
                        "display_name": profile.display_name,
                    },
                }
            )
        return items, int(unread_count or 0)

    async def mark_read(self, user_id: UUID, notification_id: UUID) -> None:
        from datetime import UTC, datetime

        notification = await self.db.get(Notification, notification_id)
        if notification is None or notification.user_id != user_id:
            return
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self.db.commit()
