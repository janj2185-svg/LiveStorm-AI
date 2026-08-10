from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.deps import current_user_id
from app.models import (
    AIActivity,
    AgentAction,
    DeveloperApplication,
    InstalledAgent,
    KnowledgeEdge,
    KnowledgeNode,
    MarketplaceAgent,
)
from app.schemas import (
    ActionCreate,
    ActionResponse,
    ActivityResponse,
    AgentPatch,
    AgentResponse,
    ChatRequest,
    ChatResponse,
    DashboardResponse,
    DeveloperAppCreate,
    DeveloperAppResponse,
    EdgeCreate,
    EdgeResponse,
    IdentityPatch,
    IdentityResponse,
    InstallAgentRequest,
    InstalledAgentResponse,
    MarketplaceAgentResponse,
    MemoryCreate,
    MemoryResponse,
    NodeCreate,
    NodeResponse,
)
from app import service as svc

router = APIRouter()


@router.get("/personal-ai", response_model=DashboardResponse)
def personal_ai_dashboard(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> DashboardResponse:
    payload = svc.dashboard(db, user_id)
    return DashboardResponse(
        agent=AgentResponse.model_validate(payload["agent"]),
        what_ai_knows=payload["what_ai_knows"],
        access_scopes=payload["access_scopes"],
        recent_activity=[ActivityResponse.model_validate(a) for a in payload["recent_activity"]],
        memory_counts=payload["memory_counts"],
        emotion=payload["emotion"],
    )


@router.patch("/personal-ai", response_model=AgentResponse)
def personal_ai_patch(
    payload: AgentPatch,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> AgentResponse:
    return AgentResponse.model_validate(svc.patch_agent(db, user_id, payload))


@router.get("/personal-ai/activity", response_model=list[ActivityResponse])
def personal_ai_activity(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[ActivityResponse]:
    svc.ensure_agent(db, user_id)
    rows = db.scalars(
        select(AIActivity)
        .where(AIActivity.user_id == user_id)
        .order_by(AIActivity.created_at.desc())
        .limit(50)
    )
    return [ActivityResponse.model_validate(row) for row in rows]


@router.get("/personal-ai/memory", response_model=list[MemoryResponse])
def personal_ai_memory(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[MemoryResponse]:
    return [MemoryResponse.model_validate(item) for item in svc.list_memory(db, user_id)]


@router.post("/personal-ai/memory", response_model=MemoryResponse, status_code=201)
def personal_ai_memory_create(
    payload: MemoryCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> MemoryResponse:
    return MemoryResponse.model_validate(svc.add_memory(db, user_id, payload))


@router.get("/personal-ai/memory/export")
def personal_ai_memory_export(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> dict:
    return {"items": svc.export_memory(db, user_id)}


@router.delete("/personal-ai/memory/{memory_id}", status_code=204)
def personal_ai_memory_delete(
    memory_id: str,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> Response:
    svc.delete_memory(db, user_id, memory_id)
    return Response(status_code=204)


@router.post("/personal-ai/chat", response_model=ChatResponse)
def personal_ai_chat(
    payload: ChatRequest,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    return ChatResponse(**svc.chat(db, settings, user_id, payload))


@router.get("/identity", response_model=IdentityResponse)
def identity_get(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> IdentityResponse:
    return IdentityResponse.model_validate(svc.ensure_identity(db, user_id))


@router.patch("/identity", response_model=IdentityResponse)
def identity_patch(
    payload: IdentityPatch,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> IdentityResponse:
    return IdentityResponse.model_validate(svc.patch_identity(db, user_id, payload))


@router.get("/knowledge/nodes", response_model=list[NodeResponse])
def knowledge_nodes(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[NodeResponse]:
    rows = db.scalars(
        select(KnowledgeNode).where(
            KnowledgeNode.owner_user_id == user_id, KnowledgeNode.deleted_at.is_(None)
        )
    )
    return [NodeResponse.model_validate(row) for row in rows]


@router.post("/knowledge/nodes", response_model=NodeResponse, status_code=201)
def knowledge_nodes_create(
    payload: NodeCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> NodeResponse:
    return NodeResponse.model_validate(svc.create_node(db, user_id, payload))


@router.get("/knowledge/edges", response_model=list[EdgeResponse])
def knowledge_edges(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[EdgeResponse]:
    rows = db.scalars(
        select(KnowledgeEdge).where(
            KnowledgeEdge.owner_user_id == user_id, KnowledgeEdge.deleted_at.is_(None)
        )
    )
    return [EdgeResponse.model_validate(row) for row in rows]


@router.post("/knowledge/edges", response_model=EdgeResponse, status_code=201)
def knowledge_edges_create(
    payload: EdgeCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> EdgeResponse:
    return EdgeResponse.model_validate(svc.create_edge(db, user_id, payload))


@router.post("/actions", response_model=ActionResponse, status_code=201)
def actions_create(
    payload: ActionCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> ActionResponse:
    return ActionResponse.model_validate(svc.create_action(db, user_id, payload))


@router.get("/actions", response_model=list[ActionResponse])
def actions_list(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[ActionResponse]:
    rows = db.scalars(
        select(AgentAction)
        .where(AgentAction.user_id == user_id)
        .order_by(AgentAction.created_at.desc())
        .limit(100)
    )
    return [ActionResponse.model_validate(row) for row in rows]


@router.post("/actions/{action_id}/confirm", response_model=ActionResponse)
def actions_confirm(
    action_id: str,
    approve: bool = True,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> ActionResponse:
    return ActionResponse.model_validate(svc.confirm_action(db, user_id, action_id, approve))


@router.get("/marketplace/agents", response_model=list[MarketplaceAgentResponse])
def marketplace_list(db: Session = Depends(get_db)) -> list[MarketplaceAgentResponse]:
    svc.seed_marketplace(db)
    rows = db.scalars(select(MarketplaceAgent).order_by(MarketplaceAgent.name))
    return [MarketplaceAgentResponse.model_validate(row) for row in rows]


@router.post("/marketplace/agents/{agent_id}/install", status_code=201)
def marketplace_install(
    agent_id: str,
    payload: InstallAgentRequest,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> dict:
    row = svc.install_agent(db, user_id, agent_id, payload.granted_permissions)
    return {"id": row.id, "agent_id": row.agent_id, "granted_permissions": row.granted_permissions}


@router.get("/marketplace/installed", response_model=list[InstalledAgentResponse])
def marketplace_installed(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[InstalledAgentResponse]:
    rows = db.scalars(
        select(InstalledAgent)
        .where(InstalledAgent.user_id == user_id)
        .order_by(InstalledAgent.created_at.desc())
    )
    return [InstalledAgentResponse.model_validate(row) for row in rows]


@router.get("/developer/apps", response_model=list[DeveloperAppResponse])
def developer_apps_list(
    user_id: str = Depends(current_user_id), db: Session = Depends(get_db)
) -> list[DeveloperAppResponse]:
    rows = db.scalars(
        select(DeveloperApplication)
        .where(DeveloperApplication.owner_user_id == user_id)
        .order_by(DeveloperApplication.created_at.desc())
    )
    return [
        DeveloperAppResponse(
            id=app.id,
            name=app.name,
            description=app.description,
            scopes=app.scopes,
            api_key_prefix=app.api_key_prefix,
            api_key=None,
            webhook_url=app.webhook_url,
            sandbox=app.sandbox,
            created_at=app.created_at,
        )
        for app in rows
    ]


@router.post("/developer/apps", response_model=DeveloperAppResponse, status_code=201)
def developer_apps_create(
    payload: DeveloperAppCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> DeveloperAppResponse:
    app, raw_key = svc.create_developer_app(db, user_id, payload)
    return DeveloperAppResponse(
        id=app.id,
        name=app.name,
        description=app.description,
        scopes=app.scopes,
        api_key_prefix=app.api_key_prefix,
        api_key=raw_key,
        webhook_url=app.webhook_url,
        sandbox=app.sandbox,
        created_at=app.created_at,
    )
