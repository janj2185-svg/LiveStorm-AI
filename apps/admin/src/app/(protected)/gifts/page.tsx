"use client";

import { useCallback, useState, type FormEvent } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { describeError, ErrorState, LoadingState } from "@/components/DataState";
import { Field, TextArea, TextInput } from "@/components/Field";
import { GlassCard } from "@/components/GlassCard";
import { KpiCard, KpiGrid } from "@/components/Kpi";
import { Section } from "@/components/Section";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatNumber } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";

import styles from "./gifts.module.css";

function RefundForm({
  title,
  description,
  idLabel,
  idPlaceholder,
  onSubmit,
}: {
  title: string;
  description: string;
  idLabel: string;
  idPlaceholder: string;
  onSubmit: (id: string, reason: string, idempotencyKey: string) => Promise<{
    refund_id: string;
    ledger_transaction_id: string;
  }>;
}) {
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ refund_id: string; ledger_transaction_id: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await onSubmit(id.trim(), reason.trim(), idempotencyKey);
      setResult(response);
      setId("");
      setReason("");
    } catch (err) {
      setError(describeError(err).detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassCard>
      <h3 className={styles.formTitle}>{title}</h3>
      <p className={styles.formDescription}>{description}</p>
      <form onSubmit={handleSubmit}>
        <Field label={idLabel} hint="UUID from the ledger or a support ticket.">
          <TextInput
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder={idPlaceholder}
            required
            pattern="[0-9a-fA-F-]{16,}"
          />
        </Field>
        <Field label="Reason" hint="3–500 characters, recorded in the audit log.">
          <TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={3}
            maxLength={500}
            rows={2}
            required
          />
        </Field>
        <Button type="submit" variant="danger" disabled={submitting} fullWidth>
          {submitting ? "Processing refund…" : "Issue refund"}
        </Button>
      </form>
      {result ? (
        <div className={[styles.resultBanner, styles.success].join(" ")}>
          Refund issued. Refund ID <code>{result.refund_id}</code>, ledger transaction{" "}
          <code>{result.ledger_transaction_id}</code>.
        </div>
      ) : null}
      {error ? <div className={[styles.resultBanner, styles.errorBanner].join(" ")}>{error}</div> : null}
    </GlassCard>
  );
}

export default function GiftsPage() {
  const { callWithAuth } = useAuth();
  const analytics = useAuthedQuery(useCallback((token) => adminApi.analytics(token), []));

  return (
    <AppShell title="Gifts" description="Gift economy KPIs and the refund console.">
      <Section title="Gift economy">
        {analytics.loading ? (
          <LoadingState label="Loading gift metrics…" />
        ) : analytics.error ? (
          <ErrorState error={analytics.error} onRetry={analytics.reload} />
        ) : analytics.data ? (
          <KpiGrid>
            <KpiCard
              label="Gifts sent"
              value={formatNumber(analytics.data.gifts.total)}
              icon="❋"
              accent="violet"
            />
          </KpiGrid>
        ) : null}
      </Section>

      <Section
        title="Refund console"
        description="SYLORA's admin API exposes targeted refunds by ID. There is no bulk gift-send listing endpoint yet."
      >
        <GlassCard className={styles.notice} style={{ marginBottom: "1.25rem" }}>
          <span className={styles.noticeIcon} aria-hidden>
            ℹ
          </span>
          <p className={styles.noticeText}>
            <code>/v1/admin/gifts</code> only exposes <code>POST /sends/&#123;id&#125;/refund</code> and{" "}
            <code>POST /inventory/&#123;id&#125;/refund</code>. To keep this console honest, we surface
            exactly those two actions below rather than fabricating a gift ledger browser. Look up the
            gift send or inventory item ID from support tooling or the ledger service first.
          </p>
        </GlassCard>

        <div className={styles.grid}>
          <RefundForm
            title="Refund a gift send"
            description="Reverses a completed gift send and its ledger entry."
            idLabel="Gift send ID"
            idPlaceholder="e.g. 5f2a1c3e-9b7d-4e21-8b0a-1a2b3c4d5e6f"
            onSubmit={(id, reason, key) =>
              callWithAuth((token) => adminApi.refundGiftSend(token, id, reason, key))
            }
          />
          <RefundForm
            title="Refund inventory item"
            description="Reverses an unspent gift inventory item held by a user."
            idLabel="Inventory item ID"
            idPlaceholder="e.g. 8c4d2a1b-3e9f-4a7c-9d1e-2f3a4b5c6d7e"
            onSubmit={(id, reason, key) =>
              callWithAuth((token) => adminApi.refundGiftInventory(token, id, reason, key))
            }
          />
        </div>
      </Section>
    </AppShell>
  );
}
