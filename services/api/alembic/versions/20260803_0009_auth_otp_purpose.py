"""Add OTP purpose for login, password reset, and identity linking.

Revision ID: 20260803_0009_auth_otp_purpose
Revises: 20260803_0008_consumer_auth
Create Date: 2026-08-03
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260803_0009_auth_otp_purpose"
down_revision = "20260803_0008_consumer_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fresh installs may already have purpose via Base.metadata.create_all.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {
        column["name"] for column in inspector.get_columns("auth_otp_challenges")
    }
    indexes = {
        index["name"] for index in inspector.get_indexes("auth_otp_challenges")
    }

    if "purpose" not in columns:
        with op.batch_alter_table("auth_otp_challenges") as batch:
            batch.add_column(
                sa.Column(
                    "purpose",
                    sa.String(length=32),
                    nullable=False,
                    server_default="login",
                )
            )
    if "ix_auth_otp_challenges_purpose" not in indexes:
        op.create_index(
            "ix_auth_otp_challenges_purpose",
            "auth_otp_challenges",
            ["purpose"],
        )
    if "ix_auth_otp_destination_channel_purpose" not in indexes:
        op.create_index(
            "ix_auth_otp_destination_channel_purpose",
            "auth_otp_challenges",
            ["destination", "channel", "purpose"],
        )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_otp_destination_channel_purpose",
        table_name="auth_otp_challenges",
    )
    op.drop_index("ix_auth_otp_challenges_purpose", table_name="auth_otp_challenges")
    with op.batch_alter_table("auth_otp_challenges") as batch:
        batch.drop_column("purpose")
