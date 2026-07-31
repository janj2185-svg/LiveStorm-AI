"""Add the provider-neutral SYLORA AI Brain.

Revision ID: 20260731_0004_ai_brain
Revises: 20260731_0003_wallet_gifts
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0004_ai_brain"
down_revision = "20260731_0003_wallet_gifts"
branch_labels = None
depends_on = None

AI_TABLES = (
    "ai_provider_configurations",
    "ai_user_settings",
    "ai_conversations",
    "ai_messages",
    "ai_citations",
    "ai_tool_definitions",
    "ai_tool_proposals",
    "ai_tool_executions",
    "ai_memories",
    "ai_usage_records",
    "ai_jobs",
    "ai_events",
    "ai_prompt_templates",
    "ai_export_requests",
)


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return

    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_ai_append_only_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table_name in ("ai_usage_records", "ai_tool_executions"):
        op.execute(f"DROP TRIGGER IF EXISTS {table_name}_append_only ON {table_name}")
        op.execute(
            f"""
            CREATE TRIGGER {table_name}_append_only
            BEFORE UPDATE OR DELETE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION reject_ai_append_only_mutation()
            """
        )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_published_ai_prompt()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.state = 'published' THEN
                RAISE EXCEPTION 'published AI prompt versions are immutable';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        "DROP TRIGGER IF EXISTS ai_prompt_templates_published_immutable ON ai_prompt_templates"
    )
    op.execute(
        """
        CREATE TRIGGER ai_prompt_templates_published_immutable
        BEFORE UPDATE OR DELETE ON ai_prompt_templates
        FOR EACH ROW EXECUTE FUNCTION protect_published_ai_prompt()
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute(
            "DROP TRIGGER IF EXISTS ai_prompt_templates_published_immutable ON ai_prompt_templates"
        )
        op.execute("DROP FUNCTION IF EXISTS protect_published_ai_prompt()")
        for table_name in ("ai_usage_records", "ai_tool_executions"):
            op.execute(f"DROP TRIGGER IF EXISTS {table_name}_append_only ON {table_name}")
        op.execute("DROP FUNCTION IF EXISTS reject_ai_append_only_mutation()")

    for table_name in reversed(AI_TABLES):
        Base.metadata.tables[table_name].drop(bind=connection, checkfirst=True)
