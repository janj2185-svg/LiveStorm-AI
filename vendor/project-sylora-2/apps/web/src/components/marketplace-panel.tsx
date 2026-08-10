"use client";

import { useCallback, useEffect, useState } from "react";

type Agent = {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing: string;
  price_cents: number;
  capabilities: string[];
  permissions_required: string[];
  verified: boolean;
};

type Installed = { id: string; agent_id: string; granted_permissions: string[] };

export function MarketplacePanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, i] = await Promise.all([
      fetch("/api/sylora/marketplace/agents"),
      fetch("/api/sylora/marketplace/installed"),
    ]);
    if (!a.ok) throw new Error(await a.text());
    if (!i.ok) throw new Error(await i.text());
    setAgents(await a.json());
    setInstalled(await i.json());
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Помилка"));
  }, [load]);

  async function install(agent: Agent) {
    setBusy(agent.id);
    setError(null);
    try {
      const res = await fetch(`/api/sylora/marketplace/agents/${agent.id}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granted_permissions: agent.permissions_required }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(null);
    }
  }

  const installedIds = new Set(installed.map((x) => x.agent_id));

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <h2>AI Agent Marketplace</h2>
      <p className="section-intro">
        Каталог агентів з маніфестом, дозволами та ціноутворенням. Встановлення зберігає granted
        permissions.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="capability-list">
        {agents.map((agent) => (
          <article key={agent.id} className="panel" style={{ margin: 0 }}>
            <h3>
              {agent.name} {agent.verified ? "· verified" : ""}
            </h3>
            <p>{agent.description}</p>
            <div className="stat-row">
              <span className="pill">{agent.category}</span>
              <span className="pill">
                {agent.pricing}
                {agent.price_cents ? ` · ${(agent.price_cents / 100).toFixed(2)}` : ""}
              </span>
            </div>
            <ul className="muted-list">
              {agent.capabilities.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button
              className="button button-primary"
              type="button"
              disabled={busy === agent.id || installedIds.has(agent.id)}
              onClick={() => void install(agent)}
            >
              {installedIds.has(agent.id)
                ? "Встановлено"
                : busy === agent.id
                  ? "Встановлення…"
                  : "Встановити"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
