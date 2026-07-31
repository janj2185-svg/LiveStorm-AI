from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_audit_event
from app.business_models import (
    BusinessDataJob,
    CRMCompany,
    CRMContact,
    CRMDeal,
    DealActivity,
    PipelineStage,
    Team,
    TeamMembership,
    Workspace,
    WorkspaceInvitation,
    WorkspaceMembership,
    WorkspaceMembershipStatus,
    WorkspaceRole,
    WorkspaceStatus,
)
from app.business_schemas import (
    CompanyCreate,
    CompanyPatch,
    ContactCreate,
    ContactPatch,
    DataJobCreate,
    DealCreate,
    DealPatch,
    DealStageTransition,
    InvitationAccept,
    InvitationCreate,
    MembershipPatch,
    MembershipResponse,
    PipelineStageCreate,
    PipelineStagePatch,
    TeamCreate,
    TeamMemberAdd,
    WorkspaceCreate,
    WorkspacePatch,
    WorkspaceResponse,
)
from app.business_service import (
    accept_invitation,
    add_business_audit,
    create_invitation,
    create_workspace_defaults,
    ensure_not_last_owner,
    page_result,
    require_member_user,
    require_workspace,
    require_workspace_permission,
    scoped_record,
)
from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    has_permission,
    require_permission,
)
from app.errors import APIError
from app.rate_limit import rate_limit
from app.security import normalize_email, utcnow
from app.social_service import apply_cursor, decode_cursor

router = APIRouter(prefix="/business", tags=["Business"])


def record(record: Any, *fields: str) -> dict[str, Any]:
    return {field: getattr(record, field) for field in fields}


async def mutation_limit(request: Request, user_id: uuid.UUID, bucket: str) -> None:
    settings: Settings = request.app.state.settings
    await rate_limit(
        request,
        bucket=f"business:{bucket}",
        subject=str(user_id),
        limit=settings.business_mutation_rate_limit,
        window_seconds=settings.platform_rate_window_seconds,
    )


async def commit_or_conflict(
    db: AsyncSession, *, code: str, title: str, detail: str
) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise APIError(409, code, title, detail) from exc


@router.get("/workspaces", response_model=list[WorkspaceResponse])
async def list_workspaces(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[Workspace]:
    if await has_permission(db, auth.user.id, "workspaces:manage:any"):
        statement = select(Workspace).where(Workspace.status != WorkspaceStatus.deleted)
    else:
        statement = (
            select(Workspace)
            .join(WorkspaceMembership, WorkspaceMembership.workspace_id == Workspace.id)
            .where(
                WorkspaceMembership.user_id == auth.user.id,
                WorkspaceMembership.status == WorkspaceMembershipStatus.active,
                Workspace.status != WorkspaceStatus.deleted,
            )
        )
    return list((await db.scalars(statement.order_by(Workspace.created_at, Workspace.id))).all())


@router.post(
    "/workspaces",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace(
    payload: WorkspaceCreate,
    request: Request,
    auth: AuthContext = Depends(require_permission("workspaces:create")),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Workspace:
    await mutation_limit(request, auth.user.id, "workspace-create")
    if await db.scalar(select(Workspace.id).where(Workspace.slug == payload.slug)):
        raise APIError(
            409,
            "workspace_slug_exists",
            "Workspace slug already exists",
            "Choose another workspace slug.",
        )
    workspace = Workspace(
        **payload.model_dump(),
        owner_user_id=auth.user.id,
    )
    db.add(workspace)
    await db.flush()
    db.add(
        WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=auth.user.id,
            role=WorkspaceRole.owner,
            status=WorkspaceMembershipStatus.active,
            permission_overrides={},
            joined_at=utcnow(),
        )
    )
    await create_workspace_defaults(db, workspace, auth.user.id)
    add_audit_event(
        db,
        request,
        settings,
        "business.workspace_created",
        actor_user_id=auth.user.id,
        metadata={"workspace_id": str(workspace.id), "slug": workspace.slug},
    )
    add_business_audit(
        db,
        request,
        workspace_id=workspace.id,
        actor_user_id=auth.user.id,
        action="workspace.created",
        aggregate_type="workspace",
        aggregate_id=workspace.id,
    )
    await commit_or_conflict(
        db,
        code="workspace_slug_exists",
        title="Workspace slug already exists",
        detail="Choose another workspace slug.",
    )
    await db.refresh(workspace)
    return workspace


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Workspace:
    workspace, _ = await require_workspace(db, auth.user.id, workspace_id)
    return workspace


@router.post("/workspaces/{workspace_id}/switch")
async def switch_workspace(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    workspace, membership = await require_workspace(db, auth.user.id, workspace_id)
    return {
        "workspace": WorkspaceResponse.model_validate(workspace),
        "role": membership.role if membership else WorkspaceRole.owner,
        "permissions": membership.permission_overrides if membership else {"*": True},
    }


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def patch_workspace(
    workspace_id: uuid.UUID,
    payload: WorkspacePatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> Workspace:
    workspace, _ = await require_workspace_permission(
        db, auth.user.id, workspace_id, "workspace.manage"
    )
    await mutation_limit(request, auth.user.id, "workspace-update")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(workspace, field, value)
    add_business_audit(
        db,
        request,
        workspace_id=workspace.id,
        actor_user_id=auth.user.id,
        action="workspace.updated",
        aggregate_type="workspace",
        aggregate_id=workspace.id,
        metadata={"fields": sorted(payload.model_fields_set)},
    )
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    workspace, membership = await require_workspace_permission(
        db, auth.user.id, workspace_id, "workspace.manage"
    )
    if membership is not None and membership.role != WorkspaceRole.owner:
        raise APIError(
            403,
            "workspace_owner_required",
            "Workspace owner required",
            "Only a workspace owner may delete the workspace.",
        )
    await mutation_limit(request, auth.user.id, "workspace-delete")
    workspace.status = WorkspaceStatus.deleted
    workspace.deleted_at = utcnow()
    add_business_audit(
        db,
        request,
        workspace_id=workspace.id,
        actor_user_id=auth.user.id,
        action="workspace.deleted",
        aggregate_type="workspace",
        aggregate_id=workspace.id,
    )
    await db.commit()
    return {"status": "deleted"}


@router.get("/workspaces/{workspace_id}/members", response_model=list[MembershipResponse])
async def list_members(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[WorkspaceMembership]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.read")
    return list(
        (
            await db.scalars(
                select(WorkspaceMembership)
                .where(WorkspaceMembership.workspace_id == workspace_id)
                .order_by(WorkspaceMembership.created_at, WorkspaceMembership.id)
            )
        ).all()
    )


@router.patch(
    "/workspaces/{workspace_id}/members/{user_id}",
    response_model=MembershipResponse,
)
async def patch_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MembershipPatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceMembership:
    workspace, _ = await require_workspace_permission(
        db, auth.user.id, workspace_id, "workspace.manage"
    )
    membership = await db.scalar(
        select(WorkspaceMembership)
        .where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .with_for_update()
    )
    if membership is None:
        raise APIError(
            404, "workspace_member_not_found", "Member not found", "The membership does not exist."
        )
    values = payload.model_dump(exclude_unset=True)
    old_role = membership.role
    resulting_role = values.get("role", membership.role)
    resulting_status = values.get("status", membership.status)
    if (
        membership.role == WorkspaceRole.owner
        and membership.status == WorkspaceMembershipStatus.active
        and (
            resulting_role != WorkspaceRole.owner
            or resulting_status != WorkspaceMembershipStatus.active
        )
    ):
        await ensure_not_last_owner(db, membership)
    for field, value in values.items():
        if value is not None:
            setattr(membership, field, value)
    if old_role == WorkspaceRole.owner and membership.role != WorkspaceRole.owner:
        replacement = await db.scalar(
            select(WorkspaceMembership)
            .where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id != user_id,
                WorkspaceMembership.role == WorkspaceRole.owner,
                WorkspaceMembership.status == WorkspaceMembershipStatus.active,
            )
            .order_by(WorkspaceMembership.created_at, WorkspaceMembership.id)
            .limit(1)
        )
        if replacement is not None and workspace.owner_user_id == user_id:
            workspace.owner_user_id = replacement.user_id
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="membership.updated",
        aggregate_type="membership",
        aggregate_id=membership.id,
        metadata={"user_id": str(user_id), "fields": sorted(values)},
    )
    await db.commit()
    await db.refresh(membership)
    return membership


@router.delete("/workspaces/{workspace_id}/members/{user_id}")
async def remove_member(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    workspace, actor_membership = await require_workspace(
        db, auth.user.id, workspace_id
    )
    if (
        user_id != auth.user.id
        and actor_membership is not None
        and actor_membership.role not in {WorkspaceRole.owner, WorkspaceRole.admin}
    ):
        raise APIError(
            403,
            "workspace_permission_denied",
            "Workspace permission denied",
            "Only workspace owners or admins may remove another member.",
        )
    membership = await db.scalar(
        select(WorkspaceMembership)
        .where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.user_id == user_id,
        )
        .with_for_update()
    )
    if membership is None:
        raise APIError(
            404, "workspace_member_not_found", "Member not found", "The membership does not exist."
        )
    await ensure_not_last_owner(db, membership)
    if workspace.owner_user_id == user_id:
        replacement = await db.scalar(
            select(WorkspaceMembership)
            .where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id != user_id,
                WorkspaceMembership.role == WorkspaceRole.owner,
                WorkspaceMembership.status == WorkspaceMembershipStatus.active,
            )
            .order_by(WorkspaceMembership.created_at, WorkspaceMembership.id)
            .limit(1)
        )
        if replacement:
            workspace.owner_user_id = replacement.user_id
    await db.delete(membership)
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="membership.removed",
        aggregate_type="membership",
        aggregate_id=membership.id,
        metadata={"user_id": str(user_id)},
    )
    await db.commit()
    return {"status": "removed"}


@router.get("/workspaces/{workspace_id}/invitations")
async def list_invitations(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.manage")
    invitations = (
        await db.scalars(
            select(WorkspaceInvitation)
            .where(WorkspaceInvitation.workspace_id == workspace_id)
            .order_by(WorkspaceInvitation.created_at.desc(), WorkspaceInvitation.id.desc())
        )
    ).all()
    return [
        record(
            item,
            "id",
            "workspace_id",
            "email",
            "role",
            "permission_overrides",
            "expires_at",
            "accepted_at",
            "revoked_at",
            "created_at",
        )
        for item in invitations
    ]


@router.post(
    "/workspaces/{workspace_id}/invitations",
    status_code=status.HTTP_202_ACCEPTED,
)
async def invite_member(
    workspace_id: uuid.UUID,
    payload: InvitationCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    workspace, _ = await require_workspace_permission(
        db, auth.user.id, workspace_id, "workspace.manage"
    )
    await mutation_limit(request, auth.user.id, "workspace-invite")
    invitation = await create_invitation(
        db,
        settings,
        workspace=workspace,
        invited_by_id=auth.user.id,
        email=payload.email,
        role=WorkspaceRole(payload.role),
        permission_overrides=payload.permission_overrides,
        expires_in_hours=payload.expires_in_hours,
    )
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="invitation.created",
        aggregate_type="invitation",
        aggregate_id=invitation.id,
        metadata={"email": invitation.email, "role": invitation.role.value},
    )
    await db.commit()
    return {"status": "queued", "invitation_id": invitation.id, "expires_at": invitation.expires_at}


@router.post("/invitations/accept", response_model=MembershipResponse)
@router.post("/workspaces/invitations/accept", response_model=MembershipResponse)
async def accept_workspace_invitation(
    payload: InvitationAccept,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceMembership:
    await mutation_limit(request, auth.user.id, "workspace-invite-accept")
    invitation, membership = await accept_invitation(
        db, user=auth.user, raw_token=payload.token
    )
    add_business_audit(
        db,
        request,
        workspace_id=invitation.workspace_id,
        actor_user_id=auth.user.id,
        action="invitation.accepted",
        aggregate_type="invitation",
        aggregate_id=invitation.id,
    )
    await db.commit()
    await db.refresh(membership)
    return membership


@router.delete("/workspaces/{workspace_id}/invitations/{invitation_id}")
async def revoke_invitation(
    workspace_id: uuid.UUID,
    invitation_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.manage")
    invitation = await scoped_record(
        db, WorkspaceInvitation, invitation_id, workspace_id, code="invitation_not_found"
    )
    if invitation.accepted_at is not None:
        raise APIError(
            409,
            "invitation_already_accepted",
            "Invitation already accepted",
            "An accepted invitation cannot be revoked.",
        )
    invitation.revoked_at = utcnow()
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="invitation.revoked",
        aggregate_type="invitation",
        aggregate_id=invitation.id,
    )
    await db.commit()
    return {"status": "revoked"}


@router.get("/workspaces/{workspace_id}/teams")
async def list_teams(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.read")
    teams = list(
        (
            await db.scalars(
                select(Team)
                .where(Team.workspace_id == workspace_id)
                .order_by(Team.name, Team.id)
            )
        ).all()
    )
    result: list[dict[str, Any]] = []
    for team in teams:
        member_ids = list(
            (
                await db.scalars(
                    select(TeamMembership.user_id)
                    .where(TeamMembership.team_id == team.id)
                    .order_by(TeamMembership.created_at, TeamMembership.id)
                )
            ).all()
        )
        result.append(
            {
                **record(team, "id", "workspace_id", "name", "description", "created_at"),
                "member_ids": member_ids,
            }
        )
    return result


@router.post("/workspaces/{workspace_id}/teams", status_code=status.HTTP_201_CREATED)
async def create_team(
    workspace_id: uuid.UUID,
    payload: TeamCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.teams")
    team = Team(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **payload.model_dump(),
    )
    db.add(team)
    await commit_or_conflict(
        db,
        code="team_name_exists",
        title="Team name already exists",
        detail="Choose another team name.",
    )
    await db.refresh(team)
    return record(team, "id", "workspace_id", "name", "description", "created_at")


@router.put("/workspaces/{workspace_id}/teams/{team_id}/members")
async def add_team_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    payload: TeamMemberAdd,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.teams")
    await scoped_record(db, Team, team_id, workspace_id, code="team_not_found")
    await require_member_user(db, workspace_id, payload.user_id)
    existing = await db.scalar(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id, TeamMembership.user_id == payload.user_id
        )
    )
    if existing is None:
        db.add(
            TeamMembership(
                workspace_id=workspace_id, team_id=team_id, user_id=payload.user_id
            )
        )
        await db.commit()
    return {"status": "assigned"}


@router.delete("/workspaces/{workspace_id}/teams/{team_id}/members/{user_id}")
async def remove_team_member(
    workspace_id: uuid.UUID,
    team_id: uuid.UUID,
    user_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "workspace.teams")
    membership = await db.scalar(
        select(TeamMembership).where(
            TeamMembership.workspace_id == workspace_id,
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id,
        )
    )
    if membership:
        await db.delete(membership)
        await db.commit()
    return {"status": "removed"}


async def crm_reference_checks(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    company_id: uuid.UUID | None = None,
    contact_id: uuid.UUID | None = None,
    user_ids: list[uuid.UUID | None] | None = None,
) -> None:
    if company_id:
        await scoped_record(
            db,
            CRMCompany,
            company_id,
            workspace_id,
            deleted_field=CRMCompany.deleted_at,
            code="crm_company_not_found",
        )
    if contact_id:
        await scoped_record(
            db,
            CRMContact,
            contact_id,
            workspace_id,
            deleted_field=CRMContact.deleted_at,
            code="crm_contact_not_found",
        )
    for user_id in user_ids or []:
        await require_member_user(db, workspace_id, user_id)


@router.get("/crm/companies")
async def list_companies(
    workspace_id: uuid.UUID,
    q: Annotated[str | None, Query(max_length=200)] = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    statement = select(CRMCompany).where(
        CRMCompany.workspace_id == workspace_id, CRMCompany.deleted_at.is_(None)
    )
    if q:
        statement = statement.where(
            or_(CRMCompany.name.ilike(f"%{q}%"), CRMCompany.domain.ilike(f"%{q}%"))
        )
    scope = f"business-companies:{workspace_id}:{q or ''}"
    statement = apply_cursor(
        statement,
        CRMCompany.created_at,
        CRMCompany.id,
        decode_cursor(settings, scope, cursor),
    ).order_by(CRMCompany.created_at.desc(), CRMCompany.id.desc()).limit(limit + 1)
    rows = list((await db.scalars(statement)).all())
    visible, next_cursor = page_result(
        rows,
        settings,
        scope=scope,
        limit=limit,
        created_at=lambda item: item.created_at,
        record_id=lambda item: item.id,
    )
    fields = (
        "id",
        "workspace_id",
        "name",
        "domain",
        "phone",
        "tags",
        "custom_fields",
        "owner_user_id",
        "source",
        "created_at",
        "updated_at",
    )
    return {"items": [record(item, *fields) for item in visible], "next_cursor": next_cursor}


@router.post("/crm/companies", status_code=status.HTTP_201_CREATED)
async def create_company(
    workspace_id: uuid.UUID,
    payload: CompanyCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    await crm_reference_checks(
        db, workspace_id, user_ids=[payload.owner_user_id]
    )
    company = CRMCompany(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **payload.model_dump(),
    )
    db.add(company)
    await commit_or_conflict(
        db,
        code="crm_company_exists",
        title="CRM company already exists",
        detail="A company with this name already exists in the workspace.",
    )
    await db.refresh(company)
    return record(
        company,
        "id",
        "workspace_id",
        "name",
        "domain",
        "phone",
        "tags",
        "custom_fields",
        "owner_user_id",
        "source",
        "created_at",
        "updated_at",
    )


@router.get("/crm/companies/{company_id}")
async def get_company(
    company_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    company = await scoped_record(
        db,
        CRMCompany,
        company_id,
        workspace_id,
        deleted_field=CRMCompany.deleted_at,
        code="crm_company_not_found",
    )
    return record(
        company,
        "id",
        "workspace_id",
        "name",
        "domain",
        "phone",
        "tags",
        "custom_fields",
        "owner_user_id",
        "source",
        "created_at",
        "updated_at",
    )


@router.patch("/crm/companies/{company_id}")
async def patch_company(
    company_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: CompanyPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    company = await scoped_record(
        db,
        CRMCompany,
        company_id,
        workspace_id,
        deleted_field=CRMCompany.deleted_at,
        code="crm_company_not_found",
    )
    await crm_reference_checks(db, workspace_id, user_ids=[payload.owner_user_id])
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    await commit_or_conflict(
        db,
        code="crm_company_exists",
        title="CRM company already exists",
        detail="A company with this name already exists in the workspace.",
    )
    await db.refresh(company)
    return record(company, "id", "workspace_id", "name", "tags", "custom_fields", "updated_at")


@router.delete("/crm/companies/{company_id}")
async def delete_company(
    company_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    company = await scoped_record(
        db,
        CRMCompany,
        company_id,
        workspace_id,
        deleted_field=CRMCompany.deleted_at,
        code="crm_company_not_found",
    )
    company.deleted_at = utcnow()
    await db.commit()
    return {"status": "deleted"}


CONTACT_FIELDS = (
    "id",
    "workspace_id",
    "company_id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "job_title",
    "tags",
    "custom_fields",
    "owner_user_id",
    "assignee_user_id",
    "consent_status",
    "source",
    "created_at",
    "updated_at",
)


@router.get("/crm/contacts")
async def list_contacts(
    workspace_id: uuid.UUID,
    q: Annotated[str | None, Query(max_length=200)] = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    statement = select(CRMContact).where(
        CRMContact.workspace_id == workspace_id, CRMContact.deleted_at.is_(None)
    )
    if q:
        statement = statement.where(
            or_(
                CRMContact.first_name.ilike(f"%{q}%"),
                CRMContact.last_name.ilike(f"%{q}%"),
                CRMContact.email.ilike(f"%{q}%"),
            )
        )
    scope = f"business-contacts:{workspace_id}:{q or ''}"
    statement = apply_cursor(
        statement,
        CRMContact.created_at,
        CRMContact.id,
        decode_cursor(settings, scope, cursor),
    ).order_by(CRMContact.created_at.desc(), CRMContact.id.desc()).limit(limit + 1)
    rows = list((await db.scalars(statement)).all())
    visible, next_cursor = page_result(
        rows,
        settings,
        scope=scope,
        limit=limit,
        created_at=lambda item: item.created_at,
        record_id=lambda item: item.id,
    )
    return {
        "items": [record(item, *CONTACT_FIELDS) for item in visible],
        "next_cursor": next_cursor,
    }


@router.post("/crm/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(
    workspace_id: uuid.UUID,
    payload: ContactCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    values = payload.model_dump()
    if values["email"]:
        values["email"] = normalize_email(values["email"])
    await crm_reference_checks(
        db,
        workspace_id,
        company_id=payload.company_id,
        user_ids=[payload.owner_user_id, payload.assignee_user_id],
    )
    contact = CRMContact(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **values,
    )
    db.add(contact)
    await commit_or_conflict(
        db,
        code="crm_contact_exists",
        title="CRM contact already exists",
        detail="A contact with this email already exists in the workspace.",
    )
    await db.refresh(contact)
    return record(contact, *CONTACT_FIELDS)


@router.get("/crm/contacts/{contact_id}")
async def get_contact(
    contact_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    contact = await scoped_record(
        db,
        CRMContact,
        contact_id,
        workspace_id,
        deleted_field=CRMContact.deleted_at,
        code="crm_contact_not_found",
    )
    return record(contact, *CONTACT_FIELDS)


@router.patch("/crm/contacts/{contact_id}")
async def patch_contact(
    contact_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: ContactPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    contact = await scoped_record(
        db,
        CRMContact,
        contact_id,
        workspace_id,
        deleted_field=CRMContact.deleted_at,
        code="crm_contact_not_found",
    )
    await crm_reference_checks(
        db,
        workspace_id,
        company_id=payload.company_id if "company_id" in payload.model_fields_set else None,
        user_ids=[payload.owner_user_id, payload.assignee_user_id],
    )
    values = payload.model_dump(exclude_unset=True)
    if values.get("email"):
        values["email"] = normalize_email(values["email"])
    for field, value in values.items():
        setattr(contact, field, value)
    await commit_or_conflict(
        db,
        code="crm_contact_exists",
        title="CRM contact already exists",
        detail="A contact with this email already exists in the workspace.",
    )
    await db.refresh(contact)
    return record(contact, *CONTACT_FIELDS)


@router.delete("/crm/contacts/{contact_id}")
async def delete_contact(
    contact_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    contact = await scoped_record(
        db,
        CRMContact,
        contact_id,
        workspace_id,
        deleted_field=CRMContact.deleted_at,
        code="crm_contact_not_found",
    )
    contact.deleted_at = utcnow()
    await db.commit()
    return {"status": "deleted"}


@router.get("/crm/pipeline-stages")
async def list_pipeline_stages(
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    stages = (
        await db.scalars(
            select(PipelineStage)
            .where(PipelineStage.workspace_id == workspace_id)
            .order_by(PipelineStage.position, PipelineStage.id)
        )
    ).all()
    return [
        record(item, "id", "workspace_id", "key", "name", "position", "probability_bps", "active")
        for item in stages
    ]


@router.post("/crm/pipeline-stages", status_code=status.HTTP_201_CREATED)
async def create_pipeline_stage(
    workspace_id: uuid.UUID,
    payload: PipelineStageCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    stage = PipelineStage(workspace_id=workspace_id, **payload.model_dump())
    db.add(stage)
    await commit_or_conflict(
        db,
        code="pipeline_stage_conflict",
        title="Pipeline stage conflict",
        detail="The stage key or position is already in use.",
    )
    await db.refresh(stage)
    return record(
        stage,
        "id",
        "workspace_id",
        "key",
        "name",
        "position",
        "probability_bps",
        "active",
    )


@router.patch("/crm/pipeline-stages/{stage_id}")
async def patch_pipeline_stage(
    stage_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: PipelineStagePatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    stage = await scoped_record(
        db, PipelineStage, stage_id, workspace_id, code="pipeline_stage_not_found"
    )
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(stage, field, value)
    await commit_or_conflict(
        db,
        code="pipeline_stage_conflict",
        title="Pipeline stage conflict",
        detail="The stage position is already in use.",
    )
    await db.refresh(stage)
    return record(
        stage,
        "id",
        "workspace_id",
        "key",
        "name",
        "position",
        "probability_bps",
        "active",
    )


DEAL_FIELDS = (
    "id",
    "workspace_id",
    "name",
    "contact_id",
    "company_id",
    "stage_id",
    "assignee_user_id",
    "value_minor",
    "currency",
    "probability_bps",
    "expected_close_at",
    "status",
    "created_at",
    "updated_at",
)


@router.get("/crm/deals")
async def list_deals(
    workspace_id: uuid.UUID,
    q: Annotated[str | None, Query(max_length=200)] = None,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    statement = select(CRMDeal).where(
        CRMDeal.workspace_id == workspace_id, CRMDeal.deleted_at.is_(None)
    )
    if q:
        statement = statement.where(CRMDeal.name.ilike(f"%{q}%"))
    scope = f"business-deals:{workspace_id}:{q or ''}"
    statement = apply_cursor(
        statement,
        CRMDeal.created_at,
        CRMDeal.id,
        decode_cursor(settings, scope, cursor),
    ).order_by(CRMDeal.created_at.desc(), CRMDeal.id.desc()).limit(limit + 1)
    rows = list((await db.scalars(statement)).all())
    visible, next_cursor = page_result(
        rows,
        settings,
        scope=scope,
        limit=limit,
        created_at=lambda item: item.created_at,
        record_id=lambda item: item.id,
    )
    return {"items": [record(item, *DEAL_FIELDS) for item in visible], "next_cursor": next_cursor}


@router.post("/crm/deals", status_code=status.HTTP_201_CREATED)
async def create_deal(
    workspace_id: uuid.UUID,
    payload: DealCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    stage = await scoped_record(
        db, PipelineStage, payload.stage_id, workspace_id, code="pipeline_stage_not_found"
    )
    await crm_reference_checks(
        db,
        workspace_id,
        company_id=payload.company_id,
        contact_id=payload.contact_id,
        user_ids=[payload.assignee_user_id],
    )
    values = payload.model_dump()
    if values["probability_bps"] is None:
        values["probability_bps"] = stage.probability_bps
    deal = CRMDeal(
        workspace_id=workspace_id,
        created_by_id=auth.user.id,
        **values,
    )
    db.add(deal)
    await db.flush()
    db.add(
        DealActivity(
            workspace_id=workspace_id,
            deal_id=deal.id,
            actor_user_id=auth.user.id,
            activity_type="created",
            detail={"stage_id": str(stage.id)},
            created_at=utcnow(),
        )
    )
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="deal.created",
        aggregate_type="deal",
        aggregate_id=deal.id,
    )
    await db.commit()
    await db.refresh(deal)
    return record(deal, *DEAL_FIELDS)


@router.get("/crm/deals/{deal_id}")
async def get_deal(
    deal_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.read")
    deal = await scoped_record(
        db,
        CRMDeal,
        deal_id,
        workspace_id,
        deleted_field=CRMDeal.deleted_at,
        code="crm_deal_not_found",
    )
    activities = (
        await db.scalars(
            select(DealActivity)
            .where(
                DealActivity.workspace_id == workspace_id,
                DealActivity.deal_id == deal.id,
            )
            .order_by(DealActivity.created_at, DealActivity.id)
        )
    ).all()
    return {
        **record(deal, *DEAL_FIELDS),
        "activities": [
            record(
                item,
                "id",
                "activity_type",
                "detail",
                "actor_user_id",
                "created_at",
            )
            for item in activities
        ],
    }


@router.patch("/crm/deals/{deal_id}")
async def patch_deal(
    deal_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: DealPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    deal = await scoped_record(
        db,
        CRMDeal,
        deal_id,
        workspace_id,
        deleted_field=CRMDeal.deleted_at,
        code="crm_deal_not_found",
    )
    await crm_reference_checks(
        db,
        workspace_id,
        company_id=payload.company_id if "company_id" in payload.model_fields_set else None,
        contact_id=payload.contact_id if "contact_id" in payload.model_fields_set else None,
        user_ids=[payload.assignee_user_id],
    )
    values = payload.model_dump(exclude_unset=True)
    for field, value in values.items():
        setattr(deal, field, value)
    db.add(
        DealActivity(
            workspace_id=workspace_id,
            deal_id=deal.id,
            actor_user_id=auth.user.id,
            activity_type="updated",
            detail={"fields": sorted(values)},
            created_at=utcnow(),
        )
    )
    await db.commit()
    await db.refresh(deal)
    return record(deal, *DEAL_FIELDS)


@router.post("/crm/deals/{deal_id}/transition")
@router.post("/crm/deals/{deal_id}/stage")
async def transition_deal(
    deal_id: uuid.UUID,
    workspace_id: uuid.UUID,
    payload: DealStageTransition,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    deal = await scoped_record(
        db,
        CRMDeal,
        deal_id,
        workspace_id,
        deleted_field=CRMDeal.deleted_at,
        code="crm_deal_not_found",
    )
    stage = await scoped_record(
        db, PipelineStage, payload.stage_id, workspace_id, code="pipeline_stage_not_found"
    )
    old_stage = deal.stage_id
    deal.stage_id = stage.id
    deal.probability_bps = stage.probability_bps
    activity = DealActivity(
        workspace_id=workspace_id,
        deal_id=deal.id,
        actor_user_id=auth.user.id,
        activity_type="stage_transition",
        detail={
            "from_stage_id": str(old_stage),
            "to_stage_id": str(stage.id),
            "note": payload.note,
        },
        created_at=utcnow(),
    )
    db.add(activity)
    add_business_audit(
        db,
        request,
        workspace_id=workspace_id,
        actor_user_id=auth.user.id,
        action="deal.stage_transitioned",
        aggregate_type="deal",
        aggregate_id=deal.id,
        metadata={"from_stage_id": str(old_stage), "to_stage_id": str(stage.id)},
    )
    await db.commit()
    await db.refresh(deal)
    return record(deal, *DEAL_FIELDS)


@router.delete("/crm/deals/{deal_id}")
async def delete_deal(
    deal_id: uuid.UUID,
    workspace_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    deal = await scoped_record(
        db,
        CRMDeal,
        deal_id,
        workspace_id,
        deleted_field=CRMDeal.deleted_at,
        code="crm_deal_not_found",
    )
    deal.deleted_at = utcnow()
    await db.commit()
    return {"status": "deleted"}


@router.post("/crm/jobs", status_code=status.HTTP_202_ACCEPTED)
@router.post("/crm/import-export", status_code=status.HTTP_202_ACCEPTED)
async def request_crm_data_job(
    workspace_id: uuid.UUID,
    payload: DataJobCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await require_workspace_permission(db, auth.user.id, workspace_id, "crm.write")
    job = BusinessDataJob(
        workspace_id=workspace_id,
        requested_by_id=auth.user.id,
        state="queued",
        **payload.model_dump(),
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return record(
        job,
        "id",
        "workspace_id",
        "direction",
        "resource",
        "state",
        "input_object_key",
        "output_object_key",
        "failure_code",
        "created_at",
        "completed_at",
    )
