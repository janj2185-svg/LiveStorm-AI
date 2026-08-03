from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class ConferencePurpose(enum.StrEnum):
    business = "business"
    education = "education"
    social = "social"


class ConferenceStatus(enum.StrEnum):
    scheduled = "scheduled"
    live = "live"
    ended = "ended"


class LiveConference(Base):
    __tablename__ = "live_conferences"
    __table_args__ = (
        UniqueConstraint("join_code", name="uq_live_conferences_join_code"),
        Index("ix_live_conferences_host_created", "host_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    host_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    purpose: Mapped[ConferencePurpose] = mapped_column(
        Enum(ConferencePurpose, native_enum=False, length=16),
        default=ConferencePurpose.business,
        index=True,
    )
    status: Mapped[ConferenceStatus] = mapped_column(
        Enum(ConferenceStatus, native_enum=False, length=16),
        default=ConferenceStatus.scheduled,
        index=True,
    )
    join_code: Mapped[str] = mapped_column(String(24), index=True)
    ingest_path: Mapped[str] = mapped_column(String(255), unique=True)
    ingest_provisioned: Mapped[bool] = mapped_column(default=False)
    ai_conversation_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ai_conversations.id", ondelete="SET NULL"),
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    @property
    def owner_user_id(self) -> uuid.UUID:
        return self.host_id


class LiveConferenceParticipant(Base):
    __tablename__ = "live_conference_participants"
    __table_args__ = (
        UniqueConstraint("conference_id", "user_id", name="uq_live_conference_participant_user"),
        Index("ix_live_conference_participants_user_active", "user_id", "left_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conference_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_conferences.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    participant_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
