import { useEffect, useState, type FormEvent } from "react";
import {
  configuredLauncherOrigins,
  listenForLauncherSession,
  type LauncherSession
} from "./auth";

interface AuthEntryProps {
  onSession: (session: LauncherSession) => void;
  externalError?: string;
}

export function AuthEntry({ onSession, externalError }: AuthEntryProps) {
  const [apiBase, setApiBase] = useState("");
  const [token, setToken] = useState("");
  const [definitionId, setDefinitionId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [error, setError] = useState("");
  const [origins, setOrigins] = useState<string[]>([]);

  useEffect(() => {
    try {
      const allowed = configuredLauncherOrigins();
      setOrigins(allowed);
      return listenForLauncherSession(allowed, onSession);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Launcher configuration is invalid");
    }
  }, [onSession]);

  const connect = (event: FormEvent) => {
    event.preventDefault();
    try {
      const session: LauncherSession = {
        apiBase,
        token,
        ...(definitionId.trim() ? { definitionId: definitionId.trim() } : {}),
        ...(versionId.trim() ? { versionId: versionId.trim() } : {})
      };
      onSession(session);
      setToken("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <div className="brand-mark" aria-hidden="true">S</div>
        <span className="eyebrow">SYLORA creator systems</span>
        <h1>Gift Studio</h1>
        <p>Author strict, verified gift experiences. Content and delivery remain separate: this Studio never simulates a purchase, send, or ledger event.</p>
        <div className="security-note">
          <span>Session security</span>
          <p>Tokens stay in memory. Closing or refreshing this tab removes the session.</p>
        </div>
      </section>
      <section className="auth-panel" aria-labelledby="connect-heading">
        <span className="eyebrow">Secure entry</span>
        <h2 id="connect-heading">Connect to authoring</h2>
        {origins.length > 0 ? (
          <p className="launcher-state"><span className="pulse" /> Waiting for a trusted launcher handshake from {origins.join(", ")}</p>
        ) : (
          <p className="notice">No trusted launcher origins are configured. Manual developer entry remains available.</p>
        )}
        <div className="divider"><span>or use a developer session</span></div>
        <form onSubmit={connect}>
          <label>API base URL
            <input type="url" required placeholder="https://api.your-deployment.example" value={apiBase} onChange={(event) => setApiBase(event.target.value)} autoComplete="url" />
          </label>
          <label>One-time bearer token
            <input type="password" required value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" />
          </label>
          <div className="form-row">
            <label>Definition ID <span>optional</span>
              <input value={definitionId} onChange={(event) => setDefinitionId(event.target.value)} autoComplete="off" />
            </label>
            <label>Version ID <span>optional</span>
              <input value={versionId} onChange={(event) => setVersionId(event.target.value)} autoComplete="off" />
            </label>
          </div>
          <p className="field-hint">Optional launcher IDs are fetched immediately with their real definition, versions, manifest, and asset records.</p>
          {(error || externalError) && <p className="field-error" role="alert">{error || externalError}</p>}
          <button className="primary auth-submit" type="submit">Open Studio</button>
        </form>
      </section>
    </main>
  );
}
