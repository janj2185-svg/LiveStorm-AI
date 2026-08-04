"""Owner config ops: health history, alerts, backups, env profiles.

Revision ID: 20260804_0017_owner_config_ops
Revises: 20260804_0016_owner_config
Create Date: 2026-08-04
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

from app.models import Base

revision = "20260804_0017_owner_config_ops"
down_revision = "20260804_0016_owner_config"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = set(inspector.get_table_names())

    if "owner_service_credentials" in tables:
        columns = {col["name"] for col in inspector.get_columns("owner_service_credentials")}
        with op.batch_alter_table("owner_service_credentials") as batch:
            if "environment" not in columns:
                batch.add_column(
                    sa.Column(
                        "environment",
                        sa.String(length=16),
                        nullable=False,
                        server_default="production",
                    )
                )
            if "previous_encrypted_secrets" not in columns:
                batch.add_column(sa.Column("previous_encrypted_secrets", sa.Text(), nullable=True))
            if "rotation_in_progress" not in columns:
                batch.add_column(
                    sa.Column(
                        "rotation_in_progress",
                        sa.Boolean(),
                        nullable=False,
                        server_default=sa.false(),
                    )
                )
            if "last_success_at" not in columns:
                batch.add_column(sa.Column("last_success_at", sa.DateTime(timezone=True)))
            if "consecutive_failures" not in columns:
                batch.add_column(
                    sa.Column(
                        "consecutive_failures",
                        sa.Integer(),
                        nullable=False,
                        server_default="0",
                    )
                )
            if "key_expires_at" not in columns:
                batch.add_column(sa.Column("key_expires_at", sa.DateTime(timezone=True)))

        # Replace unique(provider_key) with unique(provider_key, environment)
        uniques = {
            item.get("name")
            for item in inspector.get_unique_constraints("owner_service_credentials")
        }
        with op.batch_alter_table("owner_service_credentials") as batch:
            if "uq_owner_service_provider_key" in uniques:
                batch.drop_constraint("uq_owner_service_provider_key", type_="unique")
            if "uq_owner_service_provider_environment" not in uniques:
                batch.create_unique_constraint(
                    "uq_owner_service_provider_environment",
                    ["provider_key", "environment"],
                )

    for name in (
        "owner_service_health_checks",
        "owner_config_alerts",
        "owner_config_backups",
    ):
        Base.metadata.tables[name].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    for name in (
        "owner_config_backups",
        "owner_config_alerts",
        "owner_service_health_checks",
    ):
        Base.metadata.tables[name].drop(bind=connection, checkfirst=True)
