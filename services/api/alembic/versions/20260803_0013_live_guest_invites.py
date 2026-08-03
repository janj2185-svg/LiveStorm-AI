"""Add live guest invite foundation.

Revision ID: 20260803_0013_live_guest_invites
Revises: 20260803_0012_live_replays
Create Date: 2026-08-03
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260803_0013_live_guest_invites"
down_revision = "20260803_0012_live_replays"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["live_guest_invites"].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["live_guest_invites"].drop(bind=connection, checkfirst=True)
