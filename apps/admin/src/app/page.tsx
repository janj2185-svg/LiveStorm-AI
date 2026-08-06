"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAnalytics,
  fetchAudit,
  fetchFlags,
  fetchHealth,
  fetchMe,
  fetchSecurity,
  fetchSettings,
  fetchUsers,
  getStoredToken,
  login,
  metricEntries,
  storeToken,
  type Json,
} from "@/lib/api";

type Section =
  | "analytics"
  | "users"
  | "flags"
  | "settings"
  | "audit"
  | "health";

const NAV: Array<{ id: Section; label: string }> = [
  { id: "analytics", label: "Analytics" },
  { id: "users", label: "Users" },
  { id: "flags", label: "Feature flags" },
  { id: "settings", label: "Settings" },
  { id: "audit", label: "Audit" },
  { id: "health", label: "Health & security" },
];

export default function AdminHomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("owner@sylora.dev");
  const [password, setPassword] = useState("OwnerTest!2026Local");
  const [me, setMe] = useState<Json | null>(null);
  const [section, setSection] = useState<Section>("analytics");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<Json[]>([]);
  const [analytics, setAnalytics] = useState<Json | null>(null);
  const [flags, setFlags] = useState<Json[]>([]);
  const [settings, setSettings] = useState<Json | null>(null);
  const [audit, setAudit] = useState<Json[]>([]);
  const [health, setHealth] = useState<Json | null>(null);
  const [security, setSecurity] = useState<Json | null>(null);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  const roles = useMemo(() => {
    const value = me?.roles;
    return Array.isArray(value) ? value.map(String) : [];
  }, [me]);

  const loadSection = useCallback(async (next: Section, search = query) => {
    setBusy(true);
    setError(null);
    try {
      if (next === "analytics") setAnalytics(await fetchAnalytics());
      if (next === "users") {
        const page = await fetchUsers(search);
        setUsers(Array.isArray(page.items) ? page.items : []);
      }
      if (next === "flags") {
        const payload = await fetchFlags();
        setFlags(Array.isArray(payload) ? payload : Array.isArray(payload.items) ? payload.items : []);
      }
      if (next === "settings") setSettings(await fetchSettings());
      if (next === "audit") {
        const page = await fetchAudit();
        setAudit(Array.isArray(page.items) ? page.items : []);
      }
      if (next === "health") {
        const [h, s] = await Promise.all([fetchHealth(), fetchSecurity()]);
        setHealth(h);
        setSecurity(s);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.detail || err.message
          : err instanceof Error
            ? err.message
            : "Request failed";
      setError(message);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        storeToken(null);
        setToken(null);
        setMe(null);
      }
    } finally {
      setBusy(false);
    }
  }, [query]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const profile = await fetchMe();
        setMe(profile as Json);
        await loadSection(section);
      } catch (err) {
        storeToken(null);
        setToken(null);
        setError(err instanceof Error ? err.message : "Session expired");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const next = await login(email.trim(), password);
      setToken(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail || err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="sy-login">
        <form className="sy-glass sy-login-card" onSubmit={onLogin}>
          <div className="sy-brand">
            <div className="sy-mark" aria-hidden />
            <div>
              <h1>SYLORA</h1>
              <p>Admin console</p>
            </div>
          </div>
          <h2>Sign in</h2>
          <p className="sy-muted">
            Uses the same FastAPI identity plane as the Flutter client. Admin
            routes require the <code>admin</code> role.
          </p>
          <label className="sy-stack">
            <span className="sy-muted">Email</span>
            <input
              className="sy-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="sy-stack">
            <span className="sy-muted">Password</span>
            <input
              className="sy-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="sy-error">{error}</p> : null}
          <button className="sy-btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Enter admin"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div className="sy-shell">
      <aside className="sy-rail">
        <div className="sy-brand">
          <div className="sy-mark" aria-hidden />
          <div>
            <h1>SYLORA</h1>
            <p>Operations</p>
          </div>
        </div>
        <nav className="sy-nav" aria-label="Admin sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={section === item.id}
              onClick={() => {
                setSection(item.id);
                void loadSection(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="sy-main">
        <div className="sy-top">
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-serif)", fontWeight: 400 }}>
              {NAV.find((item) => item.id === section)?.label}
            </h2>
            <p className="sy-muted" style={{ margin: "6px 0 0" }}>
              {String(me?.email || "signed in")} · roles {roles.join(", ") || "none"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="sy-btn secondary"
              type="button"
              onClick={() => void loadSection(section)}
              disabled={busy}
            >
              Refresh
            </button>
            <button
              className="sy-btn secondary"
              type="button"
              onClick={() => {
                storeToken(null);
                setToken(null);
                setMe(null);
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {error ? (
          <div className="sy-glass sy-card" style={{ marginBottom: 16 }}>
            <p className="sy-error" style={{ margin: 0 }}>
              {error}
            </p>
          </div>
        ) : null}

        {section === "analytics" ? (
          <div className="sy-grid">
            {metricEntries(analytics).map(([key, value]) => (
              <article key={key} className="sy-glass sy-card sy-metric">
                <strong>{value}</strong>
                <span>{key}</span>
              </article>
            ))}
            {!metricEntries(analytics).length ? (
              <article className="sy-glass sy-card">
                <p className="sy-muted">
                  {busy ? "Loading analytics…" : "No scalar analytics fields returned."}
                </p>
                {analytics ? (
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
                    {JSON.stringify(analytics, null, 2)}
                  </pre>
                ) : null}
              </article>
            ) : null}
          </div>
        ) : null}

        {section === "users" ? (
          <div className="sy-stack">
            <form
              className="sy-glass sy-card"
              style={{ display: "flex", gap: 10 }}
              onSubmit={(event) => {
                event.preventDefault();
                void loadSection("users", query);
              }}
            >
              <input
                className="sy-input"
                placeholder="Search users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="sy-btn" type="submit" disabled={busy}>
                Search
              </button>
            </form>
            <div className="sy-glass sy-card">
              <table className="sy-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const profile =
                      user.profile && typeof user.profile === "object"
                        ? (user.profile as Json)
                        : null;
                    const roleList = Array.isArray(user.roles)
                      ? user.roles.map(String).join(", ")
                      : "";
                    return (
                      <tr key={String(user.id)}>
                        <td>{String(user.email || "")}</td>
                        <td>
                          <span className="sy-pill">{String(user.status || "")}</span>
                        </td>
                        <td>{roleList}</td>
                        <td>
                          {profile
                            ? `${String(profile.display_name || "")} @${String(profile.handle || "")}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!users.length ? (
                <p className="sy-muted">{busy ? "Loading…" : "No users matched."}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {section === "flags" ? (
          <div className="sy-glass sy-card">
            <table className="sy-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Enabled</th>
                  <th>Rollout bps</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={String(flag.id || flag.key)}>
                    <td>{String(flag.key || flag.id)}</td>
                    <td>{String(flag.enabled)}</td>
                    <td>{String(flag.rollout_bps ?? "—")}</td>
                    <td>{String(flag.version ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!flags.length ? (
              <p className="sy-muted">{busy ? "Loading…" : "No feature flags."}</p>
            ) : null}
          </div>
        ) : null}

        {section === "settings" ? (
          <div className="sy-glass sy-card">
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13 }}>
              {busy && !settings
                ? "Loading…"
                : JSON.stringify(settings, null, 2)}
            </pre>
          </div>
        ) : null}

        {section === "audit" ? (
          <div className="sy-glass sy-card">
            <table className="sy-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Target</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={String(row.id)}>
                    <td>{String(row.action || row.event_type || "")}</td>
                    <td>{String(row.actor_user_id || row.actor || "—")}</td>
                    <td>
                      {String(row.target_type || "")} {String(row.target_id || "")}
                    </td>
                    <td>{String(row.created_at || "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!audit.length ? (
              <p className="sy-muted">{busy ? "Loading…" : "No audit events."}</p>
            ) : null}
          </div>
        ) : null}

        {section === "health" ? (
          <div className="sy-stack">
            <article className="sy-glass sy-card">
              <h3 style={{ marginTop: 0 }}>Service health</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {JSON.stringify(health, null, 2)}
              </pre>
            </article>
            <article className="sy-glass sy-card">
              <h3 style={{ marginTop: 0 }}>Security</h3>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {JSON.stringify(security, null, 2)}
              </pre>
            </article>
          </div>
        ) : null}
      </main>
    </div>
  );
}
