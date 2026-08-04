"""Add music module tables.

Revision ID: 20260804_0015_music_module
Revises: 20260803_0014_live_conferences
Create Date: 2026-08-04
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260804_0015_music_module"
down_revision = "20260803_0014_live_conferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    for name in (
        "music_tracks",
        "music_playlists",
        "music_playlist_items",
        "music_favorites",
        "music_play_events",
    ):
        Base.metadata.tables[name].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    for name in (
        "music_play_events",
        "music_favorites",
        "music_playlist_items",
        "music_playlists",
        "music_tracks",
    ):
        Base.metadata.tables[name].drop(bind=connection, checkfirst=True)
