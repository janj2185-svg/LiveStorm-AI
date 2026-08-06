"use client";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageIntro,
  StatusPill,
  useApiData,
} from "@/components/data-view";
import { formatDate } from "@/lib/api";

type LiveSession = {
  id: string;
  title: string;
  state: string;
  language: string;
  started_at?: string | null;
  created_at: string;
  moderation_mode: string;
  ai_mode: string;
  destinations?: unknown[];
};

type Platform = {
  platform: string;
  available: boolean;
  status: string;
  capabilities: string[];
  limitation?: string | null;
};

export default function LivePage() {
  const sessions = useApiData<LiveSession[]>("/v1/live/sessions");
  const platforms = useApiData<Platform[]>("/v1/admin/live/platforms");

  return (
    <>
      <PageIntro>
        Sessions visible to this administrator and the live adapter registry reported by FastAPI.
        Permission errors remain visible instead of being replaced with sample sessions.
      </PageIntro>

      <div className="statsGrid">
        <article className="statCard">
          <span className="statAccent" />
          <h2>Sessions</h2>
          <p>Visible to this account</p>
          <div className="statValue">{sessions.data?.length ?? "—"}</div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>On air</h2>
          <p>State reported as live</p>
          <div className="statValue">
            {sessions.data?.filter((item) => item.state === "live").length ?? "—"}
          </div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>Platforms</h2>
          <p>Registered adapters</p>
          <div className="statValue">{platforms.data?.length ?? "—"}</div>
        </article>
        <article className="statCard">
          <span className="statAccent" />
          <h2>Available</h2>
          <p>Adapters reporting ready</p>
          <div className="statValue">
            {platforms.data?.filter((item) => item.available).length ?? "—"}
          </div>
        </article>
      </div>

      <div className="splitGrid">
        <section>
          {sessions.loading ? (
            <LoadingState label="Loading live sessions…" />
          ) : sessions.error ? (
            <ErrorState
              error={sessions.error}
              onRetry={sessions.reload}
              unavailableLabel="Live sessions unavailable"
            />
          ) : !sessions.data?.length ? (
            <EmptyState title="No live sessions">
              The live sessions endpoint returned an empty list for this account.
            </EmptyState>
          ) : (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Sessions</h2>
                  <p>GET /v1/live/sessions</p>
                </div>
                <button className="secondaryButton" type="button" onClick={sessions.reload}>
                  Refresh
                </button>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Modes</th>
                      <th>Destinations</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <div className="primaryText">{session.title}</div>
                          <div className="muted">{session.language}</div>
                        </td>
                        <td>
                          {session.ai_mode} · {session.moderation_mode}
                        </td>
                        <td>{session.destinations?.length || 0}</td>
                        <td>
                          <StatusPill value={session.state} />
                        </td>
                        <td>{formatDate(session.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section>
          {platforms.loading ? (
            <LoadingState label="Loading platform adapters…" />
          ) : platforms.error ? (
            <ErrorState
              error={platforms.error}
              onRetry={platforms.reload}
              unavailableLabel="Admin live endpoint unavailable"
            />
          ) : !platforms.data?.length ? (
            <EmptyState title="No live platforms">
              The admin live endpoint returned no platform adapters.
            </EmptyState>
          ) : (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Platforms</h2>
                  <p>GET /v1/admin/live/platforms</p>
                </div>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Capabilities</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platforms.data.map((platform) => (
                      <tr key={platform.platform}>
                        <td className="primaryText">{platform.platform}</td>
                        <td>{platform.capabilities.join(", ") || "None"}</td>
                        <td>
                          <StatusPill value={platform.available ? "available" : platform.status} />
                        </td>
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
