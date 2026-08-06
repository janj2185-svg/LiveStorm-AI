"""Add stories and profile XP / achievements.

Revision ID: 20260806_0008_stories_profile_progress
Revises: 20260731_0007_business_admin
Create Date: 2026-08-06
"""

from alembic import op
from sqlalchemy import text

from app.models import Base

revision = "20260806_0008_stories_profile_progress"
down_revision = "20260731_0007_business_admin"
branch_labels = None
depends_on = None

NEW_TABLES = (
    "stories",
    "story_views",
    "user_progress",
    "achievement_definitions",
    "user_achievements",
)

ACHIEVEMENT_SEED = (
    ("first_post", "First Light", "Publish your first post on SYLORA.", 50),
    ("first_friend", "Kindred Spark", "Accept or form your first friendship.", 50),
    ("first_gift_sent", "Gift of Presence", "Send your first gift.", 75),
    ("first_story", "Moment Keeper", "Share your first story.", 40),
    ("level_5", "Rising Aura", "Reach level 5.", 100),
    ("level_10", "Steady Glow", "Reach level 10.", 200),
)


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return
    for code, name, description, xp_reward in ACHIEVEMENT_SEED:
        connection.execute(
            text(
                """
                INSERT INTO achievement_definitions (code, name, description, xp_reward)
                VALUES (:code, :name, :description, :xp_reward)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    xp_reward = EXCLUDED.xp_reward
                """
            ),
            {
                "code": code,
                "name": name,
                "description": description,
                "xp_reward": xp_reward,
            },
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        for table_name in reversed(NEW_TABLES):
            op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        return
    for table_name in reversed(NEW_TABLES):
        op.drop_table(table_name)
