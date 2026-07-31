from __future__ import annotations

import hashlib
import hmac
import html
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from urllib.parse import quote

from fastapi import Depends, Request
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.business_models import (
    BusinessAuditEvent,
    BusinessDocument,
    BusinessDocumentVersion,
    CalendarEvent,
    DocumentClassification,
    DocumentState,
    FinanceTransactionReference,
    Invoice,
    InvoiceStatus,
    TaskActivity,
    TaskDependency,
    TeamMembership,
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
    WorkspaceMembershipStatus,
    WorkspaceRole,
    WorkspaceStatus,
    WorkspaceTask,
)
from app.config import Settings
from app.dependencies import AuthContext, current_auth, has_permission
from app.email import require_email_capability
from app.errors import APIError
from app.models import EmailOutbox, User
from app.rate_limit import rate_limit
from app.security import hash_token, new_opaque_token, normalize_email, utcnow
from app.social_service import encode_cursor

ROLE_PERMISSIONS: dict[WorkspaceRole, set[str]] = {
    WorkspaceRole.owner: {"*"},
    WorkspaceRole.admin: {"*"},
    WorkspaceRole.manager: {
        "workspace.read",
        "workspace.teams",
        "crm.read",
        "crm.write",
        "tasks.read",
        "tasks.write",
        "calendar.read",
        "calendar.write",
        "documents.read",
        "documents.write",
        "documents.approve",
        "finance.read",
        "finance.write",
        "finance.approve",
    },
    WorkspaceRole.member: {
        "workspace.read",
        "crm.read",
        "crm.write",
        "tasks.read",
        "tasks.write",
        "calendar.read",
        "calendar.write",
        "documents.read",
    },
    WorkspaceRole.viewer: {
        "workspace.read",
        "crm.read",
        "tasks.read",
        "calendar.read",
        "documents.read",
        "finance.read",
    },
}


async def business_rate_limit_dependency(
    request: Request,
    auth: AuthContext = Depends(current_auth),
) -> None:
    if request.method in {"GET", "HEAD", "OPTIONS"}:
        return
    settings: Settings = request.app.state.settings
    await rate_limit(
        request,
        bucket=f"business-mutation:{request.url.path}",
        subject=str(auth.user.id),
        limit=settings.business_mutation_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )


class ESignatureProvider(Protocol):
    name: str

    async def create_signature_request(
        self,
        *,
        document_id: uuid.UUID,
        version_id: uuid.UUID,
        signer_emails: list[str],
    ) -> str: ...


class AccountingProvider(Protocol):
    name: str

    async def queue_export(self, *, workspace_id: uuid.UUID, resource: str) -> str: ...


class CalendarSyncProvider(Protocol):
    name: str

    async def queue_sync(self, *, workspace_id: uuid.UUID) -> str: ...


class UnconfiguredESignatureProvider:
    name = "unconfigured"

    async def create_signature_request(
        self,
        *,
        document_id: uuid.UUID,
        version_id: uuid.UUID,
        signer_emails: list[str],
    ) -> str:
        raise APIError(
            503,
            "esignature_provider_unavailable",
            "E-signature provider unavailable",
            "No real e-signature provider is configured for this deployment.",
        )


class UnconfiguredAccountingProvider:
    name = "unconfigured"

    async def queue_export(self, *, workspace_id: uuid.UUID, resource: str) -> str:
        raise APIError(
            503,
            "accounting_provider_unavailable",
            "Accounting provider unavailable",
            "No real accounting provider is configured for this deployment.",
        )


class UnconfiguredCalendarSyncProvider:
    name = "unconfigured"

    async def queue_sync(self, *, workspace_id: uuid.UUID) -> str:
        raise APIError(
            503,
            "calendar_provider_unavailable",
            "Calendar provider unavailable",
            "No real external calendar provider is configured for this deployment.",
        )


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


async def require_workspace(
    db: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    *,
    include_deleted: bool = False,
) -> tuple[Workspace, WorkspaceMembership | None]:
    workspace = await db.get(Workspace, workspace_id)
    if (
        workspace is None
        or (not include_deleted and workspace.status == WorkspaceStatus.deleted)
        or (workspace.deleted_at is not None and not include_deleted)
    ):
        raise APIError(
            404,
            "workspace_not_found",
            "Workspace not found",
            "The workspace does not exist or is not accessible.",
        )
    membership = await db.scalar(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
            WorkspaceMembership.status == WorkspaceMembershipStatus.active,
        )
    )
    if membership is None and not await has_permission(db, user_id, "workspaces:manage:any"):
        raise APIError(
            404,
            "workspace_not_found",
            "Workspace not found",
            "The workspace does not exist or is not accessible.",
        )
    return workspace, membership


async def require_workspace_permission(
    db: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    permission: str,
) -> tuple[Workspace, WorkspaceMembership | None]:
    workspace, membership = await require_workspace(db, user_id, workspace_id)
    if membership is None:
        return workspace, None
    allowed = ROLE_PERMISSIONS[membership.role]
    override = membership.permission_overrides.get(permission)
    if override is False or (
        override is not True and "*" not in allowed and permission not in allowed
    ):
        raise APIError(
            403,
            "workspace_permission_denied",
            "Workspace permission denied",
            "Your workspace role does not permit this operation.",
        )
    return workspace, membership


async def require_member_user(
    db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID | None
) -> None:
    if user_id is None:
        return
    member = await db.scalar(
        select(WorkspaceMembership.id).where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
            WorkspaceMembership.status == WorkspaceMembershipStatus.active,
        )
    )
    if member is None:
        raise APIError(
            422,
            "workspace_member_required",
            "Workspace member required",
            "The referenced user is not an active member of this workspace.",
        )


async def active_owner_count(db: AsyncSession, workspace_id: uuid.UUID) -> int:
    return int(
        await db.scalar(
            select(func.count())
            .select_from(WorkspaceMembership)
            .where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.role == WorkspaceRole.owner,
                WorkspaceMembership.status == WorkspaceMembershipStatus.active,
            )
        )
        or 0
    )


async def ensure_not_last_owner(db: AsyncSession, membership: WorkspaceMembership) -> None:
    if (
        membership.role == WorkspaceRole.owner
        and membership.status == WorkspaceMembershipStatus.active
        and await active_owner_count(db, membership.workspace_id) <= 1
    ):
        raise APIError(
            409,
            "last_workspace_owner",
            "Last workspace owner",
            "Transfer workspace ownership before removing or demoting the last active owner.",
        )


def add_business_audit(
    db: AsyncSession,
    request: Request,
    *,
    workspace_id: uuid.UUID,
    actor_user_id: uuid.UUID | None,
    action: str,
    aggregate_type: str,
    aggregate_id: uuid.UUID | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        BusinessAuditEvent(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            action=action,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            request_id=getattr(request.state, "request_id", "unknown"),
            event_metadata=metadata or {},
        )
    )


def invitation_message(
    invitation: WorkspaceInvitation,
    workspace: Workspace,
    raw_token: str,
    settings: Settings,
) -> EmailOutbox:
    link = (
        f"{settings.web_base_url.rstrip('/')}/business/invitations/accept?token={quote(raw_token)}"
    )
    safe_link = html.escape(link, quote=True)
    text = (
        f"You were invited to the SYLORA workspace {workspace.name}.\n\n"
        f"Open this link: {link}\n\n"
        f"Invitation token: {raw_token}\n"
        f"This invitation expires at {aware(invitation.expires_at).isoformat()}."
    )
    return EmailOutbox(
        message_type="workspace_invitation",
        recipient=invitation.email,
        subject=f"Invitation to {workspace.name}",
        text_body=text,
        html_body=(
            f"<h1>Invitation to {html.escape(workspace.name)}</h1>"
            f'<p><a href="{safe_link}">Accept workspace invitation</a></p>'
            f"<p>This invitation expires at "
            f"{html.escape(aware(invitation.expires_at).isoformat())}.</p>"
        ),
    )


async def create_invitation(
    db: AsyncSession,
    settings: Settings,
    *,
    workspace: Workspace,
    invited_by_id: uuid.UUID,
    email: str,
    role: WorkspaceRole,
    permission_overrides: dict[str, bool],
    expires_in_hours: int,
) -> WorkspaceInvitation:
    require_email_capability(settings)
    normalized = normalize_email(email)
    existing_user = await db.scalar(select(User).where(User.email == normalized))
    if existing_user is not None:
        existing_member = await db.scalar(
            select(WorkspaceMembership.id).where(
                WorkspaceMembership.workspace_id == workspace.id,
                WorkspaceMembership.user_id == existing_user.id,
            )
        )
        if existing_member is not None:
            raise APIError(
                409,
                "workspace_member_exists",
                "Workspace member already exists",
                "This user already has a workspace membership.",
            )
    outstanding = await db.scalar(
        select(WorkspaceInvitation).where(
            WorkspaceInvitation.workspace_id == workspace.id,
            WorkspaceInvitation.email == normalized,
            WorkspaceInvitation.accepted_at.is_(None),
            WorkspaceInvitation.revoked_at.is_(None),
            WorkspaceInvitation.expires_at > utcnow(),
        )
    )
    if outstanding is not None:
        raise APIError(
            409,
            "workspace_invitation_exists",
            "Workspace invitation already exists",
            "An active invitation already exists for this email address.",
        )
    raw_token = new_opaque_token()
    invitation = WorkspaceInvitation(
        workspace_id=workspace.id,
        email=normalized,
        role=role,
        permission_overrides=permission_overrides,
        token_hash=hash_token(raw_token),
        invited_by_id=invited_by_id,
        expires_at=utcnow() + timedelta(hours=expires_in_hours),
    )
    db.add(invitation)
    await db.flush()
    db.add(invitation_message(invitation, workspace, raw_token, settings))
    return invitation


async def accept_invitation(
    db: AsyncSession, *, user: User, raw_token: str
) -> tuple[WorkspaceInvitation, WorkspaceMembership]:
    invitation = await db.scalar(
        select(WorkspaceInvitation)
        .where(WorkspaceInvitation.token_hash == hash_token(raw_token))
        .with_for_update()
    )
    if (
        invitation is None
        or invitation.accepted_at is not None
        or invitation.revoked_at is not None
        or aware(invitation.expires_at) <= utcnow()
        or invitation.email != user.email
    ):
        raise APIError(
            400,
            "invalid_or_expired_invitation",
            "Invalid or expired invitation",
            "The invitation is invalid, expired, used, or belongs to another account.",
        )
    workspace = await db.get(Workspace, invitation.workspace_id)
    if workspace is None or workspace.status != WorkspaceStatus.active:
        raise APIError(
            409,
            "workspace_unavailable",
            "Workspace unavailable",
            "The invited workspace is not active.",
        )
    membership = await db.scalar(
        select(WorkspaceMembership).where(
            WorkspaceMembership.workspace_id == invitation.workspace_id,
            WorkspaceMembership.user_id == user.id,
        )
    )
    now = utcnow()
    if membership is None:
        membership = WorkspaceMembership(
            workspace_id=invitation.workspace_id,
            user_id=user.id,
            role=invitation.role,
            status=WorkspaceMembershipStatus.active,
            permission_overrides=invitation.permission_overrides,
            invited_by_id=invitation.invited_by_id,
            joined_at=now,
        )
        db.add(membership)
    elif membership.status == WorkspaceMembershipStatus.invited:
        membership.role = invitation.role
        membership.status = WorkspaceMembershipStatus.active
        membership.permission_overrides = invitation.permission_overrides
        membership.joined_at = now
    else:
        raise APIError(
            409,
            "workspace_member_exists",
            "Workspace member already exists",
            "This account already has a workspace membership.",
        )
    invitation.accepted_by_id = user.id
    invitation.accepted_at = now
    await db.flush()
    return invitation, membership


async def scoped_record[T](
    db: AsyncSession,
    model: type[T],
    record_id: uuid.UUID,
    workspace_id: uuid.UUID,
    *,
    deleted_field: Any | None = None,
    code: str = "business_record_not_found",
) -> T:
    filters = [model.id == record_id, model.workspace_id == workspace_id]  # type: ignore[attr-defined]
    if deleted_field is not None:
        filters.append(deleted_field.is_(None))
    record = await db.scalar(select(model).where(*filters))
    if record is None:
        raise APIError(
            404,
            code,
            "Business record not found",
            "The requested record does not exist in this workspace.",
        )
    return record


def page_result[T](
    records: list[T],
    settings: Settings,
    *,
    scope: str,
    limit: int,
    created_at: Callable[[T], datetime],
    record_id: Callable[[T], uuid.UUID],
) -> tuple[list[T], str | None]:
    visible = records[:limit]
    cursor = (
        encode_cursor(settings, scope, created_at(visible[-1]), record_id(visible[-1]))
        if len(records) > limit and visible
        else None
    )
    return visible, cursor


async def validate_parent_task(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    task_id: uuid.UUID | None,
    parent_id: uuid.UUID | None,
) -> None:
    if parent_id is None:
        return
    parent = await scoped_record(
        db,
        WorkspaceTask,
        parent_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    current: WorkspaceTask | None = parent
    visited: set[uuid.UUID] = set()
    while current is not None:
        if current.id == task_id or current.id in visited:
            raise APIError(
                409,
                "task_cycle",
                "Task cycle detected",
                "The task parent relationship would create a cycle.",
            )
        visited.add(current.id)
        current = (
            await db.scalar(
                select(WorkspaceTask).where(
                    WorkspaceTask.id == current.parent_id,
                    WorkspaceTask.workspace_id == workspace_id,
                )
            )
            if current.parent_id
            else None
        )


async def add_task_dependency(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    depends_on_task_id: uuid.UUID,
    actor_user_id: uuid.UUID,
) -> TaskDependency:
    await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    await scoped_record(
        db,
        WorkspaceTask,
        depends_on_task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    if task_id == depends_on_task_id:
        raise APIError(409, "task_cycle", "Task cycle detected", "A task cannot depend on itself.")
    frontier = [depends_on_task_id]
    visited: set[uuid.UUID] = set()
    while frontier:
        current = frontier.pop()
        if current == task_id:
            raise APIError(
                409,
                "task_cycle",
                "Task cycle detected",
                "The task dependency would create a cycle.",
            )
        if current in visited:
            continue
        visited.add(current)
        frontier.extend(
            list(
                (
                    await db.scalars(
                        select(TaskDependency.depends_on_task_id).where(
                            TaskDependency.workspace_id == workspace_id,
                            TaskDependency.task_id == current,
                        )
                    )
                ).all()
            )
        )
    existing = await db.scalar(
        select(TaskDependency).where(
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_task_id == depends_on_task_id,
        )
    )
    if existing is not None:
        return existing
    dependency = TaskDependency(
        workspace_id=workspace_id,
        task_id=task_id,
        depends_on_task_id=depends_on_task_id,
        created_by_id=actor_user_id,
    )
    db.add(dependency)
    db.add(
        TaskActivity(
            workspace_id=workspace_id,
            task_id=task_id,
            actor_user_id=actor_user_id,
            action="dependency_added",
            detail={"depends_on_task_id": str(depends_on_task_id)},
            created_at=utcnow(),
        )
    )
    await db.flush()
    return dependency


async def calendar_conflicts(
    db: AsyncSession,
    *,
    workspace_id: uuid.UUID,
    starts_at: datetime,
    ends_at: datetime,
    attendees: list[str],
    exclude_event_id: uuid.UUID | None = None,
) -> list[CalendarEvent]:
    filters = [
        CalendarEvent.workspace_id == workspace_id,
        CalendarEvent.deleted_at.is_(None),
        CalendarEvent.starts_at < ends_at,
        CalendarEvent.ends_at > starts_at,
    ]
    if exclude_event_id is not None:
        filters.append(CalendarEvent.id != exclude_event_id)
    candidates = list((await db.scalars(select(CalendarEvent).where(*filters))).all())
    attendee_set = set(attendees)
    return [
        event
        for event in candidates
        if not attendee_set or attendee_set.intersection(event.attendees)
    ]


def can_read_document(
    document: BusinessDocument,
    membership: WorkspaceMembership | None,
    user_id: uuid.UUID,
) -> bool:
    if membership is None or membership.role in {WorkspaceRole.owner, WorkspaceRole.admin}:
        return True
    if document.classification in {
        DocumentClassification.public,
        DocumentClassification.internal,
    }:
        return True
    if document.classification == DocumentClassification.confidential:
        return membership.role == WorkspaceRole.manager or document.owner_user_id == user_id
    return document.owner_user_id == user_id


async def require_document_access(
    db: AsyncSession,
    user_id: uuid.UUID,
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    *,
    write: bool = False,
) -> tuple[BusinessDocument, WorkspaceMembership | None]:
    _, membership = await require_workspace_permission(
        db,
        user_id,
        workspace_id,
        "documents.write" if write else "documents.read",
    )
    document = await scoped_record(
        db,
        BusinessDocument,
        document_id,
        workspace_id,
        deleted_field=BusinessDocument.deleted_at,
        code="document_not_found",
    )
    if not can_read_document(document, membership, user_id):
        raise APIError(
            404,
            "document_not_found",
            "Document not found",
            "The document does not exist or is not accessible.",
        )
    return document, membership


async def next_document_version(
    db: AsyncSession, document: BusinessDocument, actor_user_id: uuid.UUID, **values: Any
) -> BusinessDocumentVersion:
    number = (
        int(
            await db.scalar(
                select(func.max(BusinessDocumentVersion.version_number)).where(
                    BusinessDocumentVersion.document_id == document.id
                )
            )
            or 0
        )
        + 1
    )
    version_id = uuid.uuid4()
    version = BusinessDocumentVersion(
        id=version_id,
        workspace_id=document.workspace_id,
        document_id=document.id,
        version_number=number,
        object_key=f"business-documents/{document.workspace_id}/{document.id}/{version_id}",
        created_by_id=actor_user_id,
        **values,
    )
    return version


async def settle_finance_invoice_webhook(
    db: AsyncSession,
    *,
    provider_name: str,
    operation_id: str | None,
    operation_status: str | None,
) -> bool:
    if operation_id is None or operation_status != "succeeded":
        return False
    reference = await db.scalar(
        select(FinanceTransactionReference).where(
            FinanceTransactionReference.provider == provider_name,
            FinanceTransactionReference.external_reference == operation_id,
            FinanceTransactionReference.reference_type == "provider_payment",
        )
    )
    if reference is None or reference.invoice_id is None:
        return False
    invoice = await db.scalar(
        select(Invoice).where(Invoice.id == reference.invoice_id).with_for_update()
    )
    if invoice is None:
        return False
    if invoice.status == InvoiceStatus.sent:
        invoice.status = InvoiceStatus.paid
        invoice.paid_at = utcnow()
    return True


async def scrub_business_user_records(
    db: AsyncSession, user_id: uuid.UUID, original_email: str
) -> None:
    memberships = list(
        (
            await db.scalars(
                select(WorkspaceMembership).where(
                    WorkspaceMembership.user_id == user_id,
                    WorkspaceMembership.status == WorkspaceMembershipStatus.active,
                )
            )
        ).all()
    )
    for membership in memberships:
        if membership.role == WorkspaceRole.owner:
            other_owner = await db.scalar(
                select(WorkspaceMembership)
                .where(
                    WorkspaceMembership.workspace_id == membership.workspace_id,
                    WorkspaceMembership.user_id != user_id,
                    WorkspaceMembership.role == WorkspaceRole.owner,
                    WorkspaceMembership.status == WorkspaceMembershipStatus.active,
                )
                .order_by(WorkspaceMembership.created_at, WorkspaceMembership.id)
                .limit(1)
            )
            if other_owner is None:
                raise APIError(
                    409,
                    "workspace_ownership_transfer_required",
                    "Workspace ownership transfer required",
                    "Transfer ownership of every workspace before deleting this account.",
                )
            workspace = await db.get(Workspace, membership.workspace_id)
            if workspace is not None and workspace.owner_user_id == user_id:
                workspace.owner_user_id = other_owner.user_id
        await db.delete(membership)
    await db.execute(delete(TeamMembership).where(TeamMembership.user_id == user_id))
    await db.execute(
        delete(WorkspaceInvitation).where(
            WorkspaceInvitation.email == original_email,
            WorkspaceInvitation.accepted_at.is_(None),
        )
    )
    await db.execute(
        delete(BusinessDocument).where(
            BusinessDocument.created_by_id == user_id,
            BusinessDocument.state == DocumentState.draft,
            BusinessDocument.current_version_id.is_(None),
        )
    )
    # Business CRM, task, document history, finance, and audit records remain
    # linked to the pseudonymized User row or use nullable actor references.


async def create_workspace_defaults(
    db: AsyncSession, workspace: Workspace, actor_user_id: uuid.UUID
) -> None:
    from app.business_models import PipelineStage

    defaults = (
        ("lead", "Lead", 0, 1000),
        ("qualified", "Qualified", 1, 3000),
        ("proposal", "Proposal", 2, 6000),
        ("won", "Won", 3, 10_000),
        ("lost", "Lost", 4, 0),
    )
    for key, name, position, probability in defaults:
        db.add(
            PipelineStage(
                workspace_id=workspace.id,
                key=key,
                name=name,
                position=position,
                probability_bps=probability,
            )
        )


def stable_feature_bucket(settings: Settings, key: str, subject: str) -> int:
    digest = hmac.new(
        settings.jwt_secret.get_secret_value().encode(),
        ("feature-flag\x00" + key + "\x00" + subject).encode(),
        hashlib.sha256,
    ).digest()
    return int.from_bytes(digest[:8], "big") % 10_000
