"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Memory = {
  id: string;
  tier: string;
  content: string;
  created_at: string;
};

export function MemoryPanel() {
  const [items, setItems] = useState<Memory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sylora/personal-ai/memory");
      if (!res.ok) throw new Error(await res.text());
      setItems(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/sylora/personal-ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: String(form.get("tier")),
          content: String(form.get("content")),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      e.currentTarget.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sylora/personal-ai/memory/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  }

  async function onExport() {
    const res = await fetch("/api/sylora/personal-ai/memory/export");
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const blob = new Blob([JSON.stringify(await res.json(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sylora-memory-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <h2>Памʼять Personal AI</h2>
      <p className="section-intro">
        Короткочасна / довготривала памʼять, експорт і видалення під вашим контролем.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <div className="cta-row" style={{ marginBottom: "1rem" }}>
        <button className="button button-secondary" type="button" onClick={() => void onExport()}>
          Експортувати
        </button>
      </div>
      <form className="chat-form" onSubmit={onAdd}>
        <label>
          Tier
          <select name="tier" className="field" defaultValue="long_term">
            <option value="short_term">short_term</option>
            <option value="long_term">long_term</option>
            <option value="preference">preference</option>
            <option value="context_source">context_source</option>
          </select>
        </label>
        <label>
          Content
          <textarea name="content" required maxLength={4000} />
        </label>
        <button className="button button-primary" type="submit" disabled={busy}>
          Додати
        </button>
      </form>
      <ul className="muted-list" style={{ marginTop: "1rem" }}>
        {items.length === 0 ? <li>Порожньо — додайте перший спогад.</li> : null}
        {items.map((item) => (
          <li key={item.id}>
            <strong>[{item.tier}]</strong> {item.content}{" "}
            <button className="button button-ghost" type="button" onClick={() => void onDelete(item.id)}>
              Видалити
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
