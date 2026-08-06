"use client";

import { useCallback, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/DataState";
import { FeatureFlagModal, type FeatureFlagFormPayload } from "@/components/FeatureFlagModal";
import { GlassCard } from "@/components/GlassCard";
import { PlatformSettingModal } from "@/components/PlatformSettingModal";
import { Section } from "@/components/Section";
import { StatusPill } from "@/components/StatusPill";
import { Table, tableStyles } from "@/components/Table";
import { adminApi } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/format";
import { useAuthedQuery } from "@/lib/use-authed-query";
import type { FeatureFlag, PlatformSetting } from "@/lib/types";

import styles from "./settings.module.css";

export default function SettingsPage() {
  const { callWithAuth } = useAuth();
  const flags = useAuthedQuery(useCallback((token) => adminApi.featureFlags(token), []));
  const settings = useAuthedQuery(useCallback((token) => adminApi.settings(token), []));

  const [flagModal, setFlagModal] = useState<"create" | FeatureFlag | null>(null);
  const [settingModal, setSettingModal] = useState<"create" | PlatformSetting | null>(null);

  const submitFlag = async (payload: FeatureFlagFormPayload) => {
    if (flagModal && flagModal !== "create") {
      await callWithAuth((token) =>
        adminApi.patchFeatureFlag(token, flagModal.key, {
          expected_version: flagModal.version,
          environments: payload.environments,
          enabled: payload.enabled,
          rollout_bps: payload.rollout_bps,
          allow_subjects: payload.allow_subjects,
          deny_subjects: payload.deny_subjects,
        }),
      );
    } else {
      await callWithAuth((token) => adminApi.createFeatureFlag(token, payload));
    }
    flags.reload();
  };

  const submitSetting = async (payload: {
    key: string;
    expected_version: number | null;
    value: Record<string, unknown>;
    secret: boolean;
  }) => {
    const key = settingModal && settingModal !== "create" ? settingModal.key : payload.key;
    await callWithAuth((token) =>
      adminApi.updateSetting(token, key, {
        expected_version: payload.expected_version,
        value: payload.value,
        secret: payload.secret,
      }),
    );
    settings.reload();
  };

  return (
    <AppShell title="Settings" description="Feature flags and platform-wide configuration.">
      <Section
        title="Feature flags"
        actions={
          <Button variant="gold" size="sm" onClick={() => setFlagModal("create")}>
            + New flag
          </Button>
        }
      >
        <GlassCard padding="none">
          {flags.loading ? (
            <LoadingState label="Loading feature flags…" />
          ) : flags.error ? (
            <ErrorState error={flags.error} onRetry={flags.reload} />
          ) : !flags.data || flags.data.length === 0 ? (
            <EmptyState title="No feature flags yet" detail="Create one to start a gradual rollout." />
          ) : (
            <div style={{ padding: "0.5rem 0" }}>
              <Table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Environments</th>
                    <th>Enabled</th>
                    <th>Rollout</th>
                    <th>Version</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {flags.data.map((flag) => (
                    <tr key={flag.id}>
                      <td className={tableStyles.mono}>{flag.key}</td>
                      <td>
                        <div className={styles.envTags}>
                          {flag.environments.map((env) => (
                            <span key={env} className={styles.envTag}>
                              {env}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <StatusPill label={flag.enabled ? "enabled" : "disabled"} />
                      </td>
                      <td className={styles.rollout}>{(flag.rollout_bps / 100).toFixed(1)}%</td>
                      <td className={tableStyles.muted}>v{flag.version}</td>
                      <td>
                        <div className={tableStyles.actionsCell}>
                          <Button size="sm" variant="ghost" onClick={() => setFlagModal(flag)}>
                            Edit
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
      </Section>

      <Section
        title="Platform settings"
        description="Versioned key/value configuration. Secret values are write-only."
        actions={
          <Button variant="gold" size="sm" onClick={() => setSettingModal("create")}>
            + New setting
          </Button>
        }
      >
        <GlassCard padding="none">
          {settings.loading ? (
            <LoadingState label="Loading platform settings…" />
          ) : settings.error ? (
            <ErrorState error={settings.error} onRetry={settings.reload} />
          ) : !settings.data || settings.data.length === 0 ? (
            <EmptyState title="No platform settings yet" detail="Create one to configure the platform." />
          ) : (
            <div style={{ padding: "0.5rem 0" }}>
              <Table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Secret</th>
                    <th>Version</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {settings.data.map((setting) => (
                    <tr key={setting.id}>
                      <td className={tableStyles.mono}>{setting.key}</td>
                      <td>
                        {setting.secret ? (
                          <span className={tableStyles.muted}>
                            {setting.configured ? "configured (hidden)" : "not configured"}
                          </span>
                        ) : (
                          <span className={styles.valuePreview}>
                            {JSON.stringify(setting.value ?? {})}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusPill label={setting.secret ? "secret" : "plain"} tone={setting.secret ? "violet" : "neutral"} />
                      </td>
                      <td className={tableStyles.muted}>v{setting.version}</td>
                      <td className={tableStyles.mono}>{formatDateTime(setting.created_at)}</td>
                      <td>
                        <div className={tableStyles.actionsCell}>
                          <Button size="sm" variant="ghost" onClick={() => setSettingModal(setting)}>
                            Edit
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
      </Section>

      {flagModal ? (
        <FeatureFlagModal
          existing={flagModal === "create" ? undefined : flagModal}
          onSubmit={submitFlag}
          onClose={() => setFlagModal(null)}
        />
      ) : null}

      {settingModal ? (
        <PlatformSettingModal
          existing={settingModal === "create" ? undefined : settingModal}
          onSubmit={submitSetting}
          onClose={() => setSettingModal(null)}
        />
      ) : null}
    </AppShell>
  );
}
