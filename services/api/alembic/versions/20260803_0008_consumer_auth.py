"""Consumer auth: phone identity, OTP challenges, nullable email.

Revision ID: 20260803_0008_consumer_auth
Revises: 20260731_0007_business_admin
Create Date: 2026-08-03
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260803_0008_consumer_auth"
down_revision = "20260731_0007_business_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_indexes = {index["name"] for index in inspector.get_indexes("users")}
    tables = set(inspector.get_table_names())

    with op.batch_alter_table("users") as batch:
        batch.alter_column("email", existing_type=sa.String(length=320), nullable=True)
        if "phone_e164" not in user_columns:
            batch.add_column(sa.Column("phone_e164", sa.String(length=20), nullable=True))
        if "phone_verified_at" not in user_columns:
            batch.add_column(
                sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True)
            )
    if "ix_users_phone_e164" not in user_indexes:
        op.create_index("ix_users_phone_e164", "users", ["phone_e164"], unique=True)

    with op.batch_alter_table("oauth_identities") as batch:
        batch.alter_column(
            "provider_email", existing_type=sa.String(length=320), nullable=True
        )

    if "auth_otp_challenges" not in tables:
        op.create_table(
            "auth_otp_challenges",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("channel", sa.String(length=16), nullable=False),
            sa.Column("destination", sa.String(length=320), nullable=False),
            sa.Column("code_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("attempts", sa.Integer(), nullable=False),
            sa.Column("max_attempts", sa.Integer(), nullable=False),
            sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ip_hash", sa.String(length=64), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_auth_otp_challenges_channel", "auth_otp_challenges", ["channel"])
        op.create_index(
            "ix_auth_otp_challenges_destination", "auth_otp_challenges", ["destination"]
        )
        op.create_index(
            "ix_auth_otp_challenges_expires_at", "auth_otp_challenges", ["expires_at"]
        )
        op.create_index(
            "ix_auth_otp_destination_channel",
            "auth_otp_challenges",
            ["destination", "channel"],
        )


def downgrade() -> None:
    op.drop_index("ix_auth_otp_destination_channel", table_name="auth_otp_challenges")
    op.drop_index("ix_auth_otp_challenges_expires_at", table_name="auth_otp_challenges")
    op.drop_index("ix_auth_otp_challenges_destination", table_name="auth_otp_challenges")
    op.drop_index("ix_auth_otp_challenges_channel", table_name="auth_otp_challenges")
    op.drop_table("auth_otp_challenges")

    with op.batch_alter_table("oauth_identities") as batch:
        batch.alter_column(
            "provider_email", existing_type=sa.String(length=320), nullable=False
        )

    op.drop_index("ix_users_phone_e164", table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("phone_verified_at")
        batch.drop_column("phone_e164")
        batch.alter_column("email", existing_type=sa.String(length=320), nullable=False)
