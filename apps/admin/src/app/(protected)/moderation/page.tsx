"use client";

import { useCallback, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { GlassCard } from "@/components/GlassCard";
import { ReasonModal } from "@/components/ReasonModal";
import { ResolveReportModal } from "@/components/ResolveReportModal";
import { Section } from "@/components/Section";
import { StatusPill } from "@/components/StatusPill";
import { Table, tableStyles } from "@/components/Table";
import { adminApi, trustSafetyApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, titleCase } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";
import type { TrustSafetyReport } from "@/lib/types";

import styles from "./moderation.module.css";

export default function ModerationPage() {
  const { callWithAuth } = useAuth();
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [resolveTarget, setResolveTarget] = useState<TrustSafetyReport | null>(null);
  const [escalateTarget, setEscalateTarget] = useState<TrustSafetyReport | null>(null);
  const cursor = cursorStack[cursorStack.length - 1] ?? null;

  const summary = useAuthedQuery(useCallback((token) => adminApi.moderationSummary(token), []));
  const reports = useAuthedQuery(
    useCallback((token) => trustSafetyApi.reports(token, cursor), [cursor]),
  );

  const handleNextPage = () => {
    if (reports.data?.next_cursor) {
      setCursorStack((stack) => [...stack, reports.data!.next_cursor]);
    }
  };

  const handlePrevPage = () => {
    setCursorStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack));
  };

  return (
    <AppShell
      title="Moderation"
      description="Trust & safety queue: open reports, decisions, and escalations."
    >
      <Section title="Moderation summary">
        {summary.loading ? (
          <LoadingState label="Loading moderation summary…" />
        ) : summary.error ? (
          <ErrorState error={summary.error} onRetry={summary.reload} />
        ) : summary.data ? (
          <div className={styles.summaryGrid}>
            <GlassCard>
              <h3 style={{ marginTop: 0, marginBottom: "0.6rem", fontSize: "0.9rem" }}>
                Report queue
              </h3>
              <div className={styles.summaryList}>
                {Object.entries(summary.data.queue).length ? (
                  Object.entries(summary.data.queue).map(([key, value]) => (
                    <div className={styles.summaryRow} key={key}>
                      <span>{titleCase(key)}</span>
                      <span className={styles.summaryValue}>{value}</span>
                    </div>
                  ))
                ) : (
                  <span className={tableStyles.muted}>No reports recorded.</span>
                )}
              </div>
            </GlassCard>
            <GlassCard>
              <h3 style={{ marginTop: 0, marginBottom: "0.6rem", fontSize: "0.9rem" }}>
                Decisions taken
              </h3>
              <div className={styles.summaryList}>
                {Object.entries(summary.data.decisions).length ? (
                  Object.entries(summary.data.decisions).map(([key, value]) => (
                    <div className={styles.summaryRow} key={key}>
                      <span>{titleCase(key)}</span>
                      <span className={styles.summaryValue}>{value}</span>
                    </div>
                  ))
                ) : (
                  <span className={tableStyles.muted}>No decisions recorded yet.</span>
                )}
              </div>
            </GlassCard>
          </div>
        ) : (
          <EmptyState title="No moderation data" />
        )}
      </Section>

      <Section title="Open reports" description="Reports awaiting a trust & safety decision.">
        <GlassCard padding="none">
          {reports.loading ? (
            <LoadingState label="Loading reports…" />
          ) : reports.error ? (
            <ErrorState error={reports.error} onRetry={reports.reload} />
          ) : !reports.data || reports.data.items.length === 0 ? (
            <EmptyState title="Queue is clear" detail="There are no open reports right now." icon="✓" />
          ) : (
            <div style={{ padding: "0.5rem 0" }}>
              <Table>
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Reported</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {reports.data.items.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div className={styles.reasonCell}>
                          <span>{titleCase(report.reason)}</span>
                          {report.evidence ? (
                            <span className={styles.evidence}>{report.evidence}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className={tableStyles.mono}>
                        {report.target_type} · {report.target_id.slice(0, 8)}…
                      </td>
                      <td>
                        <StatusPill label={report.status} />
                      </td>
                      <td className={tableStyles.mono}>{formatDateTime(report.created_at)}</td>
                      <td>
                        <div className={tableStyles.actionsCell}>
                          <Button size="sm" variant="ghost" onClick={() => setEscalateTarget(report)}>
                            Escalate
                          </Button>
                          <Button size="sm" variant="gold" onClick={() => setResolveTarget(report)}>
                            Resolve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </GlassCard>

        <div className={styles.pagination}>
          <Button variant="ghost" size="sm" onClick={handlePrevPage} disabled={cursorStack.length <= 1}>
            ← Previous
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextPage} disabled={!reports.data?.next_cursor}>
            Next →
          </Button>
        </div>
      </Section>

      {resolveTarget ? (
        <ResolveReportModal
          onSubmit={async (payload) => {
            await callWithAuth((token) => trustSafetyApi.resolve(token, resolveTarget.id, payload));
            reports.reload();
            summary.reload();
          }}
          onClose={() => setResolveTarget(null)}
        />
      ) : null}

      {escalateTarget ? (
        <ReasonModal
          title="Escalate report"
          description="Escalate this report to senior trust & safety review."
          confirmLabel="Escalate"
          confirmVariant="danger"
          minLength={3}
          maxLength={5000}
          onSubmit={async (notes) => {
            await callWithAuth((token) => trustSafetyApi.escalate(token, escalateTarget.id, notes));
            reports.reload();
          }}
          onClose={() => setEscalateTarget(null)}
        />
      ) : null}
    </AppShell>
  );
}
