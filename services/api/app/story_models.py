from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


def default_story_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(hours=24)


class StoryVisibility(enum.StrEnum):
    public = "public"
    friends = "friends"


class StoryItemKind(enum.StrEnum):
    image = "image"
    video = "video"
    text = "text"


class Story(Base):
    """An ephemeral 24-hour moment composed of one or more ordered items."""

    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    visibility: Mapped[StoryVisibility] = mapped_column(
        Enum(StoryVisibility, native_enum=False, length=16),
        default=StoryVisibility.friends,
        index=True,
    )
    reply_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=default_story_expiry, index=True
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class StoryItem(Base):
    """A single slide (image, video, or text) belonging to a story."""

    __tablename__ = "story_items"
    __table_args__ = (
        CheckConstraint("duration_ms > 0", name="ck_story_items_positive_duration"),
        CheckConstraint(
            "(media_kind = 'text' AND body IS NOT NULL) OR "
            "(media_kind IN ('image', 'video') AND media_url IS NOT NULL)",
            name="ck_story_items_media_or_body",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    story_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"), index=True
    )
    media_kind: Mapped[StoryItemKind] = mapped_column(
        Enum(StoryItemKind, native_enum=False, length=16), index=True
    )
    media_url: Mapped[str | None] = mapped_column(String(2048))
    body: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int] = mapped_column(Integer, default=5000)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StoryView(Base):
    """Records that a viewer has seen a story (for view counts and "seen" state)."""

    __tablename__ = "story_views"

    story_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True
    )
    viewer_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


Index("ix_stories_author_created", Story.author_user_id, Story.created_at, Story.id)
Index("ix_story_items_story_sort", StoryItem.story_id, StoryItem.sort_order)
