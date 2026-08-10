"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type DevApp = {
  id: string;
  name: string;
  description: string | null;
  scopes: string[];
  api_key_prefix: string;
  api_key?: string;
  sandbox: boolean;
  created_at: string;
};

export function DeveloperPanel() {
  const [apps, setApps] = useState<DevApp[]>([]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sylora/developer/apps");
    if (!res.ok) throw new Error(await res.text());
    setApps(await res.json());
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Помилка"));
  }, [load]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreatedKey(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/sylora/developer/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name")),
        description: String(form.get("description") || ""),
        scopes: String(form.get("scopes") || "identity:read")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        sandbox: form.get("sandbox") === "on",
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const body = (await res.json()) as DevApp;
    setCreatedKey(body.api_key ?? null);
    e.currentTarget.reset();
    await load();
  }

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <h2>Developer Platform</h2>
      <p className="section-intro">
        Реєстрація застосунків, scopes і API keys (ключ показується один раз). Sandbox за
        замовчуванням.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {createdKey ? (
        <p role="status">
          Новий API key (збережіть зараз): <code>{createdKey}</code>
        </p>
      ) : null}
      <form className="chat-form" onSubmit={onCreate}>
        <input className="field" name="name" placeholder="App name" required />
        <textarea name="description" placeholder="Description" />
        <input
          className="field"
          name="scopes"
          defaultValue="identity:read,agents:read"
          placeholder="scopes comma-separated"
        />
        <label>
          <input type="checkbox" name="sandbox" defaultChecked /> Sandbox
        </label>
        <button className="button button-primary" type="submit">
          Створити застосунок
        </button>
      </form>
      <ul className="muted-list" style={{ marginTop: "1rem" }}>
        {apps.length === 0 ? <li>Ще немає зареєстрованих застосунків.</li> : null}
        {apps.map((app) => (
          <li key={app.id}>
            <strong>{app.name}</strong> · {app.api_key_prefix}… · scopes: {app.scopes.join(", ")} ·{" "}
            {app.sandbox ? "sandbox" : "production-ready flag"}
          </li>
        ))}
      </ul>
    </section>
  );
}
