"""Add stories/moments and user progress (XP, level, achievements) tables.

Revision ID: 20260806_0022_stories_progress
Revises: 20260804_0021_live_session_bgm
Create Date: 2026-08-06
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260806_0022_stories_progress"
down_revision = "20260804_0021_live_session_bgm"
branch_labels = None
depends_on = None

TABLE_NAMES = (
    "user_progress",
    "achievement_definitions",
    "stories",
    "story_items",
    "story_views",
)


def upgrade() -> None:
    connection = op.get_bind()
    for name in TABLE_NAMES:
        Base.metadata.tables[name].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    for name in reversed(TABLE_NAMES):
        Base.metadata.tables[name].drop(bind=connection, checkfirst=True)
