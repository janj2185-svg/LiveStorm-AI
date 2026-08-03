"""Add AI memory embedding vectors.

Revision ID: 20260803_0010_ai_memory_embeddings
Revises: 20260803_0009_auth_otp_purpose
Create Date: 2026-08-03
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260803_0010_ai_memory_embeddings"
down_revision = "20260803_0009_auth_otp_purpose"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["ai_memory_embeddings"].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["ai_memory_embeddings"].drop(bind=connection, checkfirst=True)
