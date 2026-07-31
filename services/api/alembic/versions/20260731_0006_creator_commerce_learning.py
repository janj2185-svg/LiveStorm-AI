"""Add creator subscriptions, marketplace commerce, and learning.

Revision ID: 20260731_0006_creator_commerce_learning
Revises: 20260731_0005_ai_live_hub
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0006_creator_commerce_learning"
down_revision = "20260731_0005_ai_live_hub"
branch_labels = None
depends_on = None

PLATFORM_TABLES = (
    "creator_accounts",
    "creator_subscription_tiers",
    "marketplace_stores",
    "marketplace_products",
    "marketplace_product_versions",
    "marketplace_product_assets",
    "marketplace_product_prices",
    "marketplace_product_inventory",
    "marketplace_product_collections",
    "marketplace_product_collection_items",
    "marketplace_carts",
    "marketplace_cart_items",
    "marketplace_orders",
    "marketplace_order_lines",
    "marketplace_product_entitlements",
    "marketplace_service_bookings",
    "marketplace_service_booking_messages",
    "marketplace_product_reviews",
    "content_items",
    "content_versions",
    "content_assets",
    "content_processing_jobs",
    "creator_subscriptions",
    "learning_courses",
    "learning_course_versions",
    "learning_modules",
    "learning_lessons",
    "learning_enrollments",
    "learning_lesson_progress",
    "learning_quizzes",
    "learning_quiz_questions",
    "learning_quiz_options",
    "learning_quiz_attempts",
    "learning_quiz_answers",
    "learning_certificates",
)


def upgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        # This explicitly requested revision identifier exceeds Alembic's
        # historical 32-character default version column.
        op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)")
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return
    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_published_platform_version_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND OLD.state = 'published' THEN
                RAISE EXCEPTION 'published versions are immutable';
            END IF;
            IF TG_OP = 'UPDATE' AND OLD.state = 'published' THEN
                RAISE EXCEPTION 'published versions are immutable';
            END IF;
            RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table_name in (
        "content_versions",
        "marketplace_product_versions",
        "learning_course_versions",
    ):
        op.execute(f"DROP TRIGGER IF EXISTS {table_name}_published_immutable ON {table_name}")
        op.execute(
            f"""
            CREATE TRIGGER {table_name}_published_immutable
            BEFORE UPDATE OR DELETE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION reject_published_platform_version_mutation()
            """
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute("DROP FUNCTION IF EXISTS reject_published_platform_version_mutation() CASCADE")
        for table_name in reversed(PLATFORM_TABLES):
            op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        return
    for table_name in reversed(PLATFORM_TABLES):
        op.drop_table(table_name)
