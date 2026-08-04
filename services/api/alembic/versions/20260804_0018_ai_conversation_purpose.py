"""Add domain purpose to AI conversations.

Revision ID: 20260804_0018_ai_conversation_purpose
Revises: 20260804_0017_owner_config_ops
Create Date: 2026-08-04
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260804_0018_ai_conversation_purpose"
down_revision = "20260804_0017_owner_config_ops"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("ai_conversations") as batch:
        batch.add_column(
            sa.Column(
                "purpose",
                sa.String(length=32),
                nullable=False,
                server_default="general",
            )
        )
        batch.create_index("ix_ai_conversations_purpose", ["purpose"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("ai_conversations") as batch:
        batch.drop_index("ix_ai_conversations_purpose")
        batch.drop_column("purpose")
