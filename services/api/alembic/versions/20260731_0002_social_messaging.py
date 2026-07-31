"""Add the first-party social network and messaging schema.

Revision ID: 20260731_0002_social_messaging
Revises: 20260731_0001
Create Date: 2026-07-31
"""

from sqlalchemy import Column, String, inspect

from alembic import op
from app.models import Base

revision = "20260731_0002_social_messaging"
down_revision = "20260731_0001"
branch_labels = None
depends_on = None

SOCIAL_TABLES = (
    "follows",
    "follow_requests",
    "friendships",
    "blocks",
    "mutes",
    "communities",
    "channels",
    "community_memberships",
    "posts",
    "poll_options",
    "poll_votes",
    "comments",
    "reactions",
    "reposts",
    "bookmarks",
    "notifications",
    "notification_preferences",
    "conversations",
    "conversation_participants",
    "messages",
    "message_receipts",
    "message_events",
    "content_reports",
    "moderation_actions",
)


def upgrade() -> None:
    connection = op.get_bind()
    profile_columns = {column["name"] for column in inspect(connection).get_columns("profiles")}
    if "handle" not in profile_columns:
        op.add_column("profiles", Column("handle", String(30), nullable=True))
        op.create_index("ix_profiles_handle", "profiles", ["handle"], unique=True)

    # The prior foundation migration used metadata.create_all. checkfirst keeps
    # fresh installs compatible while creating only missing social tables for
    # databases that already applied the identity revision.
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name == "postgresql":
        op.execute(
            """
            CREATE OR REPLACE FUNCTION reject_moderation_action_mutation()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'moderation_actions is append-only';
            END;
            $$ LANGUAGE plpgsql
            """
        )
        op.execute(
            """
            DROP TRIGGER IF EXISTS moderation_actions_append_only ON moderation_actions
            """
        )
        op.execute(
            """
            CREATE TRIGGER moderation_actions_append_only
            BEFORE UPDATE OR DELETE ON moderation_actions
            FOR EACH ROW EXECUTE FUNCTION reject_moderation_action_mutation()
            """
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS moderation_actions_append_only ON moderation_actions")
        op.execute("DROP FUNCTION IF EXISTS reject_moderation_action_mutation()")

    for table_name in reversed(SOCIAL_TABLES):
        table = Base.metadata.tables[table_name]
        table.drop(bind=connection, checkfirst=True)

    profile_columns = {column["name"] for column in inspect(connection).get_columns("profiles")}
    if "handle" in profile_columns:
        indexes = {index["name"] for index in inspect(connection).get_indexes("profiles")}
        if "ix_profiles_handle" in indexes:
            op.drop_index("ix_profiles_handle", table_name="profiles")
        op.drop_column("profiles", "handle")
