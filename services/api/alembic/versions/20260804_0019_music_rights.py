"""Add normalized music usage rights.

Revision ID: 20260804_0019_music_rights
Revises: 20260804_0018_ai_conversation_purpose
Create Date: 2026-08-04
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260804_0019_music_rights"
down_revision = "20260804_0018_ai_conversation_purpose"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "music_tracks" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("music_tracks")}
    with op.batch_alter_table("music_tracks") as batch:
        if "allows_listening" not in columns:
            batch.add_column(
                sa.Column(
                    "allows_listening",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.true(),
                )
            )
        if "allows_live_bgm" not in columns:
            batch.add_column(
                sa.Column(
                    "allows_live_bgm",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.true(),
                )
            )
        if "allows_vod" not in columns:
            batch.add_column(
                sa.Column(
                    "allows_vod",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )
        if "territory_code" not in columns:
            batch.add_column(sa.Column("territory_code", sa.String(length=8), nullable=True))
        if "license_code" not in columns:
            batch.add_column(sa.Column("license_code", sa.String(length=64), nullable=True))


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "music_tracks" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("music_tracks")}
    with op.batch_alter_table("music_tracks") as batch:
        for name in (
            "license_code",
            "territory_code",
            "allows_vod",
            "allows_live_bgm",
            "allows_listening",
        ):
            if name in columns:
                batch.drop_column(name)
