"""Add owner_service_credentials for encrypted third-party config.

Revision ID: 20260804_0016_owner_config
Revises: 20260804_0015_music_module
Create Date: 2026-08-04
"""

from __future__ import annotations

from alembic import op

from app.models import Base

revision = "20260804_0016_owner_config"
down_revision = "20260804_0015_music_module"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["owner_service_credentials"].create(
        bind=connection, checkfirst=True
    )


def downgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["owner_service_credentials"].drop(
        bind=connection, checkfirst=True
    )
