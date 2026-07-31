from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    func,
    inspect,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class WorkspaceType(enum.StrEnum):
    company = "company"
    agency = "agency"
    team = "team"


class WorkspaceStatus(enum.StrEnum):
    active = "active"
    suspended = "suspended"
    deleted = "deleted"


class WorkspaceRole(enum.StrEnum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    member = "member"
    viewer = "viewer"


class WorkspaceMembershipStatus(enum.StrEnum):
    invited = "invited"
    active = "active"
    suspended = "suspended"


class Workspace(Base):
    __tablename__ = "business_workspaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[WorkspaceType] = mapped_column(
        Enum(WorkspaceType, native_enum=False, length=16), index=True
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[WorkspaceStatus] = mapped_column(
        Enum(WorkspaceStatus, native_enum=False, length=16),
        default=WorkspaceStatus.active,
        index=True,
    )
    locale: Mapped[str] = mapped_column(String(16), default="en")
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class WorkspaceMembership(Base):
    __tablename__ = "business_workspace_memberships"
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_business_membership_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(WorkspaceRole, native_enum=False, length=16), index=True
    )
    status: Mapped[WorkspaceMembershipStatus] = mapped_column(
        Enum(WorkspaceMembershipStatus, native_enum=False, length=16),
        default=WorkspaceMembershipStatus.active,
        index=True,
    )
    permission_overrides: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class WorkspaceInvitation(Base):
    __tablename__ = "business_workspace_invitations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(WorkspaceRole, native_enum=False, length=16), index=True
    )
    permission_overrides: Mapped[dict[str, bool]] = mapped_column(JSON, default=dict)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    accepted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class Team(Base):
    __tablename__ = "business_teams"
    __table_args__ = (UniqueConstraint("workspace_id", "name", name="uq_business_team_name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(1000))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class TeamMembership(Base):
    __tablename__ = "business_team_memberships"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_business_team_membership_user"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_teams.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusinessAuditEvent(Base):
    __tablename__ = "business_audit_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(96), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(48), index=True)
    aggregate_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    request_id: Mapped[str] = mapped_column(String(128), index=True)
    event_metadata: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class CRMCompany(Base):
    __tablename__ = "business_crm_companies"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_business_crm_company_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    domain: Mapped[str | None] = mapped_column(String(253), index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    custom_fields: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    source: Mapped[str | None] = mapped_column(String(64))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class CRMContact(Base):
    __tablename__ = "business_crm_contacts"
    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_business_crm_contact_email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_crm_companies.id", ondelete="SET NULL"), index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), index=True)
    last_name: Mapped[str] = mapped_column(String(100), index=True)
    email: Mapped[str | None] = mapped_column(String(320), index=True)
    phone: Mapped[str | None] = mapped_column(String(40))
    job_title: Mapped[str | None] = mapped_column(String(120))
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    custom_fields: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    consent_status: Mapped[str] = mapped_column(String(24), default="unknown", index=True)
    source: Mapped[str | None] = mapped_column(String(64))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class DealStatus(enum.StrEnum):
    open = "open"
    won = "won"
    lost = "lost"
    cancelled = "cancelled"


class PipelineStage(Base):
    __tablename__ = "business_pipeline_stages"
    __table_args__ = (
        UniqueConstraint("workspace_id", "key", name="uq_business_pipeline_stage_key"),
        UniqueConstraint("workspace_id", "position", name="uq_business_pipeline_stage_position"),
        CheckConstraint("position >= 0", name="ck_business_pipeline_stage_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer)
    probability_bps: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CRMDeal(Base):
    __tablename__ = "business_crm_deals"
    __table_args__ = (
        CheckConstraint("value_minor >= 0", name="ck_business_deal_nonnegative_value"),
        CheckConstraint(
            "probability_bps >= 0 AND probability_bps <= 10000",
            name="ck_business_deal_probability",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200), index=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_crm_contacts.id", ondelete="SET NULL"), index=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_crm_companies.id", ondelete="SET NULL"), index=True
    )
    stage_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_pipeline_stages.id", ondelete="RESTRICT"), index=True
    )
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    value_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    currency: Mapped[str] = mapped_column(String(3))
    probability_bps: Mapped[int] = mapped_column(Integer, default=0)
    expected_close_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[DealStatus] = mapped_column(
        Enum(DealStatus, native_enum=False, length=16), default=DealStatus.open, index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class DealActivity(Base):
    __tablename__ = "business_deal_activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    deal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_crm_deals.id", ondelete="RESTRICT"), index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    activity_type: Mapped[str] = mapped_column(String(48), index=True)
    detail: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class BusinessDataJob(Base):
    __tablename__ = "business_data_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    direction: Mapped[str] = mapped_column(String(16), index=True)
    resource: Mapped[str] = mapped_column(String(32), index=True)
    state: Mapped[str] = mapped_column(String(24), default="queued", index=True)
    input_object_key: Mapped[str | None] = mapped_column(String(512))
    output_object_key: Mapped[str | None] = mapped_column(String(512))
    failure_code: Mapped[str | None] = mapped_column(String(96))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TaskStatus(enum.StrEnum):
    todo = "todo"
    in_progress = "in_progress"
    blocked = "blocked"
    completed = "completed"
    cancelled = "cancelled"


class TaskPriority(enum.StrEnum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class WorkspaceTask(Base):
    __tablename__ = "business_tasks"
    __table_args__ = (CheckConstraint("version > 0", name="ck_business_task_version"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, native_enum=False, length=16), default=TaskStatus.todo, index=True
    )
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, native_enum=False, length=16),
        default=TaskPriority.normal,
        index=True,
    )
    assignee_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_teams.id", ondelete="SET NULL"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_tasks.id", ondelete="SET NULL"), index=True
    )
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class TaskDependency(Base):
    __tablename__ = "business_task_dependencies"
    __table_args__ = (
        UniqueConstraint("task_id", "depends_on_task_id", name="uq_business_task_dependency"),
        CheckConstraint(
            "task_id <> depends_on_task_id",
            name="ck_business_task_not_self_dependency",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_tasks.id", ondelete="CASCADE"), index=True
    )
    depends_on_task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_tasks.id", ondelete="CASCADE"), index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TaskComment(Base):
    __tablename__ = "business_task_comments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_tasks.id", ondelete="RESTRICT"), index=True
    )
    author_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class TaskActivity(Base):
    __tablename__ = "business_task_activities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_tasks.id", ondelete="RESTRICT"), index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(48), index=True)
    detail: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class CalendarEvent(Base):
    __tablename__ = "business_calendar_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    timezone: Mapped[str] = mapped_column(String(64))
    attendees: Mapped[list[str]] = mapped_column(JSON, default=list)
    recurrence_rule: Mapped[str | None] = mapped_column(String(500))
    reminders: Mapped[list[int]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(32), default="sylora", index=True)
    external_reference: Mapped[str | None] = mapped_column(String(255))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class DocumentState(enum.StrEnum):
    draft = "draft"
    review = "review"
    published = "published"
    archived = "archived"


class DocumentClassification(enum.StrEnum):
    public = "public"
    internal = "internal"
    confidential = "confidential"
    restricted = "restricted"


class BusinessFolder(Base):
    __tablename__ = "business_document_folders"
    __table_args__ = (
        UniqueConstraint("workspace_id", "parent_id", "name", name="uq_business_folder_name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_document_folders.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="CASCADE"), index=True
    )
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_document_folders.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), index=True)
    state: Mapped[DocumentState] = mapped_column(
        Enum(DocumentState, native_enum=False, length=16),
        default=DocumentState.draft,
        index=True,
    )
    classification: Mapped[DocumentClassification] = mapped_column(
        Enum(DocumentClassification, native_enum=False, length=16),
        default=DocumentClassification.internal,
        index=True,
    )
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_document_versions.id", ondelete="RESTRICT"), unique=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class BusinessDocumentVersion(Base):
    __tablename__ = "business_document_versions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_business_document_version"),
        UniqueConstraint("object_key", name="uq_business_document_object_key"),
        CheckConstraint("version_number > 0", name="ck_business_document_version_positive"),
        CheckConstraint("byte_size > 0", name="ck_business_document_version_size"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_documents.id", ondelete="CASCADE"), index=True
    )
    version_number: Mapped[int] = mapped_column(Integer)
    object_key: Mapped[str] = mapped_column(String(512))
    sha256: Mapped[str] = mapped_column(String(64))
    content_type: Mapped[str] = mapped_column(String(128))
    byte_size: Mapped[int] = mapped_column(BigInteger)
    rights_declaration: Mapped[str] = mapped_column(String(500))
    upload_state: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DocumentApproval(Base):
    __tablename__ = "business_document_approvals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_documents.id", ondelete="RESTRICT"), index=True
    )
    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_document_versions.id", ondelete="RESTRICT"), index=True
    )
    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    approver_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    note: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BudgetStatus(enum.StrEnum):
    draft = "draft"
    active = "active"
    closed = "closed"


class BusinessBudget(Base):
    __tablename__ = "business_budgets"
    __table_args__ = (CheckConstraint("amount_minor >= 0", name="ck_business_budget_amount"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(160), index=True)
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[BudgetStatus] = mapped_column(
        Enum(BudgetStatus, native_enum=False, length=16), default=BudgetStatus.draft, index=True
    )
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BudgetCategory(Base):
    __tablename__ = "business_budget_categories"
    __table_args__ = (
        UniqueConstraint("budget_id", "name", name="uq_business_budget_category"),
        CheckConstraint("allocated_minor >= 0", name="ck_business_budget_category_amount"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    budget_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_budgets.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    allocated_minor: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExpenseStatus(enum.StrEnum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    paid = "paid"


class Expense(Base):
    __tablename__ = "business_expenses"
    __table_args__ = (CheckConstraint("amount_minor > 0", name="ck_business_expense_amount"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_budget_categories.id", ondelete="SET NULL"), index=True
    )
    vendor: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(String(2000))
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    incurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    receipt_object_key: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[ExpenseStatus] = mapped_column(
        Enum(ExpenseStatus, native_enum=False, length=16),
        default=ExpenseStatus.draft,
        index=True,
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ExpenseApproval(Base):
    __tablename__ = "business_expense_approvals"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    expense_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_expenses.id", ondelete="RESTRICT"), index=True
    )
    approver_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    decision: Mapped[str] = mapped_column(String(16), index=True)
    reason: Mapped[str | None] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class InvoiceStatus(enum.StrEnum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    void = "void"


class Invoice(Base):
    __tablename__ = "business_invoices"
    __table_args__ = (
        UniqueConstraint("workspace_id", "number", name="uq_business_invoice_number"),
        CheckConstraint(
            "subtotal_minor >= 0 AND tax_minor >= 0 AND total_minor >= 0",
            name="ck_business_invoice_totals",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    number: Mapped[str] = mapped_column(String(64), index=True)
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_crm_contacts.id", ondelete="SET NULL"), index=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_crm_companies.id", ondelete="SET NULL"), index=True
    )
    currency: Mapped[str] = mapped_column(String(3))
    subtotal_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    tax_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    total_minor: Mapped[int] = mapped_column(BigInteger, default=0)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, native_enum=False, length=16),
        default=InvoiceStatus.draft,
        index=True,
    )
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class InvoiceLine(Base):
    __tablename__ = "business_invoice_lines"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_business_invoice_line_quantity"),
        CheckConstraint(
            "unit_amount_minor >= 0 AND line_total_minor >= 0",
            name="ck_business_invoice_line_amount",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_invoices.id", ondelete="RESTRICT"), index=True
    )
    description: Mapped[str] = mapped_column(String(1000))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_amount_minor: Mapped[int] = mapped_column(BigInteger)
    line_total_minor: Mapped[int] = mapped_column(BigInteger)
    position: Mapped[int] = mapped_column(Integer)


class FinanceTransactionReference(Base):
    __tablename__ = "business_finance_transaction_references"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "reference_type",
            "external_reference",
            name="uq_business_finance_external_reference",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("business_workspaces.id", ondelete="RESTRICT"), index=True
    )
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_invoices.id", ondelete="RESTRICT"), index=True
    )
    expense_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("business_expenses.id", ondelete="RESTRICT"), index=True
    )
    reference_type: Mapped[str] = mapped_column(String(32), index=True)
    provider: Mapped[str | None] = mapped_column(String(64), index=True)
    external_reference: Mapped[str] = mapped_column(String(255), index=True)
    evidence: Mapped[str] = mapped_column(String(2000))
    amount_minor: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class FeatureFlag(Base):
    __tablename__ = "admin_feature_flags"
    __table_args__ = (
        CheckConstraint(
            "rollout_bps >= 0 AND rollout_bps <= 10000", name="ck_admin_feature_flag_rollout"
        ),
        CheckConstraint("version > 0", name="ck_admin_feature_flag_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(96), unique=True, index=True)
    environments: Mapped[list[str]] = mapped_column(JSON, default=list)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    rollout_bps: Mapped[int] = mapped_column(Integer, default=0)
    allow_subjects: Mapped[list[str]] = mapped_column(JSON, default=list)
    deny_subjects: Mapped[list[str]] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlatformSetting(Base):
    __tablename__ = "admin_platform_settings"
    __table_args__ = (
        UniqueConstraint("key", "version", name="uq_admin_platform_setting_version"),
        CheckConstraint("version > 0", name="ck_admin_platform_setting_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(96), index=True)
    version: Mapped[int] = mapped_column(Integer)
    value: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    encrypted_value: Mapped[str | None] = mapped_column(Text)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class AccountAdministrationAction(Base):
    __tablename__ = "admin_account_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(32), index=True)
    reason: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class ServiceHealthReport(Base):
    __tablename__ = "admin_service_health_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    service: Mapped[str] = mapped_column(String(96), index=True)
    instance: Mapped[str] = mapped_column(String(160), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    checks: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


@event.listens_for(BusinessAuditEvent, "before_update")
@event.listens_for(BusinessAuditEvent, "before_delete")
@event.listens_for(DealActivity, "before_update")
@event.listens_for(DealActivity, "before_delete")
@event.listens_for(TaskComment, "before_update")
@event.listens_for(TaskComment, "before_delete")
@event.listens_for(TaskActivity, "before_update")
@event.listens_for(TaskActivity, "before_delete")
@event.listens_for(ExpenseApproval, "before_update")
@event.listens_for(ExpenseApproval, "before_delete")
@event.listens_for(FinanceTransactionReference, "before_update")
@event.listens_for(FinanceTransactionReference, "before_delete")
@event.listens_for(PlatformSetting, "before_update")
@event.listens_for(PlatformSetting, "before_delete")
@event.listens_for(AccountAdministrationAction, "before_update")
@event.listens_for(AccountAdministrationAction, "before_delete")
def reject_business_audit_mutation(*_: object) -> None:
    raise ValueError("business audit and financial evidence records are append-only")


@event.listens_for(BusinessDocumentVersion, "before_update")
def reject_verified_document_version_update(
    _: object, __: object, target: BusinessDocumentVersion
) -> None:
    history = inspect(target).attrs.upload_state.history
    prior_state = history.deleted[0] if history.deleted else target.upload_state
    if prior_state == "verified":
        raise ValueError("verified document versions are immutable")


Index(
    "ix_business_memberships_user_status",
    WorkspaceMembership.user_id,
    WorkspaceMembership.status,
)
Index("ix_business_contacts_workspace_created", CRMContact.workspace_id, CRMContact.created_at)
Index("ix_business_deals_workspace_created", CRMDeal.workspace_id, CRMDeal.created_at)
Index("ix_business_tasks_workspace_created", WorkspaceTask.workspace_id, WorkspaceTask.created_at)
Index(
    "ix_business_calendar_workspace_range",
    CalendarEvent.workspace_id,
    CalendarEvent.starts_at,
    CalendarEvent.ends_at,
)
Index(
    "ix_business_documents_workspace_created",
    BusinessDocument.workspace_id,
    BusinessDocument.created_at,
)
Index("ix_business_expenses_workspace_created", Expense.workspace_id, Expense.created_at)
Index("ix_business_invoices_workspace_created", Invoice.workspace_id, Invoice.created_at)
