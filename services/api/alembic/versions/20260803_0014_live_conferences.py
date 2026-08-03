"""Add live conference rooms.

Revision ID: 20260803_0014_live_conferences
Revises: 20260803_0013_live_guest_invites
Create Date: 2026-08-03
"""

from __future__ import annotations

from alembic import op
from app.models import Base

revision = "20260803_0014_live_conferences"
down_revision = "20260803_0013_live_guest_invites"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["live_conferences"].create(bind=connection, checkfirst=True)
    Base.metadata.tables["live_conference_participants"].create(bind=connection, checkfirst=True)


def downgrade() -> None:
    connection = op.get_bind()
    Base.metadata.tables["live_conference_participants"].drop(bind=connection, checkfirst=True)
    Base.metadata.tables["live_conferences"].drop(bind=connection, checkfirst=True)
