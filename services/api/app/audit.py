from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models import SecurityAuditEvent
from app.security import ip_hash


def add_audit_event(
    session: AsyncSession,
    request: Request,
    settings: Settings,
    action: str,
    *,
    actor_user_id: uuid.UUID | None = None,
    target_user_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    client_ip = request.client.host if request.client else None
    session.add(
        SecurityAuditEvent(
            actor_user_id=actor_user_id,
            action=action,
            target_user_id=target_user_id,
            request_id=request.state.request_id,
            ip_hash=ip_hash(client_ip, settings),
            event_metadata=metadata or {},
        )
    )
