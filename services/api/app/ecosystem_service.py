from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_service import settings_for
from app.ecosystem_models import (
    ActionPermissionLevel,
    ActionState,
    AgentAction,
    IdentityPrivacyLevel,
    KnowledgeEdge,
    KnowledgeNode,
    PersonalAIActivity,
    PersonalAIAgent,
)
from app.ecosystem_schemas import (
    AgentActionCreate,
    KnowledgeEdgeCreate,
    KnowledgeNodeCreate,
    PersonalAIAgentPatch,
)
from app.errors import APIError
from app.models import AccountSettings
from app.security import utcnow
from app.sylora_persona import conversation_emotion_snapshot

DEFAULT_PERMISSIONS: dict[str, bool] = {
    "profile_context": True,
    "memory_read": True,
    "memory_write": False,
    "projects": False,
    "business": False,
    "content_create": False,
    "live_assist": False,
    "live_moderate": False,
    "calendar": False,
    "messaging_assist": False,
    "execute_allowed_actions": False,
}

DEFAULT_CONTEXT_SOURCES = [
    "profile",
    "ai_memory",
    "conversation_history",
]


async def ensure_personal_ai_agent(db: AsyncSession, user_id: uuid.UUID) -> PersonalAIAgent:
    agent = await db.scalar(select(PersonalAIAgent).where(PersonalAIAgent.user_id == user_id))
    if agent is not None:
        return agent
    user_settings = await settings_for(db, user_id)
    agent = PersonalAIAgent(
        user_id=user_id,
        display_name="Sylora",
        locale=user_settings.preferred_locale or "uk",
        permissions=dict(DEFAULT_PERMISSIONS),
        tool_allowlist=[],
        context_sources=list(DEFAULT_CONTEXT_SOURCES),
    )
    db.add(agent)
    await db.flush()
    db.add(
        PersonalAIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="agent.created",
            summary="Personal AI Sylora створена для цього акаунта.",
            rationale="Кожен користувач має одного Personal AI з окремою памʼяттю та permissions.",
            data_used=["user_id", "preferred_locale"],
            permission_snapshot=dict(agent.permissions),
        )
    )
    await db.flush()
    return agent


async def patch_personal_ai_agent(
    db: AsyncSession, user_id: uuid.UUID, payload: PersonalAIAgentPatch
) -> PersonalAIAgent:
    agent = await ensure_personal_ai_agent(db, user_id)
    values = payload.model_dump(exclude_unset=True)
    for key, value in values.items():
        setattr(agent, key, value)
    db.add(
        PersonalAIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="agent.permissions_updated",
            summary="Оновлено permissions / tools Personal AI.",
            rationale="Користувач змінив доступ Personal AI.",
            data_used=sorted(values.keys()),
            permission_snapshot=dict(agent.permissions),
        )
    )
    await db.flush()
    return agent


async def list_personal_ai_activity(
    db: AsyncSession, user_id: uuid.UUID, *, limit: int = 50
) -> list[PersonalAIActivity]:
    await ensure_personal_ai_agent(db, user_id)
    return list(
        (
            await db.scalars(
                select(PersonalAIActivity)
                .where(PersonalAIActivity.user_id == user_id)
                .order_by(PersonalAIActivity.created_at.desc())
                .limit(limit)
            )
        ).all()
    )


async def personal_ai_dashboard(db: AsyncSession, user_id: uuid.UUID) -> dict[str, Any]:
    agent = await ensure_personal_ai_agent(db, user_id)
    settings = await settings_for(db, user_id)
    activity = await list_personal_ai_activity(db, user_id, limit=20)
    knows: list[str] = []
    if agent.permissions.get("profile_context"):
        knows.append("Профіль і публічні поля акаунта (за згодою).")
    if settings.memory_enabled and settings.personalization_enabled:
        knows.append("Увімкнена Personal AI memory (preference/fact/summary).")
    else:
        knows.append("Довготривала memory вимкнена користувачем.")
    if agent.permissions.get("live_assist"):
        knows.append("LIVE-асист (лише якщо увімкнено).")
    emotion = conversation_emotion_snapshot(user_id=user_id, locale=agent.locale)
    return {
        "agent": agent,
        "what_ai_knows": knows,
        "access_scopes": dict(agent.permissions),
        "recent_activity": activity,
        "memory_enabled": settings.memory_enabled,
        "personalization_enabled": settings.personalization_enabled,
        "emotion": emotion,
    }


async def create_knowledge_node(
    db: AsyncSession, user_id: uuid.UUID, payload: KnowledgeNodeCreate
) -> KnowledgeNode:
    existing = await db.scalar(
        select(KnowledgeNode).where(
            KnowledgeNode.owner_user_id == user_id,
            KnowledgeNode.kind == payload.kind,
            KnowledgeNode.external_id == payload.external_id,
            KnowledgeNode.deleted_at.is_(None),
        )
    )
    if existing is not None:
        existing.label = payload.label
        existing.privacy_level = payload.privacy_level
        existing.properties = payload.properties
        await db.flush()
        return existing
    node = KnowledgeNode(
        owner_user_id=user_id,
        kind=payload.kind,
        external_id=payload.external_id,
        label=payload.label,
        privacy_level=payload.privacy_level,
        properties=payload.properties,
    )
    db.add(node)
    await db.flush()
    return node


async def list_knowledge_nodes(db: AsyncSession, user_id: uuid.UUID) -> list[KnowledgeNode]:
    return list(
        (
            await db.scalars(
                select(KnowledgeNode)
                .where(
                    KnowledgeNode.owner_user_id == user_id,
                    KnowledgeNode.deleted_at.is_(None),
                )
                .order_by(KnowledgeNode.updated_at.desc())
                .limit(200)
            )
        ).all()
    )


async def create_knowledge_edge(
    db: AsyncSession, user_id: uuid.UUID, payload: KnowledgeEdgeCreate
) -> KnowledgeEdge:
    for node_id in (payload.source_node_id, payload.target_node_id):
        owned = await db.scalar(
            select(KnowledgeNode.id).where(
                KnowledgeNode.id == node_id,
                KnowledgeNode.owner_user_id == user_id,
                KnowledgeNode.deleted_at.is_(None),
            )
        )
        if owned is None:
            raise APIError(
                404,
                "knowledge_node_not_found",
                "Knowledge node not found",
                "Both edge endpoints must be owned active nodes.",
            )
    edge = KnowledgeEdge(
        owner_user_id=user_id,
        source_node_id=payload.source_node_id,
        target_node_id=payload.target_node_id,
        relation=payload.relation,
        privacy_level=payload.privacy_level,
        properties=payload.properties,
    )
    db.add(edge)
    await db.flush()
    return edge


async def list_knowledge_edges(db: AsyncSession, user_id: uuid.UUID) -> list[KnowledgeEdge]:
    return list(
        (
            await db.scalars(
                select(KnowledgeEdge)
                .where(
                    KnowledgeEdge.owner_user_id == user_id,
                    KnowledgeEdge.deleted_at.is_(None),
                )
                .order_by(KnowledgeEdge.created_at.desc())
                .limit(400)
            )
        ).all()
    )


def _confirmation_required(level: ActionPermissionLevel) -> bool:
    return level in {
        ActionPermissionLevel.request_confirmation,
        ActionPermissionLevel.execute_allowed,
        ActionPermissionLevel.prepare,
    }


async def create_agent_action(
    db: AsyncSession, user_id: uuid.UUID, payload: AgentActionCreate
) -> AgentAction:
    agent = await ensure_personal_ai_agent(db, user_id)
    if (
        payload.permission_level == ActionPermissionLevel.execute_allowed
        and not agent.permissions.get("execute_allowed_actions")
    ):
        raise APIError(
            403,
            "action_execute_forbidden",
            "Execute not permitted",
            "Enable execute_allowed_actions on Personal AI before EXECUTE_ALLOWED.",
        )
    action = AgentAction(
        user_id=user_id,
        agent_id=agent.id,
        action_type=payload.action_type,
        permission_level=payload.permission_level,
        state=(
            ActionState.awaiting_confirmation
            if _confirmation_required(payload.permission_level)
            else ActionState.proposed
        ),
        input_payload=payload.input_payload,
        confirmation_required=_confirmation_required(payload.permission_level),
    )
    db.add(action)
    await db.flush()
    db.add(
        PersonalAIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="action.proposed",
            summary=f"Запропоновано action `{payload.action_type}`.",
            rationale=f"Permission level {payload.permission_level.value}.",
            data_used=sorted(payload.input_payload.keys()),
            permission_snapshot=dict(agent.permissions),
            action_id=action.id,
        )
    )
    await db.flush()
    return action


async def confirm_agent_action(
    db: AsyncSession, user_id: uuid.UUID, action_id: uuid.UUID, *, approve: bool
) -> AgentAction:
    action = await db.scalar(
        select(AgentAction).where(AgentAction.id == action_id, AgentAction.user_id == user_id)
    )
    if action is None:
        raise APIError(404, "action_not_found", "Action not found", "Unknown action id.")
    if action.state not in {ActionState.awaiting_confirmation, ActionState.proposed}:
        raise APIError(
            409,
            "action_not_confirmable",
            "Action not confirmable",
            "Only proposed/awaiting actions can be confirmed.",
        )
    now = utcnow()
    if not approve:
        action.state = ActionState.rejected
        action.completed_at = now
    elif action.permission_level == ActionPermissionLevel.execute_allowed:
        action.state = ActionState.succeeded
        action.confirmed_at = now
        action.completed_at = now
        action.output_payload = {"status": "executed_allowed", "note": "foundation stub"}
    else:
        action.state = ActionState.approved
        action.confirmed_at = now
        action.output_payload = {"status": "approved_pending_worker"}
    await db.flush()
    return action


async def get_or_create_identity_privacy(
    db: AsyncSession, user_id: uuid.UUID
) -> tuple[AccountSettings, IdentityPrivacyLevel]:
    settings = await db.get(AccountSettings, user_id)
    if settings is None:
        settings = AccountSettings(user_id=user_id)
        db.add(settings)
        await db.flush()
    raw = getattr(settings, "identity_privacy_level", None)
    if raw in {level.value for level in IdentityPrivacyLevel}:
        level = IdentityPrivacyLevel(raw)
    else:
        level = (
            IdentityPrivacyLevel.public
            if settings.profile_visibility == "public"
            else IdentityPrivacyLevel.private
        )
    return settings, level


async def set_identity_privacy(
    db: AsyncSession, user_id: uuid.UUID, level: IdentityPrivacyLevel
) -> AccountSettings:
    settings, _ = await get_or_create_identity_privacy(db, user_id)
    if hasattr(settings, "identity_privacy_level"):
        settings.identity_privacy_level = level.value
    # Keep legacy binary visibility aligned for public/private extremes.
    if level == IdentityPrivacyLevel.public:
        settings.profile_visibility = "public"
    elif level in {IdentityPrivacyLevel.private, IdentityPrivacyLevel.ai_only}:
        settings.profile_visibility = "private"
    await db.flush()
    return settings
