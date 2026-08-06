from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from platform_api.core.exceptions import bad_request, forbidden, unauthorized
from platform_api.domains.content.models import (
    Comment,
    Post,
    PostVisibility,
    Reaction,
    ReactionKind,
    ReactionTarget,
)
from platform_api.domains.content.schemas import (
    AuthorPublic,
    CommentPublic,
    PostCreateRequest,
    PostPublic,
)
from platform_api.domains.identity.models import User
from platform_api.domains.notifications.service import NotificationService
from platform_api.domains.profile.models import Profile
from platform_api.domains.social_graph.models import Follow
from platform_api.domains.social_graph.service import SocialGraphService


class ContentService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.social = SocialGraphService(db)
        self.notifications = NotificationService(db)

    async def create_post(self, author: User, payload: PostCreateRequest) -> PostPublic:
        visibility = PostVisibility(payload.visibility)
        post = Post(author_id=author.id, body=payload.body.strip(), visibility=visibility)
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        return await self._post_public(post, viewer_id=author.id)

    async def get_post(self, post_id: UUID, viewer_id: UUID | None) -> PostPublic:
        post = await self._get_visible_post(post_id, viewer_id)
        return await self._post_public(post, viewer_id=viewer_id)

    async def feed(self, viewer_id: UUID, *, limit: int = 20, cursor: str | None = None) -> tuple[list[PostPublic], str | None]:
        blocked = await self.social.blocked_user_ids(viewer_id)
        following_ids = await self.db.scalars(
            select(Follow.followed_id).where(Follow.follower_id == viewer_id)
        )
        author_ids = set(following_ids.all()) | {viewer_id}
        author_ids -= blocked

        query = (
            select(Post)
            .where(Post.deleted_at.is_(None), Post.author_id.in_(author_ids))
            .order_by(Post.created_at.desc())
            .limit(limit + 1)
        )
        if cursor:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(Post.created_at < cursor_dt)

        posts = (await self.db.execute(query)).scalars().all()
        next_cursor = None
        if len(posts) > limit:
            posts = posts[:limit]
            next_cursor = posts[-1].created_at.isoformat()

        items = [await self._post_public(post, viewer_id=viewer_id) for post in posts]
        return items, next_cursor

    async def explore(self, viewer_id: UUID | None, *, limit: int = 20) -> list[PostPublic]:
        blocked: set[UUID] = set()
        if viewer_id:
            blocked = await self.social.blocked_user_ids(viewer_id)

        query = (
            select(Post)
            .where(Post.deleted_at.is_(None), Post.visibility == PostVisibility.PUBLIC)
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        if blocked:
            query = query.where(Post.author_id.not_in(blocked))

        posts = (await self.db.execute(query)).scalars().all()
        return [await self._post_public(post, viewer_id=viewer_id) for post in posts]

    async def add_comment(
        self, author: User, post_id: UUID, body: str, parent_id: UUID | None
    ) -> CommentPublic:
        post = await self._get_visible_post(post_id, author.id)
        if parent_id:
            parent = await self.db.get(Comment, parent_id)
            if parent is None or parent.post_id != post.id or parent.deleted_at:
                raise bad_request("invalid_parent", "Invalid parent comment")

        comment = Comment(
            post_id=post.id,
            author_id=author.id,
            parent_id=parent_id,
            body=body.strip(),
        )
        self.db.add(comment)
        await self.db.flush()
        await self.notifications.notify_comment(
            recipient_id=post.author_id,
            actor_id=author.id,
            post_id=post.id,
            comment_id=comment.id,
            preview=body,
        )
        await self.db.commit()
        await self.db.refresh(comment)
        return await self._comment_public(comment)

    async def list_comments(self, post_id: UUID, viewer_id: UUID | None) -> list[CommentPublic]:
        await self._get_visible_post(post_id, viewer_id)
        result = await self.db.execute(
            select(Comment)
            .where(Comment.post_id == post_id, Comment.deleted_at.is_(None))
            .order_by(Comment.created_at.asc())
        )
        comments = result.scalars().all()
        return [await self._comment_public(c) for c in comments]

    async def toggle_reaction(
        self, user: User, target_type: str, target_id: UUID, kind: str
    ) -> dict[str, int | bool]:
        reaction_target = ReactionTarget(target_type)
        reaction_kind = ReactionKind(kind)

        post_author_id: UUID | None = None
        if reaction_target == ReactionTarget.POST:
            post = await self._get_visible_post(target_id, user.id)
            post_author_id = post.author_id
        else:
            comment = await self.db.get(Comment, target_id)
            if comment is None or comment.deleted_at:
                raise bad_request("not_found", "Comment not found")
            post = await self._get_visible_post(comment.post_id, user.id)
            post_author_id = post.author_id

        existing = await self.db.scalar(
            select(Reaction).where(
                Reaction.user_id == user.id,
                Reaction.target_type == reaction_target,
                Reaction.target_id == target_id,
            )
        )
        if existing:
            await self.db.delete(existing)
            reacted = False
        else:
            self.db.add(
                Reaction(
                    user_id=user.id,
                    target_type=reaction_target,
                    target_id=target_id,
                    kind=reaction_kind,
                )
            )
            reacted = True
            if reaction_target == ReactionTarget.POST and post_author_id:
                await self.notifications.notify_reaction(
                    recipient_id=post_author_id,
                    actor_id=user.id,
                    post_id=target_id,
                    kind=kind,
                )

        await self.db.commit()
        count = await self.db.scalar(
            select(func.count())
            .select_from(Reaction)
            .where(
                Reaction.target_type == reaction_target,
                Reaction.target_id == target_id,
            )
        )
        return {"reacted": reacted, "reaction_count": int(count or 0)}

    async def search(self, query: str, *, limit: int = 20) -> dict:
        q = query.strip()
        if len(q) < 2:
            return {"users": [], "posts": []}

        users_result = await self.db.execute(
            select(Profile)
            .where(
                or_(
                    Profile.handle.ilike(f"%{q}%"),
                    Profile.display_name.ilike(f"%{q}%"),
                )
            )
            .limit(limit)
        )
        users = [
            AuthorPublic(
                id=p.user_id,
                handle=p.handle,
                display_name=p.display_name,
                avatar_url=p.avatar_url,
            )
            for p in users_result.scalars().all()
        ]

        posts_result = await self.db.execute(
            select(Post)
            .where(
                Post.deleted_at.is_(None),
                func.to_tsvector("simple", Post.body).bool_op("@@")(
                    func.plainto_tsquery("simple", q)
                ),
            )
            .order_by(Post.created_at.desc())
            .limit(limit)
        )
        posts = [await self._post_public(p, viewer_id=None) for p in posts_result.scalars().all()]
        return {"users": users, "posts": posts}

    async def _get_visible_post(self, post_id: UUID, viewer_id: UUID | None) -> Post:
        from platform_api.core.exceptions import SyloraHTTPException
        from fastapi import status

        post = await self.db.get(Post, post_id)
        if post is None or post.deleted_at:
            raise SyloraHTTPException(status.HTTP_404_NOT_FOUND, "not_found", "Post not found")

        if viewer_id and await self.social._is_blocked(viewer_id, post.author_id):
            raise forbidden("Post not available")

        if post.visibility == PostVisibility.PUBLIC:
            return post
        if viewer_id is None:
            raise unauthorized("Sign in to view this post")
        if post.author_id == viewer_id:
            return post
        if await self.social.is_following(viewer_id, post.author_id):
            return post
        raise forbidden("Post not available")

    async def _post_public(self, post: Post, viewer_id: UUID | None) -> PostPublic:
        profile = await self.db.scalar(select(Profile).where(Profile.user_id == post.author_id))
        reaction_count = await self.db.scalar(
            select(func.count())
            .select_from(Reaction)
            .where(Reaction.target_type == ReactionTarget.POST, Reaction.target_id == post.id)
        )
        comment_count = await self.db.scalar(
            select(func.count())
            .select_from(Comment)
            .where(Comment.post_id == post.id, Comment.deleted_at.is_(None))
        )
        viewer_reacted = False
        if viewer_id:
            viewer_reacted = (
                await self.db.scalar(
                    select(Reaction.id).where(
                        Reaction.user_id == viewer_id,
                        Reaction.target_type == ReactionTarget.POST,
                        Reaction.target_id == post.id,
                    )
                )
            ) is not None

        return PostPublic(
            id=post.id,
            body=post.body,
            visibility=post.visibility.value,
            author=AuthorPublic(
                id=post.author_id,
                handle=profile.handle if profile else "unknown",
                display_name=profile.display_name if profile else "Unknown",
                avatar_url=profile.avatar_url if profile else None,
            ),
            reaction_count=int(reaction_count or 0),
            comment_count=int(comment_count or 0),
            viewer_reacted=viewer_reacted,
            created_at=post.created_at,
        )

    async def _comment_public(self, comment: Comment) -> CommentPublic:
        profile = await self.db.scalar(select(Profile).where(Profile.user_id == comment.author_id))
        return CommentPublic(
            id=comment.id,
            body=comment.body,
            author=AuthorPublic(
                id=comment.author_id,
                handle=profile.handle if profile else "unknown",
                display_name=profile.display_name if profile else "Unknown",
                avatar_url=profile.avatar_url if profile else None,
            ),
            parent_id=comment.parent_id,
            created_at=comment.created_at,
        )
