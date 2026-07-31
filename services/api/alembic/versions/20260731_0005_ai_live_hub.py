"""Add SYLORA AI Live Hub and live-stream control plane.

Revision ID: 20260731_0005_ai_live_hub
Revises: 20260731_0004_ai_brain
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0005_ai_live_hub"
down_revision = "20260731_0004_ai_brain"
branch_labels = None
depends_on = None

LIVE_TABLES = (
    "live_integration_connections",
    "live_integration_capability_snapshots",
    "live_plugin_manifests",
    "live_sessions",
    "live_destinations",
    "live_integration_webhook_deliveries",
    "live_normalized_events",
    "ai_live_personas",
    "ai_live_rules",
    "live_actions",
    "live_action_transitions",
    "ai_live_turns",
    "live_moderation_decisions",
    "live_viewer_consents",
    "live_viewer_memories",
    "live_events",
    "live_game_sessions",
    "live_game_questions",
    "live_participant_answers",
    "live_game_scores",
)

STRICT_APPEND_ONLY_TABLES = (
    "live_normalized_events",
    "live_moderation_decisions",
    "live_action_transitions",
    "live_events",
)


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return

    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_live_append_only_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION '% is append-only', TG_TABLE_NAME;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table_name in STRICT_APPEND_ONLY_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS {table_name}_append_only ON {table_name}")
        op.execute(
            f"""
            CREATE TRIGGER {table_name}_append_only
            BEFORE UPDATE OR DELETE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION reject_live_append_only_mutation()
            """
        )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_live_action_command()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                RAISE EXCEPTION 'live actions cannot be deleted';
            END IF;
            IF OLD.session_id IS DISTINCT FROM NEW.session_id
               OR OLD.event_id IS DISTINCT FROM NEW.event_id
               OR OLD.rule_id IS DISTINCT FROM NEW.rule_id
               OR OLD.destination_id IS DISTINCT FROM NEW.destination_id
               OR OLD.action_type IS DISTINCT FROM NEW.action_type
               OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
               OR OLD.typed_payload IS DISTINCT FROM NEW.typed_payload
               OR OLD.requires_approval IS DISTINCT FROM NEW.requires_approval
               OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
                RAISE EXCEPTION 'live action command payload is immutable';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS live_actions_command_immutable ON live_actions")
    op.execute(
        """
        CREATE TRIGGER live_actions_command_immutable
        BEFORE UPDATE OR DELETE ON live_actions
        FOR EACH ROW EXECUTE FUNCTION protect_live_action_command()
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS live_actions_command_immutable ON live_actions")
        op.execute("DROP FUNCTION IF EXISTS protect_live_action_command()")
        for table_name in STRICT_APPEND_ONLY_TABLES:
            op.execute(f"DROP TRIGGER IF EXISTS {table_name}_append_only ON {table_name}")
        op.execute("DROP FUNCTION IF EXISTS reject_live_append_only_mutation()")

    for table_name in reversed(LIVE_TABLES):
        Base.metadata.tables[table_name].drop(bind=connection, checkfirst=True)
