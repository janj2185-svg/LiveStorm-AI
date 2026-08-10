"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Node = { id: string; kind: string; label: string; privacy_level: string; external_id: string };
type Edge = { id: string; source_node_id: string; target_node_id: string; relation: string };

export function KnowledgePanel() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [n, e] = await Promise.all([
      fetch("/api/sylora/knowledge/nodes"),
      fetch("/api/sylora/knowledge/edges"),
    ]);
    if (!n.ok) throw new Error(await n.text());
    if (!e.ok) throw new Error(await e.text());
    setNodes(await n.json());
    setEdges(await e.json());
  }, []);

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Помилка"));
  }, [load]);

  async function onNode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/sylora/knowledge/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: String(form.get("kind")),
        external_id: String(form.get("external_id")),
        label: String(form.get("label")),
        privacy_level: String(form.get("privacy_level")),
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    e.currentTarget.reset();
    await load();
  }

  async function onEdge(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/sylora/knowledge/edges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_node_id: String(form.get("source_node_id")),
        target_node_id: String(form.get("target_node_id")),
        relation: String(form.get("relation")),
        privacy_level: "private",
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    e.currentTarget.reset();
    await load();
  }

  return (
    <>
      <section className="panel">
        <h2>Knowledge Graph</h2>
        <p className="section-intro">Permission-aware вузли під вашим ownership.</p>
        {error ? <p role="alert">{error}</p> : null}
        <form className="chat-form" onSubmit={onNode}>
          <select name="kind" className="field" defaultValue="project">
            <option value="project">project</option>
            <option value="skill">skill</option>
            <option value="company">company</option>
            <option value="document">document</option>
            <option value="agent">agent</option>
          </select>
          <input className="field" name="external_id" placeholder="external_id" required />
          <input className="field" name="label" placeholder="label" required />
          <select name="privacy_level" className="field" defaultValue="private">
            <option value="private">private</option>
            <option value="ai_only">ai_only</option>
            <option value="connections">connections</option>
            <option value="public">public</option>
          </select>
          <button className="button button-primary" type="submit">
            Додати вузол
          </button>
        </form>
        <ul className="muted-list">
          {nodes.length === 0 ? <li>Немає вузлів.</li> : null}
          {nodes.map((n) => (
            <li key={n.id}>
              <strong>{n.kind}</strong> · {n.label} · {n.privacy_level}
              <br />
              <code>{n.id}</code>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Звʼязки</h2>
        <form className="chat-form" onSubmit={onEdge}>
          <input className="field" name="source_node_id" placeholder="source node id" required />
          <input className="field" name="target_node_id" placeholder="target node id" required />
          <input className="field" name="relation" placeholder="relation" required />
          <button className="button button-secondary" type="submit">
            Додати edge
          </button>
        </form>
        <ul className="muted-list">
          {edges.length === 0 ? <li>Немає звʼязків.</li> : null}
          {edges.map((edge) => (
            <li key={edge.id}>
              {edge.source_node_id.slice(0, 8)}… —{edge.relation}→ {edge.target_node_id.slice(0, 8)}…
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
