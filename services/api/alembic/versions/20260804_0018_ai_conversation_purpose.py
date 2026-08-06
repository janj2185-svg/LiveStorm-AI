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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("ai_conversations")}
    indexes = {index["name"] for index in inspector.get_indexes("ai_conversations")}

    if "purpose" not in columns:
        with op.batch_alter_table("ai_conversations") as batch:
            batch.add_column(
                sa.Column(
                    "purpose",
                    sa.String(length=32),
                    nullable=False,
                    server_default="general",
                )
            )
    if "ix_ai_conversations_purpose" not in indexes:
        with op.batch_alter_table("ai_conversations") as batch:
            batch.create_index(
                "ix_ai_conversations_purpose", ["purpose"], unique=False
            )


def downgrade() -> None:
    with op.batch_alter_table("ai_conversations") as batch:
        batch.drop_index("ix_ai_conversations_purpose")
        batch.drop_column("purpose")
