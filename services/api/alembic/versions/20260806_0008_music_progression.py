"""Add music library and profile progression.

Revision ID: 20260806_0008_music_progression
Revises: 20260731_0007_business_admin
Create Date: 2026-08-06
"""

from alembic import op

from app.models import Base

revision = "20260806_0008_music_progression"
down_revision = "20260731_0007_business_admin"
branch_labels = None
depends_on = None

NEW_TABLES = (
    "music_tracks",
    "music_playlists",
    "music_playlist_tracks",
    "music_library_items",
    "user_progression",
    "achievements",
    "user_achievements",
    "xp_awards",
)


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        for table_name in reversed(NEW_TABLES):
            op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        return
    for table_name in reversed(NEW_TABLES):
        op.drop_table(table_name)
