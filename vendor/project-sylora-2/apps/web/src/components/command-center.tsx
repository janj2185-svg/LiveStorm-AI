"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { LivingAvatar } from "@/components/living-avatar";

type Reaction = "idle" | "listen" | "talk" | "smile" | "wave" | "nod" | "think";

type Dashboard = {
  agent: {
    display_name: string;
    locale: string;
    permissions: Record<string, boolean>;
    tool_allowlist: string[];
    context_sources: string[];
  };
  what_ai_knows: string[];
  access_scopes: Record<string, unknown>;
  recent_activity: Array<{
    id: string;
    event_type: string;
    summary: string;
    rationale: string | null;
    data_used: string[];
    created_at: string;
  }>;
  memory_counts: Record<string, number>;
  emotion: { label?: string; laughter_ready?: boolean };
};

type ChatItem = { role: "user" | "assistant"; content: string; provider?: string };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`/api/sylora${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function CommandCenter() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reaction, setReaction] = useState<Reaction>("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api("/personal-ai")) as Dashboard;
      setDash(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити Personal AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setReaction("listen");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    try {
      const data = await api("/personal-ai/chat", {
        method: "POST",
        body: JSON.stringify({ content, locale: "uk" }),
      });
      setReaction(data.emotion?.laughter_ready ? "smile" : "talk");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, provider: data.provider },
      ]);
      await load();
      window.setTimeout(() => setReaction("idle"), 2200);
    } catch (err) {
      setReaction("think");
      setError(err instanceof Error ? err.message : "Помилка чату");
    } finally {
      setSending(false);
    }
  }

  if (loading && !dash) {
    return (
      <section className="panel">
        <h2>Command Center</h2>
        <p className="section-intro">Завантаження вашого Personal AI…</p>
      </section>
    );
  }

  if (error && !dash) {
    return (
      <section className="panel">
        <h2>Command Center</h2>
        <p role="alert">{error}</p>
        <button className="button button-secondary" type="button" onClick={() => void load()}>
          Спробувати знову
        </button>
      </section>
    );
  }

  return (
    <>
      <aside className="panel">
        <LivingAvatar variant="stage" reaction={reaction} />
        <h2 style={{ marginTop: "1rem" }}>{dash?.agent.display_name ?? "Sylora"}</h2>
        <p className="section-intro" style={{ marginBottom: "0.75rem" }}>
          Один Personal AI. Одна памʼять. Різні контексти.
        </p>
        <div className="stat-row">
          {Object.entries(dash?.memory_counts ?? {}).map(([k, v]) => (
            <span key={k} className="pill">
              {k}: {v}
            </span>
          ))}
        </div>
        <h3 style={{ marginTop: "1rem" }}>Що AI знає</h3>
        <ul className="muted-list">
          {(dash?.what_ai_knows ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3>Доступ</h3>
        <ul className="muted-list">
          {Object.entries(dash?.agent.permissions ?? {}).map(([k, v]) => (
            <li key={k}>
              {k}: {v ? "дозволено" : "заборонено"}
            </li>
          ))}
        </ul>
      </aside>

      <section className="panel">
        <h2>Розмова з Sylora</h2>
        {error ? (
          <p role="alert" style={{ color: "#f0b4a0" }}>
            {error}
          </p>
        ) : null}
        <div className="chat-log" aria-live="polite">
          {messages.length === 0 ? (
            <p className="section-intro">Напишіть щось — Sylora відповість живо й по суті.</p>
          ) : (
            messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`bubble ${m.role === "user" ? "bubble--user" : ""}`}>
                <strong>{m.role === "user" ? "Ви" : "Sylora"}</strong>
                <p style={{ margin: "0.35rem 0 0" }}>{m.content}</p>
                {m.provider ? (
                  <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.8rem" }}>
                    provider: {m.provider}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
        <form className="chat-form" onSubmit={onSend}>
          <label className="sr-only" htmlFor="sylora-chat">
            Повідомлення
          </label>
          <textarea
            id="sylora-chat"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Привіт, Sylora…"
            disabled={sending}
          />
          <button className="button button-primary" type="submit" disabled={sending || !input.trim()}>
            {sending ? "Думає…" : "Надіслати"}
          </button>
        </form>

        <h3 style={{ marginTop: "1.5rem" }}>Журнал активності</h3>
        {(dash?.recent_activity ?? []).length === 0 ? (
          <p className="section-intro">Поки немає дій.</p>
        ) : (
          <ul className="muted-list">
            {dash!.recent_activity.map((a) => (
              <li key={a.id}>
                <strong>{a.summary}</strong>
                {a.rationale ? ` — ${a.rationale}` : ""}
                {a.data_used?.length ? ` · дані: ${a.data_used.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
