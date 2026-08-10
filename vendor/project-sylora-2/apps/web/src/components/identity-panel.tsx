"use client";

import { FormEvent, useEffect, useState } from "react";

type Identity = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  privacy_level: string;
  skills: string[];
  interests: string[];
};

const PRIVACY = ["public", "followers", "connections", "business", "private", "ai_only"];

export function IdentityPanel() {
  const [data, setData] = useState<Identity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/sylora/identity");
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as Identity;
        setData(json);
        setSkills((json.skills ?? []).join(", "));
        setInterests((json.interests ?? []).join(", "));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Помилка");
      }
    })();
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/sylora/identity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(form.get("username") || "") || null,
          display_name: String(form.get("display_name") || "") || null,
          bio: String(form.get("bio") || "") || null,
          privacy_level: String(form.get("privacy_level")),
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          interests: interests
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  }

  if (!data && !error) {
    return (
      <section className="panel">
        <h2>Identity</h2>
        <p>Завантаження…</p>
      </section>
    );
  }

  return (
    <section className="panel" style={{ gridColumn: "1 / -1" }}>
      <h2>SYLORA Identity</h2>
      <p className="section-intro">
        Цифрова ідентичність з рівнями конфіденційності — не просто сторінка профілю.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {data ? (
        <form className="chat-form" onSubmit={onSave}>
          <label>
            Username
            <input name="username" defaultValue={data.username ?? ""} className="field" />
          </label>
          <label>
            Display name
            <input name="display_name" defaultValue={data.display_name ?? ""} className="field" />
          </label>
          <label>
            Bio
            <textarea name="bio" defaultValue={data.bio ?? ""} />
          </label>
          <label>
            Privacy level
            <select name="privacy_level" defaultValue={data.privacy_level} className="field">
              {PRIVACY.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            Skills (comma-separated)
            <input className="field" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <label>
            Interests (comma-separated)
            <input
              className="field"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />
          </label>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? "Збереження…" : "Зберегти Identity"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
