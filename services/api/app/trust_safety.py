from __future__ import annotations

import uuid
from typing import Any, Literal

from fastapi import Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_service import invoke_moderation
from app.audit import add_audit_event
from app.config import Settings
from app.dependencies import AuthContext
from app.errors import APIError
from app.models import User, UserStatus
from app.security import utcnow
from app.social_models import (
    Comment,
    ContentReport,
    Message,
    ModerationAction,
    Post,
    PostLifecycle,
    ReportStatus,
)
from app.social_schemas import ReportPageResponse, ReportResponse, validate_plain_text
from app.social_service import apply_cursor, create_notification, decode_cursor, encode_cursor

"""
Trust & Safety MVP service layer.

Abuse-control hooks:
- User-created reports are rate-limited in the social report route and should stay there while the
  user-facing report surface lives under /social.
- Appeals are rate-limit candidates per user and per report once persistence is added; use the
  shared Redis rate_limit helper with buckets such as "trust-safety:appeals:user" and
  "trust-safety:appeals:report".
- Moderator actions should be audited and permission-gated, not globally rate-limited, so urgent
  safety decisions are not blocked during an incident.
"""


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TrustSafetyDecisionRequest(StrictSchema):
    status: Literal[ReportStatus.resolved, ReportStatus.dismissed]
    action: Literal["none", "warn", "hide_content", "suspend_user", "remove_content"]
    notes: str | None = Field(default=None, max_length=5000)

    _plain_notes = field_validator("notes")(
        lambda value: validate_plain_text(value) if value else value
    )


class TrustSafetyEscalationRequest(StrictSchema):
    notes: str = Field(min_length=3, max_length=5000)

    _plain_notes = field_validator("notes")(validate_plain_text)


class TrustSafetyAppealRequest(StrictSchema):
    report_id: uuid.UUID
    statement: str = Field(min_length=10, max_length=5000)

    _plain_statement = field_validator("statement")(validate_plain_text)


class TrustSafetyAppealResponse(StrictSchema):
    status: Literal["received"] = "received"
    report_id: uuid.UUID
    persisted: bool = False
    next_step: str


class AIModerationAssistRequest(StrictSchema):
    text: str = Field(min_length=1, max_length=20_000)

    _plain_text = field_validator("text")(validate_plain_text)


class AIModerationAssistResponse(StrictSchema):
    available: bool
    recommendation: Literal["allow", "review", "block"] | None = None
    confidence: float | None = None
    categories: dict[str, float] = Field(default_factory=dict)
    provider: str | None = None
    model: str | None = None
    unavailable_code: str | None = None
    non_binding: bool = True


async def list_open_reports(
    db: AsyncSession,
    settings: Settings,
    *,
    cursor: str | None,
    limit: int,
) -> ReportPageResponse:
    cursor_value = decode_cursor(settings, "trust_safety_reports", cursor)
    statement = select(ContentReport).where(
        ContentReport.status.in_([ReportStatus.open, ReportStatus.reviewing])
    )
    statement = apply_cursor(statement, ContentReport.created_at, ContentReport.id, cursor_value)
    reports = list(
        (
            await db.scalars(
                statement.order_by(ContentReport.created_at.desc(), ContentReport.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = reports[:limit]
    next_cursor = (
        encode_cursor(settings, "trust_safety_reports", visible[-1].created_at, visible[-1].id)
        if len(reports) > limit and visible
        else None
    )
    return ReportPageResponse(
        items=[ReportResponse.model_validate(report) for report in visible],
        next_cursor=next_cursor,
    )


async def report_target_user_id(db: AsyncSession, report: ContentReport) -> uuid.UUID | None:
    if report.target_type == "user":
        return report.target_id
    if report.target_type == "post":
        return await db.scalar(select(Post.author_id).where(Post.id == report.target_id))
    if report.target_type == "comment":
        return await db.scalar(select(Comment.author_id).where(Comment.id == report.target_id))
    if report.target_type == "message":
        return await db.scalar(select(Message.sender_id).where(Message.id == report.target_id))
    return None


async def resolve_report(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    auth: AuthContext,
    report_id: uuid.UUID,
    payload: TrustSafetyDecisionRequest,
) -> ContentReport:
    report = await db.get(ContentReport, report_id)
    if report is None:
        raise APIError(404, "report_not_found", "Report not found", "The report does not exist.")
    if report.status in {ReportStatus.resolved, ReportStatus.dismissed}:
        raise APIError(
            409,
            "report_already_decided",
            "Report already decided",
            "A final moderation decision already exists.",
        )
    report.status = payload.status
    db.add(
        ModerationAction(
            report_id=report.id,
            moderator_id=auth.user.id,
            action=payload.action,
            notes=payload.notes,
        )
    )
    if payload.action in {"hide_content", "remove_content"}:
        if report.target_type == "post":
            post = await db.get(Post, report.target_id)
            if post is not None:
                post.lifecycle = (
                    PostLifecycle.deleted
                    if payload.action == "remove_content"
                    else PostLifecycle.archived
                )
                post.deleted_at = (
                    utcnow() if payload.action == "remove_content" else post.deleted_at
                )
                post.archived_at = utcnow()
        elif report.target_type == "comment":
            comment = await db.get(Comment, report.target_id)
            if comment is not None:
                comment.deleted_at = utcnow()
                comment.body = ""
    target_user_id = await report_target_user_id(db, report)
    if payload.action == "suspend_user" and target_user_id is not None:
        target_user = await db.get(User, target_user_id)
        if target_user is not None:
            target_user.status = UserStatus.suspended
            target_user.token_version += 1
    await create_notification(
        db,
        user_id=target_user_id or report.reporter_id,
        notification_type="trust_safety_decision",
        actor_user_id=auth.user.id,
        target_type="report",
        target_id=report.id,
        metadata={"status": payload.status.value, "action": payload.action},
    )
    add_audit_event(
        db,
        request,
        settings,
        "trust_safety.report_decision",
        actor_user_id=auth.user.id,
        target_user_id=target_user_id,
        metadata={
            "report_id": str(report.id),
            "status": payload.status.value,
            "action": payload.action,
        },
    )
    await db.commit()
    await db.refresh(report)
    return report


async def escalate_report(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    auth: AuthContext,
    report_id: uuid.UUID,
    payload: TrustSafetyEscalationRequest,
) -> ContentReport:
    report = await db.get(ContentReport, report_id)
    if report is None:
        raise APIError(404, "report_not_found", "Report not found", "The report does not exist.")
    if report.status in {ReportStatus.resolved, ReportStatus.dismissed}:
        raise APIError(
            409,
            "report_already_decided",
            "Report already decided",
            "A final moderation decision already exists.",
        )
    report.status = ReportStatus.reviewing
    db.add(
        ModerationAction(
            report_id=report.id,
            moderator_id=auth.user.id,
            action="escalate",
            notes=payload.notes,
        )
    )
    add_audit_event(
        db,
        request,
        settings,
        "trust_safety.report_escalated",
        actor_user_id=auth.user.id,
        target_user_id=await report_target_user_id(db, report),
        metadata={"report_id": str(report.id)},
    )
    await db.commit()
    await db.refresh(report)
    return report


async def submit_appeal_stub(
    db: AsyncSession,
    request: Request,
    settings: Settings,
    auth: AuthContext,
    payload: TrustSafetyAppealRequest,
) -> TrustSafetyAppealResponse:
    report = await db.get(ContentReport, payload.report_id)
    if report is None:
        raise APIError(404, "report_not_found", "Report not found", "The report does not exist.")
    target_user_id = await report_target_user_id(db, report)
    if auth.user.id not in {report.reporter_id, target_user_id}:
        raise APIError(
            403,
            "appeal_not_allowed",
            "Appeal not allowed",
            "Only the reporter or affected account can submit an appeal for this report.",
        )
    add_audit_event(
        db,
        request,
        settings,
        "trust_safety.appeal_received",
        actor_user_id=auth.user.id,
        target_user_id=target_user_id,
        metadata={
            "report_id": str(report.id),
            "statement_length": len(payload.statement),
            "persisted": False,
        },
    )
    await db.commit()
    return TrustSafetyAppealResponse(
        report_id=report.id,
        next_step="Appeal persistence and reviewer assignment are not enabled in this MVP.",
    )


async def ai_moderation_assist(
    db: AsyncSession,
    registry: Any,
    moderator_id: uuid.UUID,
    text: str,
) -> AIModerationAssistResponse:
    try:
        provider_name, result = await invoke_moderation(db, registry, moderator_id, text)
    except APIError as exc:
        if exc.code in {
            "ai_consent_required",
            "ai_capability_disabled",
            "ai_provider_unavailable",
            "quota_exceeded",
        }:
            return AIModerationAssistResponse(available=False, unavailable_code=exc.code)
        raise
    return AIModerationAssistResponse(
        available=True,
        recommendation=result.recommendation,  # type: ignore[arg-type]
        confidence=result.confidence,
        categories=dict(result.categories),
        provider=provider_name,
        model=result.model,
    )
