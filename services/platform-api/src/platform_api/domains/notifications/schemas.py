from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationPublic(BaseModel):
    id: UUID
    type: str
    entity_type: str
    entity_id: UUID
    payload: dict
    read: bool
    actor: "AuthorSnippet"
    created_at: datetime


class AuthorSnippet(BaseModel):
    id: UUID
    handle: str
    display_name: str


class NotificationListResponse(BaseModel):
    items: list[NotificationPublic]
    unread_count: int


NotificationPublic.model_rebuild()
