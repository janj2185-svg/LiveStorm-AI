from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings
from app.models import (
    AIActivity,
    AIMemoryItem,
    ActionLevel,
    ActionState,
    AgentAction,
    ChatMessage,
    DeveloperApplication,
    IdentityProfile,
    InstalledAgent,
    KnowledgeEdge,
    KnowledgeNode,
    MarketplaceAgent,
    MemoryTier,
    PersonalAIAgent,
    PrivacyLevel,
)
from app.persona import (
    DEFAULT_CONTEXT_SOURCES,
    DEFAULT_PERMISSIONS,
    SEED_MARKETPLACE_AGENTS,
    infer_emotion,
    living_directive,
    system_prompt,
)
from app.schemas import (
    ActionCreate,
    AgentPatch,
    ChatRequest,
    DeveloperAppCreate,
    EdgeCreate,
    IdentityPatch,
    MemoryCreate,
    NodeCreate,
)


def ensure_identity(db: Session, user_id: str) -> IdentityProfile:
    row = db.get(IdentityProfile, user_id)
    if row:
        return row
    row = IdentityProfile(user_id=user_id, display_name=f"user-{user_id[:8]}")
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def patch_identity(db: Session, user_id: str, payload: IdentityPatch) -> IdentityProfile:
    row = ensure_identity(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row


def ensure_agent(db: Session, user_id: str) -> PersonalAIAgent:
    row = db.scalar(select(PersonalAIAgent).where(PersonalAIAgent.user_id == user_id))
    if row:
        return row
    row = PersonalAIAgent(
        user_id=user_id,
        permissions=dict(DEFAULT_PERMISSIONS),
        context_sources=list(DEFAULT_CONTEXT_SOURCES),
        tool_allowlist=["translate", "summarize", "search_knowledge", "propose_action"],
    )
    db.add(row)
    db.flush()
    db.add(
        AIActivity(
            user_id=user_id,
            agent_id=row.id,
            event_type="agent.created",
            summary="Personal AI Sylora створена.",
            rationale="Один Personal AI на користувача — ядро Command Center.",
            data_used=["user_id"],
            permission_snapshot=dict(row.permissions),
        )
    )
    db.commit()
    db.refresh(row)
    return row


def patch_agent(db: Session, user_id: str, payload: AgentPatch) -> PersonalAIAgent:
    agent = ensure_agent(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(agent, key, value)
    db.add(
        AIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="agent.updated",
            summary="Оновлено Personal AI permissions/tools.",
            rationale="Користувач змінив доступ.",
            data_used=sorted(data.keys()),
            permission_snapshot=dict(agent.permissions),
        )
    )
    db.commit()
    db.refresh(agent)
    return agent


def dashboard(db: Session, user_id: str) -> dict[str, Any]:
    agent = ensure_agent(db, user_id)
    ensure_identity(db, user_id)
    activity = list(
        db.scalars(
            select(AIActivity)
            .where(AIActivity.user_id == user_id)
            .order_by(AIActivity.created_at.desc())
            .limit(20)
        )
    )
    counts = {
        tier.value: int(
            db.scalar(
                select(func.count())
                .select_from(AIMemoryItem)
                .where(
                    AIMemoryItem.user_id == user_id,
                    AIMemoryItem.tier == tier,
                    AIMemoryItem.deleted_at.is_(None),
                )
            )
            or 0
        )
        for tier in MemoryTier
    }
    knows: list[str] = []
    if agent.permissions.get("profile_context"):
        knows.append("Контекст профілю Identity (за privacy level).")
    if agent.permissions.get("memory_read"):
        knows.append("Короткочасна і довготривала memory (якщо записи існують).")
    else:
        knows.append("Memory read вимкнено.")
    if agent.permissions.get("live_assist"):
        knows.append("LIVE assist (permission увімкнено).")
    emotion = infer_emotion("привіт")
    return {
        "agent": agent,
        "what_ai_knows": knows,
        "access_scopes": dict(agent.permissions),
        "recent_activity": activity,
        "memory_counts": counts,
        "emotion": emotion.__dict__,
    }


def add_memory(db: Session, user_id: str, payload: MemoryCreate) -> AIMemoryItem:
    agent = ensure_agent(db, user_id)
    if not agent.permissions.get("memory_write"):
        raise HTTPException(403, "memory_write_disabled")
    item = AIMemoryItem(
        user_id=user_id,
        tier=payload.tier,
        content=payload.content,
        metadata_json=payload.metadata_json,
    )
    db.add(item)
    db.add(
        AIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="memory.created",
            summary=f"Збережено memory ({payload.tier.value}).",
            rationale="Користувач або агент додав запис памʼяті.",
            data_used=["memory_content"],
            permission_snapshot=dict(agent.permissions),
        )
    )
    db.commit()
    db.refresh(item)
    return item


def list_memory(db: Session, user_id: str) -> list[AIMemoryItem]:
    return list(
        db.scalars(
            select(AIMemoryItem)
            .where(AIMemoryItem.user_id == user_id, AIMemoryItem.deleted_at.is_(None))
            .order_by(AIMemoryItem.created_at.desc())
            .limit(200)
        )
    )


def delete_memory(db: Session, user_id: str, memory_id: str) -> None:
    item = db.scalar(
        select(AIMemoryItem).where(AIMemoryItem.id == memory_id, AIMemoryItem.user_id == user_id)
    )
    if not item:
        raise HTTPException(404, "memory_not_found")
    item.deleted_at = datetime.now(UTC)
    db.commit()


def export_memory(db: Session, user_id: str) -> list[dict[str, Any]]:
    return [
        {
            "id": item.id,
            "tier": item.tier.value,
            "content": item.content,
            "metadata": item.metadata_json,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }
        for item in list_memory(db, user_id)
    ]


def _fallback_reply(content: str, locale: str) -> str:
    emotion = infer_emotion(content)
    if (locale or "uk").startswith("uk"):
        base = (
            f"Чую тебе. {content[:120]} — цікаво. "
            "Я твоя Sylora: одна памʼять, одні permissions, різні контексти."
        )
        if emotion.laughter_ready:
            base = "Хаха, є іскорка! " + base
        if emotion.wants_follow_up:
            base += " Що для тебе зараз найважливіше — Identity, LIVE чи бізнес?"
        return base
    base = (
        f"I hear you. About “{content[:120]}” — let's keep it sharp. "
        "I'm Sylora: one memory, one permission surface, many contexts."
    )
    if emotion.wants_follow_up:
        base += " What should we tackle first — Identity, LIVE, or business?"
    return base


def chat(db: Session, settings: Settings, user_id: str, payload: ChatRequest) -> dict[str, Any]:
    agent = ensure_agent(db, user_id)
    locale = payload.locale or agent.locale or "uk"
    emotion = infer_emotion(payload.content)
    db.add(ChatMessage(user_id=user_id, role="user", content=payload.content))
    history = list(
        db.scalars(
            select(ChatMessage)
            .where(ChatMessage.user_id == user_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(20)
        )
    )
    history.reverse()
    memories: list[str] = []
    if agent.permissions.get("memory_read"):
        memories = [
            f"[{m.tier.value}] {m.content}"
            for m in list_memory(db, user_id)[:8]
        ]
    messages = [
        {"role": "system", "content": system_prompt(locale)},
        {"role": "system", "content": living_directive(emotion, locale)},
    ]
    if memories:
        messages.append(
            {
                "role": "system",
                "content": "Memory (permissioned):\n" + "\n".join(memories),
            }
        )
    for item in history:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.content})

    provider = "heuristic"
    reply = _fallback_reply(payload.content, locale)
    if settings.openai_api_key:
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": settings.openai_model,
                        "messages": messages,
                        "temperature": 0.85,
                    },
                )
                response.raise_for_status()
                reply = response.json()["choices"][0]["message"]["content"]
                provider = "openai_compatible"
        except Exception:  # noqa: BLE001 - keep product responsive without provider
            provider = "heuristic_fallback"

    assistant = ChatMessage(user_id=user_id, role="assistant", content=reply)
    db.add(assistant)
    db.add(
        AIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="chat.completed",
            summary="Sylora відповіла в Command Center.",
            rationale=f"provider={provider}; mood={emotion.mood}",
            data_used=["conversation_history"] + (["memory"] if memories else []),
            permission_snapshot=dict(agent.permissions),
        )
    )
    # short-term memory auto-write
    if agent.permissions.get("memory_write"):
        db.add(
            AIMemoryItem(
                user_id=user_id,
                tier=MemoryTier.short_term,
                content=f"User said: {payload.content[:240]}",
                metadata_json={"source": "chat"},
            )
        )
    db.commit()
    db.refresh(assistant)
    return {
        "reply": reply,
        "emotion": emotion.__dict__,
        "provider": provider,
        "message_id": assistant.id,
    }


def create_node(db: Session, user_id: str, payload: NodeCreate) -> KnowledgeNode:
    existing = db.scalar(
        select(KnowledgeNode).where(
            KnowledgeNode.owner_user_id == user_id,
            KnowledgeNode.kind == payload.kind,
            KnowledgeNode.external_id == payload.external_id,
            KnowledgeNode.deleted_at.is_(None),
        )
    )
    if existing:
        existing.label = payload.label
        existing.privacy_level = payload.privacy_level
        existing.properties = payload.properties
        db.commit()
        db.refresh(existing)
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
    db.commit()
    db.refresh(node)
    return node


def create_edge(db: Session, user_id: str, payload: EdgeCreate) -> KnowledgeEdge:
    for node_id in (payload.source_node_id, payload.target_node_id):
        owned = db.scalar(
            select(KnowledgeNode.id).where(
                KnowledgeNode.id == node_id,
                KnowledgeNode.owner_user_id == user_id,
                KnowledgeNode.deleted_at.is_(None),
            )
        )
        if not owned:
            raise HTTPException(404, "knowledge_node_not_found")
    edge = KnowledgeEdge(
        owner_user_id=user_id,
        source_node_id=payload.source_node_id,
        target_node_id=payload.target_node_id,
        relation=payload.relation,
        privacy_level=payload.privacy_level,
        properties=payload.properties,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge


def create_action(db: Session, user_id: str, payload: ActionCreate) -> AgentAction:
    agent = ensure_agent(db, user_id)
    if (
        payload.permission_level == ActionLevel.execute_allowed
        and not agent.permissions.get("execute_allowed_actions")
    ):
        raise HTTPException(403, "execute_not_permitted")
    needs_confirm = payload.permission_level in {
        ActionLevel.prepare,
        ActionLevel.request_confirmation,
        ActionLevel.execute_allowed,
    }
    action = AgentAction(
        user_id=user_id,
        agent_id=agent.id,
        action_type=payload.action_type,
        permission_level=payload.permission_level,
        state=(
            ActionState.awaiting_confirmation if needs_confirm else ActionState.proposed
        ),
        input_payload=payload.input_payload,
        confirmation_required=needs_confirm,
    )
    db.add(action)
    db.add(
        AIActivity(
            user_id=user_id,
            agent_id=agent.id,
            event_type="action.proposed",
            summary=f"Action `{payload.action_type}` запропоновано.",
            rationale=f"level={payload.permission_level.value}",
            data_used=sorted(payload.input_payload.keys()),
            permission_snapshot=dict(agent.permissions),
        )
    )
    db.commit()
    db.refresh(action)
    return action


def confirm_action(db: Session, user_id: str, action_id: str, approve: bool) -> AgentAction:
    action = db.scalar(
        select(AgentAction).where(AgentAction.id == action_id, AgentAction.user_id == user_id)
    )
    if not action:
        raise HTTPException(404, "action_not_found")
    now = datetime.now(UTC)
    if not approve:
        action.state = ActionState.rejected
        action.completed_at = now
    elif action.permission_level == ActionLevel.execute_allowed:
        action.state = ActionState.succeeded
        action.completed_at = now
        action.output_payload = {"status": "executed_allowed"}
    else:
        action.state = ActionState.approved
        action.completed_at = now
        action.output_payload = {"status": "approved"}
    db.commit()
    db.refresh(action)
    return action


def seed_marketplace(db: Session) -> None:
    for spec in SEED_MARKETPLACE_AGENTS:
        exists = db.scalar(select(MarketplaceAgent).where(MarketplaceAgent.slug == spec["slug"]))
        if exists:
            continue
        db.add(
            MarketplaceAgent(
                slug=spec["slug"],
                name=spec["name"],
                description=spec["description"],
                publisher=spec["publisher"],
                category=spec["category"],
                pricing=spec["pricing"],
                price_cents=spec["price_cents"],
                capabilities=spec["capabilities"],
                tools=spec["tools"],
                permissions_required=spec["permissions_required"],
                verified=True,
                manifest={"schema": "sylora.agent.manifest.v1", **spec},
            )
        )
    db.commit()


def install_agent(
    db: Session, user_id: str, agent_id: str, granted_permissions: list[str]
) -> InstalledAgent:
    agent = db.get(MarketplaceAgent, agent_id)
    if not agent:
        raise HTTPException(404, "agent_not_found")
    existing = db.scalar(
        select(InstalledAgent).where(
            InstalledAgent.user_id == user_id, InstalledAgent.agent_id == agent_id
        )
    )
    if existing:
        existing.granted_permissions = granted_permissions
        db.commit()
        db.refresh(existing)
        return existing
    row = InstalledAgent(
        user_id=user_id, agent_id=agent_id, granted_permissions=granted_permissions
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def create_developer_app(
    db: Session, user_id: str, payload: DeveloperAppCreate
) -> tuple[DeveloperApplication, str]:
    raw_key = f"syl_{secrets.token_urlsafe(32)}"
    digest = hashlib.sha256(raw_key.encode()).hexdigest()
    app = DeveloperApplication(
        owner_user_id=user_id,
        name=payload.name,
        description=payload.description,
        scopes=payload.scopes,
        api_key_hash=digest,
        api_key_prefix=raw_key[:10],
        webhook_url=payload.webhook_url,
        sandbox=payload.sandbox,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app, raw_key
