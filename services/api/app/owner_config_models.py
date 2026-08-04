"""Encrypted owner/admin third-party service credentials."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class OwnerServiceStatus(enum.StrEnum):
    missing = "missing"
    invalid = "invalid"
    connected = "connected"


class OwnerServiceCredential(Base):
    """One row per integration provider; secrets encrypted with DATA_ENCRYPTION_KEY."""

    __tablename__ = "owner_service_credentials"
    __table_args__ = (
        UniqueConstraint("provider_key", name="uq_owner_service_provider_key"),
        CheckConstraint("version > 0", name="ck_owner_service_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    provider_key: Mapped[str] = mapped_column(String(64), index=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    public_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    encrypted_secrets: Mapped[str | None] = mapped_column(Text)
    status: Mapped[OwnerServiceStatus] = mapped_column(
        Enum(OwnerServiceStatus, native_enum=False, length=16),
        default=OwnerServiceStatus.missing,
        index=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(1000))
    feature_flag_key: Mapped[str | None] = mapped_column(String(96))
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


@event.listens_for(OwnerServiceCredential, "before_delete")
def reject_owner_credential_delete(*_: object) -> None:
    raise ValueError("owner service credentials must be rotated via upsert, not deleted")
