"use client";

import { useCallback } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { GlassCard } from "@/components/GlassCard";
import { KpiCard, KpiGrid } from "@/components/Kpi";
import { Section } from "@/components/Section";
import { StatusPill, toneForStatus } from "@/components/StatusPill";
import { adminApi } from "@/lib/api-client";
import { formatMicrosUsd, formatMinorCurrency, formatNumber, titleCase } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";

import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const analytics = useAuthedQuery(useCallback((token) => adminApi.analytics(token), []));
  const health = useAuthedQuery(useCallback((token) => adminApi.serviceHealth(token), []));
  const security = useAuthedQuery(useCallback((token) => adminApi.security(token), []));

  const users = analytics.data?.users ?? {};
  const activeUsers = users.active ?? 0;
  const suspendedUsers = users.suspended ?? 0;

  return (
    <AppShell
      title="Dashboard"
      description="Live snapshot of accounts, commerce, gifting, and platform health."
    >
      <Section title="Platform overview">
        {analytics.loading ? (
          <LoadingState label="Loading analytics…" />
        ) : analytics.error ? (
          <ErrorState error={analytics.error} onRetry={analytics.reload} />
        ) : analytics.data ? (
          <>
            <KpiGrid>
              <KpiCard
                label="Active users"
                value={formatNumber(activeUsers)}
                sub={`${formatNumber(suspendedUsers)} suspended`}
                icon="☺"
                accent="violet"
              />
              <KpiCard
                label="Gross order value"
                value={formatMinorCurrency(analytics.data.orders.gross_minor)}
                sub={`${formatNumber(analytics.data.orders.paid_or_fulfilled)} paid/fulfilled orders`}
                icon="$"
                accent="gold"
              />
              <KpiCard
                label="Live sessions"
                value={formatNumber(analytics.data.live.active)}
                sub={`${formatNumber(analytics.data.live.total)} total ever`}
                icon="●"
                accent="sky"
              />
              <KpiCard
                label="Gifts sent"
                value={formatNumber(analytics.data.gifts.total)}
                icon="❋"
                accent="violet"
              />
              <KpiCard
                label="AI spend"
                value={formatMicrosUsd(analytics.data.ai_usage.cost_micros)}
                sub={`${formatNumber(analytics.data.ai_usage.requests)} requests`}
                icon="✦"
                accent="gold"
              />
              <KpiCard
                label="Open reports"
                value={formatNumber(analytics.data.moderation.open_reports)}
                sub={`${formatNumber(analytics.data.moderation.decisions)} decisions made`}
                icon="⚑"
                accent="sky"
              />
            </KpiGrid>
            <p className={styles.basis}>Basis: {analytics.data.basis}</p>
          </>
        ) : (
          <EmptyState title="No analytics yet" detail="The platform has not recorded any data." />
        )}
      </Section>

      <div className={styles.twoCol}>
        <Section title="Service health" description="Self-reported checks from SYLORA services.">
          <GlassCard>
            {health.loading ? (
              <LoadingState label="Loading service health…" />
            ) : health.error ? (
              <ErrorState error={health.error} onRetry={health.reload} />
            ) : health.data && health.data.reports.length > 0 ? (
              <div className={styles.healthList}>
                {health.data.reports.map((report) => (
                  <div key={report.id} className={styles.healthRow}>
                    <div className={styles.healthMeta}>
                      <span className={styles.healthService}>{report.service}</span>
                      <span className={styles.healthInstance}>{report.instance}</span>
                    </div>
                    <StatusPill label={report.status} tone={toneForStatus(report.status)} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No service health reports"
                detail="No service has pushed a health report to /v1/admin/service-health yet."
              />
            )}
          </GlassCard>
        </Section>

        <Section title="Security snapshot" description="Session and account-status posture.">
          <GlassCard>
            {security.loading ? (
              <LoadingState label="Loading security dashboard…" />
            ) : security.error ? (
              <ErrorState error={security.error} onRetry={security.reload} />
            ) : security.data ? (
              <div className={styles.statList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Active sessions</span>
                  <span className={styles.statValue}>
                    {formatNumber(security.data.sessions.active)}
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Revoked sessions</span>
                  <span className={styles.statValue}>
                    {formatNumber(security.data.sessions.revoked)}
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Reuse detected</span>
                  <span className={styles.statValue}>
                    {formatNumber(security.data.sessions.reuse_detected)}
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Failed / suspicious events</span>
                  <span className={styles.statValue}>
                    {formatNumber(security.data.security_events.failed_or_suspicious)}
                  </span>
                </div>
                {Object.entries(security.data.account_statuses).map(([status, count]) => (
                  <div className={styles.statRow} key={status}>
                    <span className={styles.statLabel}>{titleCase(status)} accounts</span>
                    <span className={styles.statValue}>{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No security data" />
            )}
          </GlassCard>
        </Section>
      </div>
    </AppShell>
  );
}
