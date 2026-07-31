"""Create the SYLORA identity and platform foundation.

Revision ID: 20260731_0001
Revises:
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=False)
    if connection.dialect.name == "postgresql":
        op.execute(
            """
            CREATE FUNCTION reject_security_audit_mutation()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'security_audit_events is append-only';
            END;
            $$ LANGUAGE plpgsql
            """
        )
        op.execute(
            """
            CREATE TRIGGER security_audit_events_append_only
            BEFORE UPDATE OR DELETE ON security_audit_events
            FOR EACH ROW EXECUTE FUNCTION reject_security_audit_mutation()
            """
        )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute(
            "DROP TRIGGER IF EXISTS security_audit_events_append_only ON security_audit_events"
        )
        op.execute("DROP FUNCTION IF EXISTS reject_security_audit_mutation()")
    Base.metadata.drop_all(bind=connection, checkfirst=True)
