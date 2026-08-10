"""Phase 1 ecosystem foundation tables.

Revision ID: 20260810_0008_ecosystem_foundation
Revises: 20260731_0007_business_admin
Create Date: 2026-08-10
"""

from alembic import op
from sqlalchemy import text

from app.models import Base

# Ensure metadata registration.
import app.ecosystem_models  # noqa: F401

revision = "20260810_0008_ecosystem_foundation"
down_revision = "20260731_0007_business_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name == "sqlite":
        # SQLite test DBs recreate via metadata; column may already exist on fresh create_all.
        cols = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(account_settings)")).fetchall()
        }
        if "identity_privacy_level" not in cols:
            op.execute(
                "ALTER TABLE account_settings ADD COLUMN identity_privacy_level VARCHAR(24) "
                "DEFAULT 'private'"
            )
        return
    op.execute(
        """
        ALTER TABLE account_settings
        ADD COLUMN IF NOT EXISTS identity_privacy_level VARCHAR(24) DEFAULT 'private'
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    for table in (
        "agent_actions",
        "knowledge_edges",
        "knowledge_nodes",
        "personal_ai_activities",
        "personal_ai_agents",
    ):
        op.execute(f"DROP TABLE IF EXISTS {table}")
    if connection.dialect.name == "postgresql":
        op.execute("ALTER TABLE account_settings DROP COLUMN IF EXISTS identity_privacy_level")
