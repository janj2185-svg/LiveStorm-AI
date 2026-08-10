from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.ecosystem_models import IdentityPrivacyLevel
from app.ecosystem_schemas import (
    AgentActionCreate,
    AgentActionResponse,
    IdentityPrivacyPatch,
    IdentityPrivacyResponse,
    KnowledgeEdgeCreate,
    KnowledgeEdgeResponse,
    KnowledgeNodeCreate,
    KnowledgeNodeResponse,
    PersonalAIActivityResponse,
    PersonalAIAgentPatch,
    PersonalAIAgentResponse,
    PersonalAIDashboardResponse,
)
from app.ecosystem_service import (
    confirm_agent_action,
    create_agent_action,
    create_knowledge_edge,
    create_knowledge_node,
    ensure_personal_ai_agent,
    get_or_create_identity_privacy,
    list_knowledge_edges,
    list_knowledge_nodes,
    list_personal_ai_activity,
    patch_personal_ai_agent,
    personal_ai_dashboard,
    set_identity_privacy,
)

router = APIRouter(tags=["Ecosystem Foundation"])


@router.get("/personal-ai", response_model=PersonalAIDashboardResponse)
async def get_personal_ai_dashboard(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PersonalAIDashboardResponse:
    payload = await personal_ai_dashboard(db, auth.user.id)
    await db.commit()
    return PersonalAIDashboardResponse(
        agent=PersonalAIAgentResponse.model_validate(payload["agent"]),
        what_ai_knows=payload["what_ai_knows"],
        access_scopes=payload["access_scopes"],
        recent_activity=[
            PersonalAIActivityResponse.model_validate(item) for item in payload["recent_activity"]
        ],
        memory_enabled=payload["memory_enabled"],
        personalization_enabled=payload["personalization_enabled"],
        emotion=payload["emotion"],
    )


@router.patch("/personal-ai", response_model=PersonalAIAgentResponse)
async def patch_personal_ai(
    payload: PersonalAIAgentPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> PersonalAIAgentResponse:
    agent = await patch_personal_ai_agent(db, auth.user.id, payload)
    await db.commit()
    await db.refresh(agent)
    return PersonalAIAgentResponse.model_validate(agent)


@router.get("/personal-ai/activity", response_model=list[PersonalAIActivityResponse])
async def get_personal_ai_activity(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[PersonalAIActivityResponse]:
    await ensure_personal_ai_agent(db, auth.user.id)
    rows = await list_personal_ai_activity(db, auth.user.id)
    await db.commit()
    return [PersonalAIActivityResponse.model_validate(row) for row in rows]


@router.get("/identity/privacy", response_model=IdentityPrivacyResponse)
async def get_identity_privacy(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> IdentityPrivacyResponse:
    settings, level = await get_or_create_identity_privacy(db, auth.user.id)
    await db.commit()
    return IdentityPrivacyResponse(
        profile_visibility=settings.profile_visibility,
        identity_privacy_level=level,
        levels=[item.value for item in IdentityPrivacyLevel],
    )


@router.patch("/identity/privacy", response_model=IdentityPrivacyResponse)
async def patch_identity_privacy(
    payload: IdentityPrivacyPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> IdentityPrivacyResponse:
    settings = await set_identity_privacy(db, auth.user.id, payload.identity_privacy_level)
    await db.commit()
    await db.refresh(settings)
    return IdentityPrivacyResponse(
        profile_visibility=settings.profile_visibility,
        identity_privacy_level=payload.identity_privacy_level,
        levels=[item.value for item in IdentityPrivacyLevel],
    )


@router.get("/knowledge/nodes", response_model=list[KnowledgeNodeResponse])
async def get_knowledge_nodes(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[KnowledgeNodeResponse]:
    rows = await list_knowledge_nodes(db, auth.user.id)
    return [KnowledgeNodeResponse.model_validate(row) for row in rows]


@router.post(
    "/knowledge/nodes",
    response_model=KnowledgeNodeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_knowledge_node(
    payload: KnowledgeNodeCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> KnowledgeNodeResponse:
    node = await create_knowledge_node(db, auth.user.id, payload)
    await db.commit()
    await db.refresh(node)
    return KnowledgeNodeResponse.model_validate(node)


@router.get("/knowledge/edges", response_model=list[KnowledgeEdgeResponse])
async def get_knowledge_edges(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[KnowledgeEdgeResponse]:
    rows = await list_knowledge_edges(db, auth.user.id)
    return [KnowledgeEdgeResponse.model_validate(row) for row in rows]


@router.post(
    "/knowledge/edges",
    response_model=KnowledgeEdgeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_knowledge_edge(
    payload: KnowledgeEdgeCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> KnowledgeEdgeResponse:
    edge = await create_knowledge_edge(db, auth.user.id, payload)
    await db.commit()
    await db.refresh(edge)
    return KnowledgeEdgeResponse.model_validate(edge)


@router.post(
    "/actions",
    response_model=AgentActionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_action(
    payload: AgentActionCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AgentActionResponse:
    action = await create_agent_action(db, auth.user.id, payload)
    await db.commit()
    await db.refresh(action)
    return AgentActionResponse.model_validate(action)


@router.post("/actions/{action_id}/confirm", response_model=AgentActionResponse)
async def post_action_confirm(
    action_id: uuid.UUID,
    approve: bool = True,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> AgentActionResponse:
    action = await confirm_agent_action(db, auth.user.id, action_id, approve=approve)
    await db.commit()
    await db.refresh(action)
    return AgentActionResponse.model_validate(action)
