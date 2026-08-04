"""Add per-participant conference contribution paths.

Revision ID: 20260804_0020_conference_contributions
Revises: 20260804_0019_music_rights
Create Date: 2026-08-04
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260804_0020_conference_contributions"
down_revision = "20260804_0019_music_rights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "live_conference_participants" not in inspector.get_table_names():
        return

    columns = {
        column["name"] for column in inspector.get_columns("live_conference_participants")
    }
    with op.batch_alter_table("live_conference_participants") as batch:
        if "contribution_ingest_path" not in columns:
            batch.add_column(sa.Column("contribution_ingest_path", sa.String(length=255), nullable=True))
        if "contribution_provisioned" not in columns:
            batch.add_column(
                sa.Column(
                    "contribution_provisioned",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )

    indexes = {
        index["name"] for index in inspector.get_indexes("live_conference_participants")
    }
    if "ix_live_conference_participants_contribution_path" not in indexes:
        op.create_index(
            "ix_live_conference_participants_contribution_path",
            "live_conference_participants",
            ["contribution_ingest_path"],
            unique=True,
        )


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "live_conference_participants" not in inspector.get_table_names():
        return
    indexes = {
        index["name"] for index in inspector.get_indexes("live_conference_participants")
    }
    if "ix_live_conference_participants_contribution_path" in indexes:
        op.drop_index(
            "ix_live_conference_participants_contribution_path",
            table_name="live_conference_participants",
        )
    columns = {
        column["name"] for column in inspector.get_columns("live_conference_participants")
    }
    with op.batch_alter_table("live_conference_participants") as batch:
        if "contribution_provisioned" in columns:
            batch.drop_column("contribution_provisioned")
        if "contribution_ingest_path" in columns:
            batch.drop_column("contribution_ingest_path")
