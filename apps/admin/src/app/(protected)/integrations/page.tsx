"use client";

import { useCallback, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { Select } from "@/components/Field";
import { GlassCard } from "@/components/GlassCard";
import { KpiCard, KpiGrid } from "@/components/Kpi";
import { Section } from "@/components/Section";
import { StatusPill, toneForStatus } from "@/components/StatusPill";
import { Table, tableStyles } from "@/components/Table";
import { adminApi } from "@/lib/api-client";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";
import type { OwnerProfile } from "@/lib/types";

import styles from "./integrations.module.css";

const ENVIRONMENTS: Array<{ value: OwnerProfile | ""; label: string }> = [
  { value: "", label: "Default environment" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "test", label: "Test" },
  { value: "development", label: "Development" },
];

export default function IntegrationsPage() {
  const [environment, setEnvironment] = useState<OwnerProfile | "">("");

  const catalog = useAuthedQuery(
    useCallback(
      (token) => adminApi.ownerConfigCatalog(token, environment || undefined),
      [environment],
    ),
  );
  const readiness = useAuthedQuery(
    useCallback(
      (token) => adminApi.ownerDeployReadiness(token, environment || undefined),
      [environment],
    ),
  );

  return (
    <AppShell
      title="Integrations"
      description="Read-only view of owner-configured third-party providers. Credentials are managed server-side."
    >
      <div className={styles.toolbar}>
        <div className={styles.envSelect}>
          <Select
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as OwnerProfile | "")}
          >
            {ENVIRONMENTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Section title="Provider catalog">
        {catalog.loading ? (
          <LoadingState label="Loading owner configuration…" />
        ) : catalog.error ? (
          <ErrorState error={catalog.error} onRetry={catalog.reload} />
        ) : catalog.data ? (
          <>
            <KpiGrid>
              <KpiCard label="Connected" value={formatNumber(catalog.data.connected_count)} accent="gold" />
              <KpiCard label="Missing" value={formatNumber(catalog.data.missing_count)} accent="sky" />
              <KpiCard label="Invalid" value={formatNumber(catalog.data.invalid_count)} accent="violet" />
              <KpiCard label="Expired" value={formatNumber(catalog.data.expired_count)} accent="violet" />
            </KpiGrid>

            <div style={{ marginTop: "1.25rem" }}>
              <GlassCard padding="none">
                {catalog.data.providers.length === 0 ? (
                  <EmptyState
                    title="No providers registered"
                    detail="Keys are configured server-side and none are registered for this environment yet."
                  />
                ) : (
                  <div style={{ padding: "0.5rem 0" }}>
                    <Table>
                      <thead>
                        <tr>
                          <th>Provider</th>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Enabled</th>
                          <th>Last tested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.data.providers.map((provider) => (
                          <tr key={provider.key}>
                            <td>
                              <div className={styles.providerMeta}>
                                <span className={styles.providerName}>{provider.name}</span>
                                <span className={styles.providerDescription}>{provider.description}</span>
                              </div>
                            </td>
                            <td className={tableStyles.mono}>{provider.category}</td>
                            <td>
                              <StatusPill label={provider.status} tone={toneForStatus(provider.status)} />
                            </td>
                            <td>
                              <StatusPill label={provider.enabled ? "on" : "off"} tone={provider.enabled ? "success" : "neutral"} />
                            </td>
                            <td className={tableStyles.mono}>
                              {provider.last_tested_at ? formatDateTime(provider.last_tested_at) : "never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </GlassCard>
            </div>
          </>
        ) : (
          <EmptyState
            title="Owner configuration is not available"
            detail="Keys for third-party providers are configured server-side by the platform owner and are not exposed to this console."
          />
        )}
      </Section>

      <Section title="Deploy readiness" description="Whether this environment can safely go live.">
        {readiness.loading ? (
          <LoadingState label="Checking deploy readiness…" />
        ) : readiness.error ? (
          <ErrorState error={readiness.error} onRetry={readiness.reload} />
        ) : readiness.data ? (
          <GlassCard>
            <div style={{ marginBottom: "1rem" }}>
              <StatusPill
                label={readiness.data.ready ? "Ready to deploy" : "Not ready"}
                tone={readiness.data.ready ? "success" : "danger"}
              />
            </div>
            <div className={styles.readinessGrid}>
              <div>
                <p className={styles.listTitle}>Blocking issues</p>
                {readiness.data.blocking.length ? (
                  <ul className={[styles.pillList, styles.blocking].join(" ")}>
                    {readiness.data.blocking.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <span className={tableStyles.muted}>None</span>
                )}
              </div>
              <div>
                <p className={styles.listTitle}>Warnings</p>
                {readiness.data.warnings.length ? (
                  <ul className={[styles.pillList, styles.warning].join(" ")}>
                    {readiness.data.warnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <span className={tableStyles.muted}>None</span>
                )}
              </div>
              <div>
                <p className={styles.listTitle}>Required providers</p>
                <ul className={styles.pillList}>
                  {readiness.data.required.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className={styles.listTitle}>Recommended providers</p>
                <ul className={styles.pillList}>
                  {readiness.data.recommended.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
        ) : (
          <EmptyState title="Deploy readiness unavailable" />
        )}
      </Section>
    </AppShell>
  );
}
