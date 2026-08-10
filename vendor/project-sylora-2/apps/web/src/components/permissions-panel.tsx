"use client";

import { useCallback, useEffect, useState } from "react";

type Dashboard = {
  agent: {
    permissions: Record<string, boolean>;
    tool_allowlist: string[];
    context_sources: string[];
  };
  access_scopes: Record<string, unknown>;
};

type Action = {
  id: string;
  action_type: string;
  permission_level: string;
  state: string;
  confirmation_required: boolean;
};

export function PermissionsPanel() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [d, a] = await Promise.all([
      fetch("/api/sylora/personal-ai"),
      fetch("/api/sylora/actions"),
    ]);
    if (!d.ok) throw new Error(await d.text());
    if (!a.ok) throw new Error(await a.text());
    setDash(await d.json());
    setActions(await a.json());
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Помилка"));
  }, [load]);

  async function togglePermission(key: string, value: boolean) {
    if (!dash) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sylora/personal-ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: { ...dash.agent.permissions, [key]: value },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function proposeAction() {
    setBusy(true);
    try {
      const res = await fetch("/api/sylora/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "prepare_summary",
          permission_level: "REQUEST_CONFIRMATION",
          input_payload: { topic: "weekly" },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(id: string, approve: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sylora/actions/${id}/confirm?approve=${approve}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Дозволи AI</h2>
        <p className="section-intro">Архітектура permissions, не лише UI-перемикачі.</p>
        {error ? <p role="alert">{error}</p> : null}
        <ul className="muted-list">
          {Object.entries(dash?.agent.permissions ?? {}).map(([k, v]) => (
            <li key={k}>
              <label>
                <input
                  type="checkbox"
                  checked={v}
                  disabled={busy}
                  onChange={(e) => void togglePermission(k, e.target.checked)}
                />{" "}
                {k}
              </label>
            </li>
          ))}
        </ul>
        <h3>Tools</h3>
        <div className="stat-row">
          {(dash?.agent.tool_allowlist ?? []).map((t) => (
            <span key={t} className="pill">
              {t}
            </span>
          ))}
        </div>
        <h3>Context sources</h3>
        <div className="stat-row">
          {(dash?.agent.context_sources ?? []).map((t) => (
            <span key={t} className="pill">
              {t}
            </span>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Action Engine</h2>
        <p className="section-intro">
          READ → SUGGEST → PREPARE → REQUEST_CONFIRMATION → EXECUTE_ALLOWED
        </p>
        <button className="button button-secondary" type="button" disabled={busy} onClick={() => void proposeAction()}>
          Запропонувати дію (з підтвердженням)
        </button>
        <ul className="muted-list" style={{ marginTop: "1rem" }}>
          {actions.length === 0 ? <li>Немає дій.</li> : null}
          {actions.map((action) => (
            <li key={action.id}>
              <strong>{action.action_type}</strong> · {action.permission_level} · {action.state}
              {action.state === "awaiting_confirmation" ? (
                <span className="cta-row" style={{ marginTop: "0.4rem" }}>
                  <button className="button button-primary" type="button" onClick={() => void confirm(action.id, true)}>
                    Підтвердити
                  </button>
                  <button className="button button-ghost" type="button" onClick={() => void confirm(action.id, false)}>
                    Відхилити
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
