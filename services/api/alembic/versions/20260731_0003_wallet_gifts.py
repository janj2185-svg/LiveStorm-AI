"""Add the immutable wallet ledger and versioned gift platform.

Revision ID: 20260731_0003_wallet_gifts
Revises: 20260731_0002_social_messaging
Create Date: 2026-07-31
"""

from alembic import op
from app.models import Base

revision = "20260731_0003_wallet_gifts"
down_revision = "20260731_0002_social_messaging"
branch_labels = None
depends_on = None

WALLET_GIFT_TABLES = (
    "ledger_accounts",
    "ledger_transactions",
    "ledger_entries",
    "payment_operations",
    "payment_webhook_events",
    "gift_categories",
    "gift_definitions",
    "gift_versions",
    "gift_assets",
    "gift_collections",
    "gift_collection_items",
    "inventory_items",
    "user_gift_preferences",
    "creator_monetization_settings",
    "gift_user_eligibility",
    "gift_sends",
    "gift_deliveries",
    "gift_combinations",
    "gift_events",
    "gift_affinities",
    "gift_spend_daily",
    "gift_refunds",
)


def upgrade() -> None:
    connection = op.get_bind()
    Base.metadata.create_all(bind=connection, checkfirst=True)
    if connection.dialect.name != "postgresql":
        return

    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_ledger_entry_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'ledger_entries are immutable';
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS ledger_entries_immutable ON ledger_entries")
    op.execute(
        """
        CREATE TRIGGER ledger_entries_immutable
        BEFORE UPDATE OR DELETE ON ledger_entries
        FOR EACH ROW EXECUTE FUNCTION reject_ledger_entry_mutation()
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION reject_posted_ledger_transaction_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.status IN ('posted', 'reversed') THEN
                RAISE EXCEPTION 'posted ledger_transactions are immutable';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS ledger_transactions_posted_immutable ON ledger_transactions")
    op.execute(
        """
        CREATE TRIGGER ledger_transactions_posted_immutable
        BEFORE UPDATE OR DELETE ON ledger_transactions
        FOR EACH ROW EXECUTE FUNCTION reject_posted_ledger_transaction_mutation()
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION validate_ledger_transaction_entries(target_id uuid)
        RETURNS void AS $$
        DECLARE
            debit_total bigint;
            credit_total bigint;
            entry_count bigint;
        BEGIN
            SELECT
                COALESCE(SUM(debit_minor), 0),
                COALESCE(SUM(credit_minor), 0),
                COUNT(*)
            INTO debit_total, credit_total, entry_count
            FROM ledger_entries
            WHERE transaction_id = target_id;

            IF entry_count < 2 OR debit_total <= 0 OR debit_total <> credit_total THEN
                RAISE EXCEPTION 'ledger transaction % is not balanced', target_id;
            END IF;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION validate_ledger_entry_transaction()
        RETURNS trigger AS $$
        BEGIN
            PERFORM validate_ledger_transaction_entries(
                CASE WHEN TG_OP = 'DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id END
            );
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION validate_new_ledger_transaction()
        RETURNS trigger AS $$
        BEGIN
            PERFORM validate_ledger_transaction_entries(NEW.id);
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS ledger_entries_balanced ON ledger_entries")
    op.execute(
        """
        CREATE CONSTRAINT TRIGGER ledger_entries_balanced
        AFTER INSERT OR UPDATE OR DELETE ON ledger_entries
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION validate_ledger_entry_transaction()
        """
    )
    op.execute("DROP TRIGGER IF EXISTS ledger_transactions_have_entries ON ledger_transactions")
    op.execute(
        """
        CREATE CONSTRAINT TRIGGER ledger_transactions_have_entries
        AFTER INSERT ON ledger_transactions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION validate_new_ledger_transaction()
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_published_gift_version()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' AND OLD.state = 'published' THEN
                RAISE EXCEPTION 'published gift versions are immutable';
            END IF;
            IF TG_OP = 'UPDATE' AND OLD.state = 'published' THEN
                IF NOT (
                    NEW.state = 'retired'
                    AND NEW.retired_at IS NOT NULL
                    AND NEW.runtime_manifest IS NOT DISTINCT FROM OLD.runtime_manifest
                    AND NEW.gift_definition_id IS NOT DISTINCT FROM OLD.gift_definition_id
                    AND NEW.version_number IS NOT DISTINCT FROM OLD.version_number
                    AND NEW.created_by_id IS NOT DISTINCT FROM OLD.created_by_id
                    AND NEW.submitted_by_id IS NOT DISTINCT FROM OLD.submitted_by_id
                    AND NEW.reviewed_by_id IS NOT DISTINCT FROM OLD.reviewed_by_id
                    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
                ) THEN
                    RAISE EXCEPTION 'published gift version content is immutable';
                END IF;
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS gift_versions_published_immutable ON gift_versions")
    op.execute(
        """
        CREATE TRIGGER gift_versions_published_immutable
        BEFORE UPDATE OR DELETE ON gift_versions
        FOR EACH ROW EXECUTE FUNCTION protect_published_gift_version()
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION protect_published_gift_asset()
        RETURNS trigger AS $$
        DECLARE
            version_state varchar;
        BEGIN
            SELECT state INTO version_state
            FROM gift_versions
            WHERE id = OLD.gift_version_id;
            IF version_state IN ('published', 'retired') THEN
                RAISE EXCEPTION 'assets of published gift versions are immutable';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute("DROP TRIGGER IF EXISTS gift_assets_published_immutable ON gift_assets")
    op.execute(
        """
        CREATE TRIGGER gift_assets_published_immutable
        BEFORE UPDATE OR DELETE ON gift_assets
        FOR EACH ROW EXECUTE FUNCTION protect_published_gift_asset()
        """
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS gift_assets_published_immutable ON gift_assets")
        op.execute("DROP FUNCTION IF EXISTS protect_published_gift_asset()")
        op.execute("DROP TRIGGER IF EXISTS gift_versions_published_immutable ON gift_versions")
        op.execute("DROP FUNCTION IF EXISTS protect_published_gift_version()")
        op.execute("DROP TRIGGER IF EXISTS ledger_transactions_have_entries ON ledger_transactions")
        op.execute("DROP TRIGGER IF EXISTS ledger_entries_balanced ON ledger_entries")
        op.execute("DROP FUNCTION IF EXISTS validate_new_ledger_transaction()")
        op.execute("DROP FUNCTION IF EXISTS validate_ledger_entry_transaction()")
        op.execute("DROP FUNCTION IF EXISTS validate_ledger_transaction_entries(uuid)")
        op.execute(
            "DROP TRIGGER IF EXISTS ledger_transactions_posted_immutable ON ledger_transactions"
        )
        op.execute("DROP FUNCTION IF EXISTS reject_posted_ledger_transaction_mutation()")
        op.execute("DROP TRIGGER IF EXISTS ledger_entries_immutable ON ledger_entries")
        op.execute("DROP FUNCTION IF EXISTS reject_ledger_entry_mutation()")

    for table_name in reversed(WALLET_GIFT_TABLES):
        Base.metadata.tables[table_name].drop(bind=connection, checkfirst=True)
