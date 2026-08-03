from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.social_schemas import ReportPageResponse, ReportResponse
from app.trust_safety import (
    AIModerationAssistRequest,
    AIModerationAssistResponse,
    TrustSafetyAppealRequest,
    TrustSafetyAppealResponse,
    TrustSafetyDecisionRequest,
    TrustSafetyEscalationRequest,
    ai_moderation_assist,
    escalate_report,
    list_open_reports,
    resolve_report,
    submit_appeal_stub,
)

router = APIRouter(prefix="/trust-safety", tags=["Trust & Safety"])


@router.get("/reports", response_model=ReportPageResponse)
async def list_trust_safety_reports(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    _: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ReportPageResponse:
    return await list_open_reports(db, settings, cursor=cursor, limit=limit)


@router.post("/reports/{report_id}/resolve", response_model=ReportResponse)
async def resolve_trust_safety_report(
    report_id: uuid.UUID,
    payload: TrustSafetyDecisionRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> object:
    return await resolve_report(db, request, settings, auth, report_id, payload)


@router.post("/reports/{report_id}/escalate", response_model=ReportResponse)
async def escalate_trust_safety_report(
    report_id: uuid.UUID,
    payload: TrustSafetyEscalationRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> object:
    return await escalate_report(db, request, settings, auth, report_id, payload)


@router.post(
    "/appeals",
    response_model=TrustSafetyAppealResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_trust_safety_appeal(
    payload: TrustSafetyAppealRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TrustSafetyAppealResponse:
    return await submit_appeal_stub(db, request, settings, auth, payload)


@router.post("/ai/moderate", response_model=AIModerationAssistResponse)
async def trust_safety_ai_moderate(
    payload: AIModerationAssistRequest,
    request: Request,
    auth: AuthContext = Depends(require_permission("users:moderate")),
    db: AsyncSession = Depends(get_session),
) -> AIModerationAssistResponse:
    return await ai_moderation_assist(
        db,
        request.app.state.ai_provider_registry,
        auth.user.id,
        payload.text,
    )
