import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from platform_api.infrastructure.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    handle: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="profile")  # type: ignore[name-defined]
