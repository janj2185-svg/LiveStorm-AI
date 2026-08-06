"use client";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  StatusPill,
  useApiData,
} from "@/components/data-view";
import { formatDate, formatNumber } from "@/lib/api";

type Provider = {
  id: string;
  name: string;
  base_url: string;
  enabled: boolean;
  capabilities: string[];
  model_mapping: Record<string, string>;
  credential_configured: boolean;
};

type Usage = {
  id: string;
  provider: string;
  model: string;
  capability: string;
  prompt_units: number;
  completion_units: number;
  cost_micros: number;
  latency_ms: number;
  status: string;
  created_at: string;
};

export default function AiPage() {
  const providers = useApiData<Provider[]>("/v1/admin/ai/providers");
  const usage = useApiData<Usage[]>("/v1/admin/ai/usage?limit=100");

  const totalUnits =
    usage.data?.reduce((sum, item) => sum + item.prompt_units + item.completion_units, 0) || 0;
  const totalCost = usage.data?.reduce((sum, item) => sum + item.cost_micros, 0) || 0;

  return (
    <>
      <PageIntro>
        Provider configuration and persisted AI usage records. Credentials are never returned or
        displayed by the API.
      </PageIntro>

      <div className="statsGrid">
        <article className="statCard">
          <span className="statAccent" />
          <h2>Providers</h2>
          <p>Configured</p>
          <div className="statValue">{providers.data?.length ?? "—"}</div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>Enabled</h2>
          <p>Available for routing</p>
          <div className="statValue">
            {providers.data?.filter((item) => item.enabled).length ?? "—"}
          </div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>Usage units</h2>
          <p>Latest {usage.data?.length || 0} requests</p>
          <div className="statValue">{usage.data ? formatNumber(totalUnits) : "—"}</div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>Cost</h2>
          <p>Microunits in loaded records</p>
          <div className="statValue">{usage.data ? formatNumber(totalCost) : "—"}</div>
        </article>
      </div>

      <div className="splitGrid">
        <section>
          {providers.loading ? (
            <LoadingState label="Loading AI providers…" />
          ) : providers.error ? (
            <ErrorState
              error={providers.error}
              onRetry={providers.reload}
              unavailableLabel="AI provider status unavailable"
            />
          ) : !providers.data?.length ? (
            <EmptyState title="No AI providers configured">
              The provider administration endpoint returned an empty list.
            </EmptyState>
          ) : (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Provider registry</h2>
                  <p>GET /v1/admin/ai/providers</p>
                </div>
                <button className="secondaryButton" type="button" onClick={providers.reload}>
                  Refresh
                </button>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Capabilities</th>
                      <th>Credential</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.data.map((provider) => (
                      <tr key={provider.id}>
                        <td>
                          <div className="primaryText">{provider.name}</div>
                          <div className="muted">{provider.base_url}</div>
                        </td>
                        <td>{provider.capabilities.join(", ") || "None"}</td>
                        <td>{provider.credential_configured ? "Configured" : "Missing"}</td>
                        <td>
                          <StatusPill value={provider.enabled} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section>
          {usage.loading ? (
            <LoadingState label="Loading AI usage…" />
          ) : usage.error ? (
            <ErrorState
              error={usage.error}
              onRetry={usage.reload}
              unavailableLabel="AI usage unavailable"
            />
          ) : !usage.data?.length ? (
            <EmptyState title="No AI usage recorded">
              The usage endpoint returned no persisted request records.
            </EmptyState>
          ) : (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Recent usage</h2>
                  <p>GET /v1/admin/ai/usage</p>
                </div>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Units</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.data.slice(0, 20).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="primaryText">{item.provider}</div>
                          <div className="muted">{item.model}</div>
                        </td>
                        <td>{formatNumber(item.prompt_units + item.completion_units)}</td>
                        <td>
                          <StatusPill value={item.status} />
                        </td>
                        <td>{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
