"""Encrypted owner/admin third-party service credentials and ops records."""

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
    expired = "expired"


class OwnerEnvironmentProfile(enum.StrEnum):
    development = "development"
    staging = "staging"
    production = "production"


class OwnerAlertSeverity(enum.StrEnum):
    info = "info"
    warning = "warning"
    critical = "critical"


class OwnerServiceCredential(Base):
    """One row per integration provider per environment; secrets encrypted."""

    __tablename__ = "owner_service_credentials"
    __table_args__ = (
        UniqueConstraint(
            "provider_key",
            "environment",
            name="uq_owner_service_provider_environment",
        ),
        CheckConstraint("version > 0", name="ck_owner_service_version"),
        CheckConstraint(
            "consecutive_failures >= 0", name="ck_owner_service_failures_nonneg"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    provider_key: Mapped[str] = mapped_column(String(64), index=True)
    environment: Mapped[str] = mapped_column(
        String(16), default=OwnerEnvironmentProfile.production.value, index=True
    )
    category: Mapped[str] = mapped_column(String(32), index=True)
    public_config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    encrypted_secrets: Mapped[str | None] = mapped_column(Text)
    # Prior secrets retained during zero-downtime rotation until new key validates.
    previous_encrypted_secrets: Mapped[str | None] = mapped_column(Text)
    rotation_in_progress: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[OwnerServiceStatus] = mapped_column(
        Enum(OwnerServiceStatus, native_enum=False, length=16),
        default=OwnerServiceStatus.missing,
        index=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    last_tested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(1000))
    consecutive_failures: Mapped[int] = mapped_column(Integer, default=0)
    key_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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


class OwnerServiceHealthCheck(Base):
    """Append-only health probe history for owner-managed providers."""

    __tablename__ = "owner_service_health_checks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    provider_key: Mapped[str] = mapped_column(String(64), index=True)
    environment: Mapped[str] = mapped_column(String(16), index=True)
    ok: Mapped[bool] = mapped_column(Boolean, index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    message: Mapped[str] = mapped_column(String(1000))
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class OwnerConfigAlert(Base):
    """Owner notifications when a provider fails, expires, or recovers."""

    __tablename__ = "owner_config_alerts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    provider_key: Mapped[str] = mapped_column(String(64), index=True)
    environment: Mapped[str] = mapped_column(String(16), index=True)
    severity: Mapped[OwnerAlertSeverity] = mapped_column(
        Enum(OwnerAlertSeverity, native_enum=False, length=16), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(String(2000))
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    acknowledged_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class OwnerConfigBackup(Base):
    """Encrypted configuration backup metadata (payload stored encrypted)."""

    __tablename__ = "owner_config_backups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    environment: Mapped[str] = mapped_column(String(16), index=True)
    label: Mapped[str] = mapped_column(String(160))
    encrypted_payload: Mapped[str] = mapped_column(Text)
    provider_count: Mapped[int] = mapped_column(Integer, default=0)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


@event.listens_for(OwnerServiceCredential, "before_delete")
def reject_owner_credential_delete(*_: object) -> None:
    raise ValueError("owner service credentials must be rotated via upsert, not deleted")


@event.listens_for(OwnerServiceHealthCheck, "before_update")
@event.listens_for(OwnerServiceHealthCheck, "before_delete")
@event.listens_for(OwnerConfigBackup, "before_update")
@event.listens_for(OwnerConfigBackup, "before_delete")
def reject_owner_ops_mutation(*_: object) -> None:
    raise ValueError("owner health checks and backups are append-only")
