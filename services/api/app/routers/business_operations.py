from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, Query, Request, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.business_models import (
    BudgetCategory,
    BusinessBudget,
    BusinessDocument,
    BusinessDocumentVersion,
    BusinessFolder,
    CalendarEvent,
    CRMCompany,
    CRMContact,
    DocumentApproval,
    DocumentState,
    Expense,
    ExpenseApproval,
    ExpenseStatus,
    FinanceTransactionReference,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    TaskActivity,
    TaskComment,
    TaskDependency,
    TaskStatus,
    Team,
    WorkspaceTask,
)
from app.business_schemas import (
    ApprovalDecision,
    ApprovalRequestCreate,
    BudgetCategoryCreate,
    BudgetCreate,
    BudgetPatch,
    CalendarEventCreate,
    CalendarEventPatch,
    DocumentCreate,
    DocumentPatch,
    DocumentVersionCreate,
    ESignatureCreate,
    ExpenseCreate,
    ExpenseDecision,
    ExpensePatch,
    FolderCreate,
    InvoiceCreate,
    InvoicePatch,
    InvoicePaymentIntentCreate,
    ReconciliationCreate,
    TaskCommentCreate,
    TaskCreate,
    TaskPatch,
)
from app.business_service import (
    AccountingProvider,
    ESignatureProvider,
    add_business_audit,
    add_task_dependency,
    calendar_conflicts,
    can_read_document,
    next_document_version,
    page_result,
    require_document_access,
    require_member_user,
    require_workspace_permission,
    scoped_record,
    validate_parent_task,
)
from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.ledger_service import validate_safe_metadata
from app.payments import PaymentProvider
from app.platform_service import validate_checkout_result
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor
from app.storage import S3ObjectStorage

router = APIRouter(prefix="/business", tags=["Business"])

IdempotencyKey = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=128,
        pattern=r"^[A-Za-z0-9._:-]+$",
    ),
]


def record(item: Any, *fields: str) -> dict[str, Any]:
    return {field: getattr(item, field) for field in fields}


TASK_FIELDS = (
    "id",
    "workspace_id",
    "title",
    "description",
    "status",
    "priority",
    "assignee_user_id",
    "team_id",
    "parent_id",
    "starts_at",
    "due_at",
    "completed_at",
    "version",
    "created_by_id",
    "created_at",
    "updated_at",
)


async def validate_task_refs(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    task_id: uuid.UUID | None,
    assignee_user_id: uuid.UUID | None,
    team_id: uuid.UUID | None,
    parent_id: uuid.UUID | None,
) -> None:
    await require_member_user(db, workspace_id, assignee_user_id)
    if team_id is not None:
        await scoped_record(db, Team, team_id, workspace_id, code="team_not_found")
    await validate_parent_task(db, workspace_id, task_id, parent_id)


@router.get("/tasks")
async def list_tasks(
    workspace_id: uuid.UUID,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    task_status: TaskStatus | None = Query(default=None, alias="status"),
    assignee_user_id: uuid.UUID | None = None,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.read")
    statement = select(WorkspaceTask).where(
        WorkspaceTask.workspace_id == workspace_id, WorkspaceTask.deleted_at.is_(None)
    )
    if task_status is not None:
        statement = statement.where(WorkspaceTask.status == task_status)
    if assignee_user_id is not None:
        statement = statement.where(WorkspaceTask.assignee_user_id == assignee_user_id)
    scope = f"business-tasks:{workspace_id}:{task_status}:{assignee_user_id}"
    statement = apply_cursor(
        statement,
        WorkspaceTask.created_at,
        WorkspaceTask.id,
        decode_cursor(settings, scope, cursor),
    ).order_by(WorkspaceTask.created_at.desc(), WorkspaceTask.id.desc()).limit(limit + 1)
    rows = list((await db.scalars(statement)).all())
    visible, next_cursor = page_result(
        rows,
        settings,
        scope=scope,
        limit=limit,
        created_at=lambda item: item.created_at,
        record_id=lambda item: item.id,
    )
    return {"items": [record(item, *TASK_FIELDS) for item in visible], "next_cursor": next_cursor}


@router.post("/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(
    workspace_id: uuid.UUID,
    payload: TaskCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    await validate_task_refs(
        db,
        workspace_id,
        task_id=None,
        assignee_user_id=payload.assignee_user_id,
        team_id=payload.team_id,
        parent_id=payload.parent_id,
    )
    task = WorkspaceTask(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **payload.model_dump(),
    )
    if task.status == TaskStatus.completed:
        task.completed_at = utcnow()
    db.add(task)
    await db.flush()
    db.add(
        TaskActivity(
            workspace_id=workspace_id,
            task_id=task.id,
            actor_user_id=auth.user.id,
            action="created",
            detail={},
            created_at=utcnow(),
        )
    )
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="task.created",
        aggregate_type="task",
        aggregate_id=task.id,
    )
    await db.commit()
    await db.refresh(task)
    return record(task, *TASK_FIELDS)


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.read")
    task = await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    dependencies = list(
        (
            await db.scalars(
                select(TaskDependency.depends_on_task_id).where(
                    TaskDependency.workspace_id == workspace_id,
                    TaskDependency.task_id == task.id,
                )
            )
        ).all()
    )
    return {**record(task, *TASK_FIELDS), "dependency_ids": dependencies}


@router.patch("/tasks/{task_id}")
async def patch_task(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: TaskPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    task = await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    if task.version != payload.version:
        raise APIError(
            409,
            "task_version_conflict",
            "Task version conflict",
            "The task changed since it was loaded; reload it before updating.",
            extra={"current_version": task.version},
        )
    await validate_task_refs(
        db,
        workspace_id,
        task_id=task.id,
        assignee_user_id=payload.assignee_user_id
        if "assignee_user_id" in payload.model_fields_set
        else None,
        team_id=payload.team_id if "team_id" in payload.model_fields_set else None,
        parent_id=payload.parent_id if "parent_id" in payload.model_fields_set else None,
    )
    values = payload.model_dump(exclude={"version"}, exclude_unset=True)
    starts_at = values.get("starts_at", task.starts_at)
    due_at = values.get("due_at", task.due_at)
    if starts_at is not None and due_at is not None and due_at < starts_at:
        raise APIError(
            422,
            "task_timing_invalid",
            "Invalid task timing",
            "The due date cannot precede the start date.",
        )
    if values.get("status") == TaskStatus.completed:
        incomplete = await db.scalar(
            select(TaskDependency.id)
            .join(
                WorkspaceTask,
                WorkspaceTask.id == TaskDependency.depends_on_task_id,
            )
            .where(
                TaskDependency.task_id == task.id,
                WorkspaceTask.status != TaskStatus.completed,
            )
            .limit(1)
        )
        if incomplete is not None:
            raise APIError(
                409,
                "task_dependencies_incomplete",
                "Task dependencies incomplete",
                "Complete every dependency before completing this task.",
            )
    resulting_status = values.get("status", task.status)
    completed_at = (
        task.completed_at or utcnow()
        if resulting_status == TaskStatus.completed
        else None
    )
    next_version = task.version + 1
    result = await db.execute(
        update(WorkspaceTask)
        .where(
            WorkspaceTask.id == task.id,
            WorkspaceTask.workspace_id == workspace_id,
            WorkspaceTask.version == payload.version,
        )
        .values(
            **values,
            completed_at=completed_at,
            version=next_version,
        )
    )
    if not getattr(result, "rowcount", 0):
        await db.rollback()
        current_version = await db.scalar(
            select(WorkspaceTask.version).where(WorkspaceTask.id == task.id)
        )
        raise APIError(
            409,
            "task_version_conflict",
            "Task version conflict",
            "The task changed since it was loaded; reload it before updating.",
            extra={"current_version": current_version},
        )
    db.add(
        TaskActivity(
            workspace_id=workspace_id,
            task_id=task.id,
            actor_user_id=auth.user.id,
            action="updated",
            detail={"fields": sorted(values), "version": next_version},
            created_at=utcnow(),
        )
    )
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="task.updated",
        aggregate_type="task",
        aggregate_id=task.id,
        metadata={"version": next_version},
    )
    await db.commit()
    await db.refresh(task)
    return record(task, *TASK_FIELDS)


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    version: Annotated[int, Query(ge=1)],
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return await patch_task(
        task_id,
        workspace_id,
        TaskPatch(version=version, status=TaskStatus.completed),
        request,
        auth,
        db,
    )


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    task = await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    task.deleted_at = utcnow()
    task.version += 1
    await db.commit()
    return {"status": "deleted"}


@router.put("/tasks/{task_id}/dependencies/{depends_on_task_id}")
async def create_task_dependency(
    task_id: uuid.UUID,
    depends_on_task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    dependency = await add_task_dependency(
        db,
        workspace_id=workspace_id,
        task_id=task_id,
        depends_on_task_id=depends_on_task_id,
        actor_user_id=auth.user.id,
    )
    await db.commit()
    return record(
        dependency, "id", "workspace_id", "task_id", "depends_on_task_id", "created_at"
    )


@router.delete("/tasks/{task_id}/dependencies/{depends_on_task_id}")
async def remove_task_dependency(
    task_id: uuid.UUID,
    depends_on_task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    await db.execute(
        delete(TaskDependency).where(
            TaskDependency.workspace_id == workspace_id,
            TaskDependency.task_id == task_id,
            TaskDependency.depends_on_task_id == depends_on_task_id,
        )
    )
    db.add(
        TaskActivity(
            workspace_id=workspace_id,
            task_id=task_id,
            actor_user_id=auth.user.id,
            action="dependency_removed",
            detail={"depends_on_task_id": str(depends_on_task_id)},
            created_at=utcnow(),
        )
    )
    await db.commit()
    return {"status": "removed"}


@router.post("/tasks/{task_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_task_comment(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: TaskCommentCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.write")
    await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    comment = TaskComment(
        workspace_id=workspace_id,
        task_id=task_id,
        author_user_id=auth.user.id,
        body=payload.body,
    )
    db.add(comment)
    await db.flush()
    db.add(
        TaskActivity(
            workspace_id=workspace_id,
            task_id=task_id,
            actor_user_id=auth.user.id,
            action="commented",
            detail={"comment_id": str(comment.id)},
            created_at=utcnow(),
        )
    )
    await db.commit()
    await db.refresh(comment)
    return record(comment, "id", "workspace_id", "task_id", "author_user_id", "body", "created_at")


@router.get("/tasks/{task_id}/activity")
async def list_task_activity(
    task_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "tasks.read")
    await scoped_record(
        db,
        WorkspaceTask,
        task_id,
        workspace_id,
        deleted_field=WorkspaceTask.deleted_at,
        code="task_not_found",
    )
    activities = list(
        (
            await db.scalars(
                select(TaskActivity)
                .where(
                    TaskActivity.workspace_id == workspace_id,
                    TaskActivity.task_id == task_id,
                )
                .order_by(TaskActivity.created_at, TaskActivity.id)
            )
        ).all()
    )
    comments = list(
        (
            await db.scalars(
                select(TaskComment)
                .where(
                    TaskComment.workspace_id == workspace_id,
                    TaskComment.task_id == task_id,
                )
                .order_by(TaskComment.created_at, TaskComment.id)
            )
        ).all()
    )
    return {
        "activities": [
            record(item, "id", "actor_user_id", "action", "detail", "created_at")
            for item in activities
        ],
        "comments": [
            record(item, "id", "author_user_id", "body", "created_at") for item in comments
        ],
    }


EVENT_FIELDS = (
    "id",
    "workspace_id",
    "title",
    "description",
    "starts_at",
    "ends_at",
    "timezone",
    "attendees",
    "recurrence_rule",
    "reminders",
    "source",
    "created_by_id",
    "created_at",
    "updated_at",
)


@router.get("/calendar/events")
@router.get("/calendar")
async def list_calendar_events(
    workspace_id: uuid.UUID,
    start: datetime,
    end: datetime,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.read")
    if start.tzinfo is None or end.tzinfo is None or end <= start:
        raise APIError(
            422,
            "calendar_range_invalid",
            "Invalid calendar range",
            "Provide a timezone-aware range with end later than start.",
        )
    if (end - start).days > 366:
        raise APIError(
            422,
            "calendar_range_too_large",
            "Calendar range too large",
            "Calendar ranges cannot exceed 366 days.",
        )
    events = (
        await db.scalars(
            select(CalendarEvent)
            .where(
                CalendarEvent.workspace_id == workspace_id,
                CalendarEvent.deleted_at.is_(None),
                CalendarEvent.starts_at < end,
                CalendarEvent.ends_at > start,
            )
            .order_by(CalendarEvent.starts_at, CalendarEvent.id)
        )
    ).all()
    return [record(item, *EVENT_FIELDS) for item in events]


@router.post("/calendar/events", status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    workspace_id: uuid.UUID,
    payload: CalendarEventCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.write")
    for attendee in payload.attendees:
        await require_member_user(db, workspace_id, attendee)
    attendee_ids = [str(item) for item in payload.attendees]
    conflicts = await calendar_conflicts(
        db,
        workspace_id=workspace_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        attendees=attendee_ids,
    )
    event = CalendarEvent(
        workspace_id=workspace_id,
        title=payload.title,
        description=payload.description,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        timezone=payload.timezone,
        attendees=attendee_ids,
        recurrence_rule=payload.recurrence_rule,
        reminders=payload.reminders,
        source="sylora",
        created_by_id=auth.user.id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return {**record(event, *EVENT_FIELDS), "conflict_ids": [item.id for item in conflicts]}


@router.put("/calendar/events/{event_id}")
@router.patch("/calendar/events/{event_id}")
async def update_calendar_event(
    event_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: CalendarEventPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.write")
    event = await scoped_record(
        db,
        CalendarEvent,
        event_id,
        workspace_id,
        deleted_field=CalendarEvent.deleted_at,
        code="calendar_event_not_found",
    )
    attendee_ids = list(event.attendees)
    if payload.attendees is not None:
        for attendee in payload.attendees:
            await require_member_user(db, workspace_id, attendee)
        attendee_ids = [str(item) for item in payload.attendees]
    starts_at = payload.starts_at or event.starts_at
    ends_at = payload.ends_at or event.ends_at
    if ends_at <= starts_at:
        raise APIError(
            422,
            "calendar_range_invalid",
            "Invalid calendar range",
            "The event end must be later than its start.",
        )
    conflicts = await calendar_conflicts(
        db,
        workspace_id=workspace_id,
        starts_at=starts_at,
        ends_at=ends_at,
        attendees=attendee_ids,
        exclude_event_id=event.id,
    )
    values = payload.model_dump(exclude_unset=True)
    if payload.attendees is not None:
        values["attendees"] = attendee_ids
    for field, value in values.items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return {**record(event, *EVENT_FIELDS), "conflict_ids": [item.id for item in conflicts]}


@router.get("/calendar/conflicts")
async def detect_calendar_conflicts(
    workspace_id: uuid.UUID,
    start: datetime,
    end: datetime,
    attendee_id: list[uuid.UUID] = Query(default_factory=list),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.read")
    if start.tzinfo is None or end.tzinfo is None or end <= start:
        raise APIError(
            422,
            "calendar_range_invalid",
            "Invalid calendar range",
            "Provide a timezone-aware range with end later than start.",
        )
    conflicts = await calendar_conflicts(
        db,
        workspace_id=workspace_id,
        starts_at=start,
        ends_at=end,
        attendees=[str(item) for item in attendee_id],
    )
    return [record(item, *EVENT_FIELDS) for item in conflicts]


@router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(
    event_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.write")
    event = await scoped_record(
        db,
        CalendarEvent,
        event_id,
        workspace_id,
        deleted_field=CalendarEvent.deleted_at,
        code="calendar_event_not_found",
    )
    event.deleted_at = utcnow()
    await db.commit()
    return {"status": "deleted"}


@router.post("/calendar/sync", status_code=status.HTTP_202_ACCEPTED)
async def sync_external_calendar(
    workspace_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "calendar.write")
    provider = request.app.state.calendar_sync_provider
    operation_id = await provider.queue_sync(workspace_id=workspace_id)
    return {"status": "queued", "provider_operation_id": operation_id}


@router.get("/documents/folders")
async def list_folders(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "documents.read")
    folders = (
        await db.scalars(
            select(BusinessFolder)
            .where(BusinessFolder.workspace_id == workspace_id)
            .order_by(BusinessFolder.name, BusinessFolder.id)
        )
    ).all()
    return [
        record(item, "id", "workspace_id", "parent_id", "name", "created_at")
        for item in folders
    ]


@router.post("/documents/folders", status_code=status.HTTP_201_CREATED)
async def create_folder(
    workspace_id: uuid.UUID,
    payload: FolderCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "documents.write")
    if payload.parent_id:
        await scoped_record(
            db, BusinessFolder, payload.parent_id, workspace_id, code="folder_not_found"
        )
    folder = BusinessFolder(
        workspace_id=workspace_id,
        name=payload.name,
        parent_id=payload.parent_id,
        created_by_id=auth.user.id,
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return record(folder, "id", "workspace_id", "parent_id", "name", "created_at")


DOCUMENT_FIELDS = (
    "id",
    "workspace_id",
    "folder_id",
    "title",
    "state",
    "classification",
    "owner_user_id",
    "current_version_id",
    "created_by_id",
    "created_at",
    "updated_at",
)


@router.get("/documents")
async def list_documents(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    _, membership = await require_workspace_permission(
        db, auth.user.id, workspace_id, "documents.read"
    )
    documents = (
        await db.scalars(
            select(BusinessDocument)
            .where(
                BusinessDocument.workspace_id == workspace_id,
                BusinessDocument.deleted_at.is_(None),
            )
            .order_by(BusinessDocument.created_at.desc(), BusinessDocument.id.desc())
        )
    ).all()
    return [
        record(item, *DOCUMENT_FIELDS)
        for item in documents
        if can_read_document(item, membership, auth.user.id)
    ]


@router.post("/documents", status_code=status.HTTP_201_CREATED)
async def create_document(
    workspace_id: uuid.UUID,
    payload: DocumentCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "documents.write")
    if payload.folder_id:
        await scoped_record(
            db, BusinessFolder, payload.folder_id, workspace_id, code="folder_not_found"
        )
    await require_member_user(db, workspace_id, payload.owner_user_id)
    document = BusinessDocument(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        owner_user_id=payload.owner_user_id or auth.user.id,
        title=payload.title,
        folder_id=payload.folder_id,
        classification=payload.classification,
    )
    db.add(document)
    await db.flush()
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="document.created",
        aggregate_type="document",
        aggregate_id=document.id,
    )
    await db.commit()
    await db.refresh(document)
    return record(document, *DOCUMENT_FIELDS)


@router.get("/documents/{document_id}")
async def get_document(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id
    )
    versions = (
        await db.scalars(
            select(BusinessDocumentVersion)
            .where(
                BusinessDocumentVersion.workspace_id == workspace_id,
                BusinessDocumentVersion.document_id == document.id,
            )
            .order_by(BusinessDocumentVersion.version_number)
        )
    ).all()
    return {
        **record(document, *DOCUMENT_FIELDS),
        "versions": [
            record(
                item,
                "id",
                "version_number",
                "sha256",
                "content_type",
                "byte_size",
                "rights_declaration",
                "upload_state",
                "created_by_id",
                "created_at",
                "verified_at",
            )
            for item in versions
        ],
    }


@router.patch("/documents/{document_id}")
async def patch_document(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: DocumentPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    if "folder_id" in payload.model_fields_set and payload.folder_id:
        await scoped_record(
            db, BusinessFolder, payload.folder_id, workspace_id, code="folder_not_found"
        )
    if "owner_user_id" in payload.model_fields_set:
        await require_member_user(db, workspace_id, payload.owner_user_id)
    if payload.state == DocumentState.published:
        if document.current_version_id is None:
            raise APIError(
                409,
                "document_version_required",
                "Verified document version required",
                "Publish only after verifying a document version.",
            )
        approved = await db.scalar(
            select(DocumentApproval.id).where(
                DocumentApproval.workspace_id == workspace_id,
                DocumentApproval.document_id == document.id,
                DocumentApproval.version_id == document.current_version_id,
                DocumentApproval.status == "approved",
            )
        )
        if approved is None:
            raise APIError(
                409,
                "document_approval_required",
                "Document approval required",
                "The current document version must be approved before publication.",
            )
    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(document, field, value)
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="document.updated",
        aggregate_type="document",
        aggregate_id=document.id,
        metadata={"fields": sorted(values)},
    )
    await db.commit()
    await db.refresh(document)
    return record(document, *DOCUMENT_FIELDS)


@router.post("/documents/{document_id}/versions", status_code=status.HTTP_201_CREATED)
@router.post("/documents/{document_id}/upload", status_code=status.HTTP_201_CREATED)
async def create_document_version(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: DocumentVersionCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    version = await next_document_version(
        db,
        document,
        auth.user.id,
        sha256=payload.sha256,
        content_type=payload.content_type,
        byte_size=payload.byte_size,
        rights_declaration=payload.rights_declaration,
        upload_state="pending",
    )
    storage: S3ObjectStorage = request.app.state.object_storage
    upload = await storage.presign_put(
        object_key=version.object_key,
        content_type=version.content_type,
        sha256_hex=version.sha256,
    )
    db.add(version)
    await db.commit()
    return {
        "version_id": version.id,
        "version_number": version.version_number,
        "object_key": version.object_key,
        "upload_url": upload.url,
        "headers": upload.headers,
        "expires_in_seconds": upload.expires_in_seconds,
    }


@router.post("/documents/{document_id}/versions/{version_id}/verify")
async def verify_document_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    workspace_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    version = await scoped_record(
        db,
        BusinessDocumentVersion,
        version_id,
        workspace_id,
        code="document_version_not_found",
    )
    if version.document_id != document.id:
        raise APIError(
            404,
            "document_version_not_found",
            "Document version not found",
            "The version does not belong to this document.",
        )
    if version.upload_state == "verified":
        return record(
            version,
            "id",
            "version_number",
            "sha256",
            "content_type",
            "byte_size",
            "upload_state",
            "verified_at",
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    await storage.verify_object(
        object_key=version.object_key,
        expected_content_type=version.content_type,
        expected_byte_size=version.byte_size,
        expected_sha256=version.sha256,
    )
    version.upload_state = "verified"
    version.verified_at = utcnow()
    document.current_version_id = version.id
    await db.commit()
    await db.refresh(version)
    return record(
        version,
        "id",
        "version_number",
        "sha256",
        "content_type",
        "byte_size",
        "upload_state",
        "verified_at",
    )


@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id
    )
    if document.current_version_id is None:
        raise APIError(
            409,
            "document_version_required",
            "Verified document version required",
            "This document has no verified version.",
        )
    version = await db.get(BusinessDocumentVersion, document.current_version_id)
    if version is None or version.upload_state != "verified":
        raise APIError(
            409,
            "document_version_required",
            "Verified document version required",
            "This document has no verified version.",
        )
    storage: S3ObjectStorage = request.app.state.object_storage
    return {
        "download_url": await storage.presign_get(object_key=version.object_key),
        "expires_in_seconds": storage.settings.s3_presign_seconds,
        "version_id": version.id,
    }


@router.post("/documents/{document_id}/approvals", status_code=status.HTTP_201_CREATED)
async def request_document_approval(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ApprovalRequestCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    await require_member_user(db, workspace_id, payload.approver_user_id)
    if document.current_version_id is None:
        raise APIError(
            409,
            "document_version_required",
            "Verified document version required",
            "Verify a document version before requesting approval.",
        )
    approval = DocumentApproval(
        workspace_id=workspace_id,
        document_id=document.id,
        version_id=document.current_version_id,
        requested_by_id=auth.user.id,
        approver_user_id=payload.approver_user_id,
        status="pending",
        note=payload.note,
    )
    document.state = DocumentState.review
    db.add(approval)
    await db.flush()
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="document.approval_requested",
        aggregate_type="approval",
        aggregate_id=approval.id,
        metadata={"document_id": str(document.id), "version_id": str(document.current_version_id)},
    )
    await db.commit()
    await db.refresh(approval)
    return record(
        approval,
        "id",
        "workspace_id",
        "document_id",
        "version_id",
        "requested_by_id",
        "approver_user_id",
        "status",
        "note",
        "created_at",
        "decided_at",
    )


@router.post("/documents/{document_id}/approvals/{approval_id}/decision")
async def decide_document_approval(
    document_id: uuid.UUID,
    approval_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ApprovalDecision,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_document_access(db, auth.user.id, workspace_id, document_id)
    approval = await scoped_record(
        db, DocumentApproval, approval_id, workspace_id, code="document_approval_not_found"
    )
    if approval.document_id != document_id:
        raise APIError(
            404,
            "document_approval_not_found",
            "Document approval not found",
            "The approval does not belong to this document.",
        )
    if approval.approver_user_id != auth.user.id:
        await require_workspace_permission(
            db, auth.user.id, workspace_id, "documents.approve"
        )
    if approval.status != "pending":
        raise APIError(
            409,
            "document_approval_decided",
            "Document approval already decided",
            "An approval decision is final.",
        )
    approval.status = payload.decision
    approval.note = payload.note or approval.note
    approval.decided_at = utcnow()
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action=f"document.{payload.decision}",
        aggregate_type="approval",
        aggregate_id=approval.id,
    )
    await db.commit()
    await db.refresh(approval)
    return record(approval, "id", "status", "note", "decided_at")


@router.post("/documents/{document_id}/esignature", status_code=status.HTTP_202_ACCEPTED)
async def create_esignature_request(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ESignatureCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    if document.current_version_id is None:
        raise APIError(
            409,
            "document_version_required",
            "Verified document version required",
            "Verify a document version before requesting signatures.",
        )
    provider: ESignatureProvider = request.app.state.esignature_provider
    operation_id = await provider.create_signature_request(
        document_id=document.id,
        version_id=document.current_version_id,
        signer_emails=payload.signer_emails,
    )
    return {"status": "queued", "provider_operation_id": operation_id}


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    document, _ = await require_document_access(
        db, auth.user.id, workspace_id, document_id, write=True
    )
    if document.state in {DocumentState.published, DocumentState.archived}:
        raise APIError(
            409,
            "document_history_preserved",
            "Document history preserved",
            "Published or archived documents cannot be deleted.",
        )
    document.deleted_at = utcnow()
    await db.commit()
    return {"status": "deleted"}


@router.get("/finance/budgets")
async def list_budgets(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.read")
    budgets = (
        await db.scalars(
            select(BusinessBudget)
            .where(BusinessBudget.workspace_id == workspace_id)
            .order_by(BusinessBudget.period_start.desc(), BusinessBudget.id.desc())
        )
    ).all()
    return [
        record(
            item,
            "id",
            "workspace_id",
            "name",
            "amount_minor",
            "currency",
            "period_start",
            "period_end",
            "status",
            "created_at",
            "updated_at",
        )
        for item in budgets
    ]


@router.post("/finance/budgets", status_code=status.HTTP_201_CREATED)
async def create_budget(
    workspace_id: uuid.UUID,
    payload: BudgetCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    budget = BusinessBudget(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **payload.model_dump(),
    )
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return record(
        budget,
        "id",
        "workspace_id",
        "name",
        "amount_minor",
        "currency",
        "period_start",
        "period_end",
        "status",
        "created_at",
    )


@router.patch("/finance/budgets/{budget_id}")
async def patch_budget(
    budget_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: BudgetPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    budget = await scoped_record(
        db, BusinessBudget, budget_id, workspace_id, code="budget_not_found"
    )
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(budget, field, value)
    await db.commit()
    await db.refresh(budget)
    return record(budget, "id", "name", "amount_minor", "currency", "status", "updated_at")


@router.post("/finance/budget-categories", status_code=status.HTTP_201_CREATED)
async def create_budget_category(
    workspace_id: uuid.UUID,
    payload: BudgetCategoryCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    await scoped_record(
        db, BusinessBudget, payload.budget_id, workspace_id, code="budget_not_found"
    )
    category = BudgetCategory(workspace_id=workspace_id, **payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return record(
        category, "id", "workspace_id", "budget_id", "name", "allocated_minor", "created_at"
    )


EXPENSE_FIELDS = (
    "id",
    "workspace_id",
    "category_id",
    "vendor",
    "description",
    "amount_minor",
    "currency",
    "incurred_at",
    "receipt_object_key",
    "status",
    "submitted_by_id",
    "created_at",
    "updated_at",
)


@router.get("/finance/expenses")
async def list_expenses(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.read")
    expenses = (
        await db.scalars(
            select(Expense)
            .where(Expense.workspace_id == workspace_id)
            .order_by(Expense.created_at.desc(), Expense.id.desc())
        )
    ).all()
    return [record(item, *EXPENSE_FIELDS) for item in expenses]


async def validate_expense_refs(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    category_id: uuid.UUID | None,
    receipt_object_key: str | None,
) -> None:
    if category_id:
        await scoped_record(
            db, BudgetCategory, category_id, workspace_id, code="budget_category_not_found"
        )
    if receipt_object_key:
        verified = await db.scalar(
            select(BusinessDocumentVersion.id).where(
                BusinessDocumentVersion.workspace_id == workspace_id,
                BusinessDocumentVersion.object_key == receipt_object_key,
                BusinessDocumentVersion.upload_state == "verified",
            )
        )
        if verified is None:
            raise APIError(
                422,
                "expense_receipt_not_verified",
                "Expense receipt not verified",
                "The receipt must reference a verified workspace document object.",
            )


@router.post("/finance/expenses", status_code=status.HTTP_201_CREATED)
async def create_expense(
    workspace_id: uuid.UUID,
    payload: ExpenseCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    await validate_expense_refs(
        db,
        workspace_id,
        category_id=payload.category_id,
        receipt_object_key=payload.receipt_object_key,
    )
    expense = Expense(
        workspace_id=workspace_id,
        submitted_by_id=auth.user.id,
        **payload.model_dump(),
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return record(expense, *EXPENSE_FIELDS)


@router.patch("/finance/expenses/{expense_id}")
async def patch_expense(
    expense_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ExpensePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    expense = await scoped_record(db, Expense, expense_id, workspace_id, code="expense_not_found")
    if expense.status != ExpenseStatus.draft:
        raise APIError(
            409,
            "expense_not_editable",
            "Expense not editable",
            "Only draft expenses can be edited.",
        )
    values = payload.model_dump(exclude_unset=True)
    await validate_expense_refs(
        db,
        workspace_id,
        category_id=values.get("category_id"),
        receipt_object_key=values.get("receipt_object_key"),
    )
    for field, value in values.items():
        setattr(expense, field, value)
    await db.commit()
    await db.refresh(expense)
    return record(expense, *EXPENSE_FIELDS)


@router.post("/finance/expenses/{expense_id}/submit")
async def submit_expense(
    expense_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    expense = await scoped_record(db, Expense, expense_id, workspace_id, code="expense_not_found")
    if expense.status != ExpenseStatus.draft:
        raise APIError(
            409,
            "expense_state_invalid",
            "Invalid expense state",
            "Only draft expenses can be submitted.",
        )
    expense.status = ExpenseStatus.submitted
    expense.submitted_by_id = auth.user.id
    await db.commit()
    await db.refresh(expense)
    return record(expense, *EXPENSE_FIELDS)


@router.post("/finance/expenses/{expense_id}/decision")
@router.post("/finance/expenses/{expense_id}/approve")
async def decide_expense(
    expense_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ExpenseDecision,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.approve")
    expense = await scoped_record(db, Expense, expense_id, workspace_id, code="expense_not_found")
    if expense.status != ExpenseStatus.submitted:
        raise APIError(
            409,
            "expense_state_invalid",
            "Invalid expense state",
            "Only submitted expenses can be approved or rejected.",
        )
    expense.status = (
        ExpenseStatus.approved if payload.decision == "approved" else ExpenseStatus.rejected
    )
    approval = ExpenseApproval(
        workspace_id=workspace_id,
        expense_id=expense.id,
        approver_user_id=auth.user.id,
        decision=payload.decision,
        reason=payload.reason,
    )
    db.add(approval)
    await db.flush()
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action=f"expense.{payload.decision}",
        aggregate_type="expense",
        aggregate_id=expense.id,
        metadata={"approval_id": str(approval.id)},
    )
    await db.commit()
    await db.refresh(expense)
    return record(expense, *EXPENSE_FIELDS)


INVOICE_FIELDS = (
    "id",
    "workspace_id",
    "number",
    "contact_id",
    "company_id",
    "currency",
    "subtotal_minor",
    "tax_minor",
    "total_minor",
    "status",
    "issued_at",
    "due_at",
    "paid_at",
    "created_by_id",
    "created_at",
    "updated_at",
)


async def invoice_response(db: AsyncSession, invoice: Invoice) -> dict[str, Any]:
    lines = (
        await db.scalars(
            select(InvoiceLine)
            .where(
                InvoiceLine.workspace_id == invoice.workspace_id,
                InvoiceLine.invoice_id == invoice.id,
            )
            .order_by(InvoiceLine.position, InvoiceLine.id)
        )
    ).all()
    return {
        **record(invoice, *INVOICE_FIELDS),
        "lines": [
            record(
                item,
                "id",
                "description",
                "quantity",
                "unit_amount_minor",
                "line_total_minor",
                "position",
            )
            for item in lines
        ],
    }


async def replace_invoice_lines(
    db: AsyncSession,
    invoice: Invoice,
    lines: list[Any],
    tax_minor: int,
) -> None:
    await db.execute(delete(InvoiceLine).where(InvoiceLine.invoice_id == invoice.id))
    subtotal = 0
    for position, payload in enumerate(lines):
        line_total = payload.quantity * payload.unit_amount_minor
        subtotal += line_total
        db.add(
            InvoiceLine(
                workspace_id=invoice.workspace_id,
                invoice_id=invoice.id,
                description=payload.description,
                quantity=payload.quantity,
                unit_amount_minor=payload.unit_amount_minor,
                line_total_minor=line_total,
                position=position,
            )
        )
    invoice.subtotal_minor = subtotal
    invoice.tax_minor = tax_minor
    invoice.total_minor = subtotal + tax_minor


async def validate_invoice_parties(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    contact_id: uuid.UUID | None,
    company_id: uuid.UUID | None,
) -> None:
    if contact_id:
        await scoped_record(
            db,
            CRMContact,
            contact_id,
            workspace_id,
            deleted_field=CRMContact.deleted_at,
            code="crm_contact_not_found",
        )
    if company_id:
        await scoped_record(
            db,
            CRMCompany,
            company_id,
            workspace_id,
            deleted_field=CRMCompany.deleted_at,
            code="crm_company_not_found",
        )


@router.get("/finance/invoices")
async def list_invoices(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.read")
    invoices = (
        await db.scalars(
            select(Invoice)
            .where(Invoice.workspace_id == workspace_id)
            .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        )
    ).all()
    return [await invoice_response(db, item) for item in invoices]


@router.post("/finance/invoices", status_code=status.HTTP_201_CREATED)
async def create_invoice(
    workspace_id: uuid.UUID,
    payload: InvoiceCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    await validate_invoice_parties(
        db,
        workspace_id,
        contact_id=payload.contact_id,
        company_id=payload.company_id,
    )
    invoice = Invoice(
        workspace_id=workspace_id,
        number=payload.number,
        contact_id=payload.contact_id,
        company_id=payload.company_id,
        currency=payload.currency,
        tax_minor=payload.tax_minor,
        due_at=payload.due_at,
        created_by_id=auth.user.id,
    )
    db.add(invoice)
    await db.flush()
    await replace_invoice_lines(db, invoice, payload.lines, payload.tax_minor)
    await db.commit()
    await db.refresh(invoice)
    return await invoice_response(db, invoice)


@router.get("/finance/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.read")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    return await invoice_response(db, invoice)


@router.patch("/finance/invoices/{invoice_id}")
async def patch_invoice(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: InvoicePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    if invoice.status != InvoiceStatus.draft:
        raise APIError(
            409,
            "invoice_not_editable",
            "Invoice not editable",
            "Only draft invoices can be edited.",
        )
    await validate_invoice_parties(
        db,
        workspace_id,
        contact_id=payload.contact_id if "contact_id" in payload.model_fields_set else None,
        company_id=payload.company_id if "company_id" in payload.model_fields_set else None,
    )
    values = payload.model_dump(exclude_unset=True, exclude={"lines"})
    for field, value in values.items():
        setattr(invoice, field, value)
    if payload.lines is not None:
        await replace_invoice_lines(
            db,
            invoice,
            payload.lines,
            payload.tax_minor if payload.tax_minor is not None else invoice.tax_minor,
        )
    elif payload.tax_minor is not None:
        invoice.total_minor = invoice.subtotal_minor + payload.tax_minor
    await db.commit()
    await db.refresh(invoice)
    return await invoice_response(db, invoice)


@router.post("/finance/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    if invoice.status != InvoiceStatus.draft:
        raise APIError(
            409,
            "invoice_state_invalid",
            "Invalid invoice state",
            "Only a draft invoice can be sent.",
        )
    invoice.status = InvoiceStatus.sent
    invoice.issued_at = utcnow()
    await db.commit()
    await db.refresh(invoice)
    return await invoice_response(db, invoice)


@router.post("/finance/invoices/{invoice_id}/void")
async def void_invoice(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.approve")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    if invoice.status == InvoiceStatus.paid:
        raise APIError(
            409,
            "paid_invoice_immutable",
            "Paid invoice cannot be voided",
            "Record a separate financial correction instead of changing paid history.",
        )
    invoice.status = InvoiceStatus.void
    await db.commit()
    await db.refresh(invoice)
    return await invoice_response(db, invoice)


@router.post("/finance/invoices/{invoice_id}/payment-intent", status_code=status.HTTP_202_ACCEPTED)
async def create_invoice_payment_intent(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: InvoicePaymentIntentCreate,
    idempotency_key: IdempotencyKey,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    if invoice.status != InvoiceStatus.sent:
        raise APIError(
            409,
            "invoice_state_invalid",
            "Invalid invoice state",
            "Only sent invoices can create a payment intent.",
        )
    provider: PaymentProvider = request.app.state.payment_provider
    result = await provider.create_checkout_intent(
        idempotency_key=idempotency_key,
        user_reference=f"business-invoice:{invoice.id}",
        amount_minor=invoice.total_minor,
        settlement_currency=invoice.currency,
        return_url=payload.return_url,
        line_references=[],
    )
    validate_checkout_result(result)
    if result.settlement_amount_minor != invoice.total_minor:
        raise APIError(
            502,
            "payment_provider_invalid_response",
            "Invalid payment provider response",
            "The provider returned an invalid invoice payment operation.",
        )
    reference = FinanceTransactionReference(
        workspace_id=workspace_id,
        invoice_id=invoice.id,
        reference_type="provider_payment",
        provider=provider.name,
        external_reference=result.provider_operation_id,
        evidence="Signature-verified provider webhook required for settlement.",
        amount_minor=invoice.total_minor,
        currency=invoice.currency,
        recorded_by_id=auth.user.id,
    )
    db.add(reference)
    await db.commit()
    return {
        "status": "pending_webhook",
        "provider": provider.name,
        "provider_operation_id": result.provider_operation_id,
        "client_data": validate_safe_metadata(result.client_data),
    }


@router.post("/finance/invoices/{invoice_id}/reconcile")
@router.post("/finance/invoices/{invoice_id}/manual-reconciliation")
async def reconcile_invoice(
    invoice_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ReconciliationCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.approve")
    invoice = await scoped_record(db, Invoice, invoice_id, workspace_id, code="invoice_not_found")
    if invoice.status != InvoiceStatus.sent:
        raise APIError(
            409,
            "invoice_state_invalid",
            "Invalid invoice state",
            "Only sent invoices can be manually reconciled.",
        )
    if payload.amount_minor != invoice.total_minor or payload.currency != invoice.currency:
        raise APIError(
            422,
            "reconciliation_amount_mismatch",
            "Reconciliation amount mismatch",
            "The bank evidence amount and currency must exactly match the invoice.",
        )
    reference = FinanceTransactionReference(
        workspace_id=workspace_id,
        invoice_id=invoice.id,
        reference_type="manual_bank_reconciliation",
        provider=None,
        external_reference=payload.bank_reference,
        evidence=payload.evidence,
        amount_minor=payload.amount_minor,
        currency=payload.currency,
        recorded_by_id=auth.user.id,
        created_at=payload.reconciled_at,
    )
    db.add(reference)
    await db.flush()
    invoice.status = InvoiceStatus.paid
    invoice.paid_at = payload.reconciled_at
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="invoice.manually_reconciled",
        aggregate_type="invoice",
        aggregate_id=invoice.id,
        metadata={
            "reference_id": str(reference.id),
            "bank_reference": payload.bank_reference,
            "amount_minor": payload.amount_minor,
            "currency": payload.currency,
        },
    )
    await db.commit()
    await db.refresh(invoice)
    return await invoice_response(db, invoice)


@router.post("/finance/accounting/export", status_code=status.HTTP_202_ACCEPTED)
async def export_to_accounting(
    workspace_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.write")
    provider: AccountingProvider = request.app.state.accounting_provider
    operation_id = await provider.queue_export(workspace_id=workspace_id, resource="finance")
    return {"status": "queued", "provider_operation_id": operation_id}


@router.get("/reports/finance")
@router.get("/finance/reports/summary")
async def finance_report(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "finance.read")
    expense_rows = (
        await db.execute(
            select(Expense.status, Expense.currency, func.sum(Expense.amount_minor))
            .where(Expense.workspace_id == workspace_id)
            .group_by(Expense.status, Expense.currency)
        )
    ).all()
    invoice_rows = (
        await db.execute(
            select(Invoice.status, Invoice.currency, func.sum(Invoice.total_minor))
            .where(Invoice.workspace_id == workspace_id)
            .group_by(Invoice.status, Invoice.currency)
        )
    ).all()
    budget_rows = (
        await db.execute(
            select(BusinessBudget.currency, func.sum(BusinessBudget.amount_minor))
            .where(BusinessBudget.workspace_id == workspace_id)
            .group_by(BusinessBudget.currency)
        )
    ).all()
    return {
        "expenses": [
            {"status": row[0], "currency": row[1], "amount_minor": int(row[2] or 0)}
            for row in expense_rows
        ],
        "invoices": [
            {"status": row[0], "currency": row[1], "amount_minor": int(row[2] or 0)}
            for row in invoice_rows
        ],
        "budgets": [
            {"currency": row[0], "amount_minor": int(row[1] or 0)} for row in budget_rows
        ],
        "basis": "persisted_business_records",
    }
