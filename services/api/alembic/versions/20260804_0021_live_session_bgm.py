"""Add live session BGM selection fields.

Revision ID: 20260804_0021_live_session_bgm
Revises: 20260804_0020_conference_contributions
Create Date: 2026-08-04
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "20260804_0021_live_session_bgm"
down_revision = "20260804_0020_conference_contributions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "live_sessions" not in inspector.get_table_names():
        raise RuntimeError("live_sessions table is required before 20260804_0021_live_session_bgm")

    columns = {column["name"] for column in inspector.get_columns("live_sessions")}
    with op.batch_alter_table("live_sessions") as batch:
        if "bgm_track_id" not in columns:
            batch.add_column(sa.Column("bgm_track_id", sa.Uuid(), nullable=True))
        if "bgm_playlist_id" not in columns:
            batch.add_column(sa.Column("bgm_playlist_id", sa.Uuid(), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("live_sessions")}
    if "ix_live_sessions_bgm_track_id" not in indexes:
        op.create_index("ix_live_sessions_bgm_track_id", "live_sessions", ["bgm_track_id"])
    if "ix_live_sessions_bgm_playlist_id" not in indexes:
        op.create_index("ix_live_sessions_bgm_playlist_id", "live_sessions", ["bgm_playlist_id"])

    # FK only when music tables exist (production always has them after 0015).
    tables = set(inspector.get_table_names())
    if "music_tracks" in tables:
        try:
            op.create_foreign_key(
                "fk_live_sessions_bgm_track_id",
                "live_sessions",
                "music_tracks",
                ["bgm_track_id"],
                ["id"],
                ondelete="SET NULL",
            )
        except Exception:
            pass
    if "music_playlists" in tables:
        try:
            op.create_foreign_key(
                "fk_live_sessions_bgm_playlist_id",
                "live_sessions",
                "music_playlists",
                ["bgm_playlist_id"],
                ["id"],
                ondelete="SET NULL",
            )
        except Exception:
            pass


def downgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    if "live_sessions" not in inspector.get_table_names():
        return
    try:
        op.drop_constraint("fk_live_sessions_bgm_track_id", "live_sessions", type_="foreignkey")
    except Exception:
        pass
    try:
        op.drop_constraint("fk_live_sessions_bgm_playlist_id", "live_sessions", type_="foreignkey")
    except Exception:
        pass
    indexes = {index["name"] for index in inspector.get_indexes("live_sessions")}
    if "ix_live_sessions_bgm_track_id" in indexes:
        op.drop_index("ix_live_sessions_bgm_track_id", table_name="live_sessions")
    if "ix_live_sessions_bgm_playlist_id" in indexes:
        op.drop_index("ix_live_sessions_bgm_playlist_id", table_name="live_sessions")
    columns = {column["name"] for column in inspector.get_columns("live_sessions")}
    with op.batch_alter_table("live_sessions") as batch:
        if "bgm_playlist_id" in columns:
            batch.drop_column("bgm_playlist_id")
        if "bgm_track_id" in columns:
            batch.drop_column("bgm_track_id")
