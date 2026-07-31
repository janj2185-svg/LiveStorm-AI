"""Add tenant business operations and platform administration.

Revision ID: 20260731_0007_business_admin
Revises: 20260731_0006_creator_commerce_learning
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0007_business_admin"
down_revision = "20260731_0006_creator_commerce_learning"
branch_labels = None
depends_on = None

BUSINESS_ADMIN_TABLES = (
    "business_workspaces",
    "business_workspace_memberships",
    "business_workspace_invitations",
    "business_teams",
    "business_team_memberships",
    "business_audit_events",
    "business_crm_companies",
    "business_crm_contacts",
    "business_pipeline_stages",
    "business_crm_deals",
    "business_deal_activities",
    "business_data_jobs",
    "business_tasks",
    "business_task_dependencies",
    "business_task_comments",
    "business_task_activities",
    "business_calendar_events",
    "business_document_folders",
    "business_documents",
    "business_document_versions",
    "business_document_approvals",
    "business_budgets",
    "business_budget_categories",
    "business_expenses",
    "business_expense_approvals",
    "business_invoices",
    "business_invoice_lines",
    "business_finance_transaction_references",
    "admin_feature_flags",
    "admin_platform_settings",
    "admin_account_actions",
    "admin_service_health_reports",
)


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return
    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_business_append_only_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'business audit and financial evidence records are append-only';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table_name in (
        "business_audit_events",
        "business_deal_activities",
        "business_task_comments",
        "business_task_activities",
        "business_expense_approvals",
        "business_finance_transaction_references",
        "admin_platform_settings",
        "admin_account_actions",
    ):
        op.execute(
            f"""
            CREATE TRIGGER {table_name}_append_only
            BEFORE UPDATE OR DELETE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION reject_business_append_only_mutation()
            """
        )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_verified_document_version_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.upload_state = 'verified' THEN
                RAISE EXCEPTION 'verified document versions are immutable';
            END IF;
            RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER business_document_versions_verified_immutable
        BEFORE UPDATE OR DELETE ON business_document_versions
        FOR EACH ROW EXECUTE FUNCTION reject_verified_document_version_mutation()
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute("DROP FUNCTION IF EXISTS reject_verified_document_version_mutation() CASCADE")
        op.execute("DROP FUNCTION IF EXISTS reject_business_append_only_mutation() CASCADE")
        for table_name in reversed(BUSINESS_ADMIN_TABLES):
            op.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        return
    for table_name in reversed(BUSINESS_ADMIN_TABLES):
        op.drop_table(table_name)
