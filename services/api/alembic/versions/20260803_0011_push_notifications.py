"""Add device push notification tokens.

Revision ID: 20260803_0011_push_notifications
Revises: 20260803_0010_ai_memory_embeddings
Create Date: 2026-08-03
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260803_0011_push_notifications"
down_revision = "20260803_0010_ai_memory_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["device_push_tokens"].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["device_push_tokens"].drop(bind=connection, checkfirst=True)
