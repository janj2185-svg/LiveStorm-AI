/**
 * Live API probe for design-gallery screens that still use demo fixtures.
 * Does not replace fixture UI — only proves the local FastAPI path works.
 */

import { useState } from 'react';

import { Badge, Button, Surface } from '../../design-system/primitives';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000';

const SEED = {
  email: 'owner@sylora.dev',
  password: 'OwnerTest!2026Local',
} as const;

export type LiveProbeKind = 'auth' | 'feed' | 'wallet';

type ProbeResult = {
  ok: boolean;
  summary: string;
};

async function login(): Promise<{ token: string } | { error: string }> {
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(SEED),
  });
  if (!res.ok) {
    return { error: `login HTTP ${res.status}` };
  }
  const data = (await res.json()) as { tokens?: { access_token?: string } };
  const token = data.tokens?.access_token;
  if (!token) {
    return { error: 'login ok but no access_token' };
  }
  return { token };
}

async function runProbe(kind: LiveProbeKind): Promise<ProbeResult> {
  try {
    if (kind === 'auth') {
      const logged = await login();
      if ('error' in logged) {
        return { ok: false, summary: logged.error };
      }
      const me = await fetch(`${API_BASE}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${logged.token}` },
      });
      if (!me.ok) {
        return { ok: false, summary: `/auth/me HTTP ${me.status}` };
      }
      const body = (await me.json()) as { email?: string };
      return { ok: true, summary: `login + me ok (${body.email ?? 'user'})` };
    }

    const logged = await login();
    if ('error' in logged) {
      return { ok: false, summary: logged.error };
    }
    const headers = { Authorization: `Bearer ${logged.token}` };

    if (kind === 'feed') {
      for (const path of ['/v1/social/feed', '/v1/social/posts']) {
        const res = await fetch(`${API_BASE}${path}`, { headers });
        if (res.ok) {
          const data = (await res.json()) as { items?: unknown[] } | unknown[];
          const count = Array.isArray(data)
            ? data.length
            : (data.items?.length ?? 0);
          return { ok: true, summary: `${path} ≈${count} items` };
        }
      }
      return { ok: false, summary: 'feed/posts unreachable' };
    }

    const bal = await fetch(`${API_BASE}/v1/wallet/balance`, { headers });
    if (!bal.ok) {
      return { ok: false, summary: `wallet HTTP ${bal.status}` };
    }
    const body = (await bal.json()) as { spendable_minor?: number };
    return {
      ok: true,
      summary: `spendable_minor=${body.spendable_minor ?? 0}`,
    };
  } catch (err) {
    return {
      ok: false,
      summary: err instanceof Error ? err.message : String(err),
    };
  }
}

const LABELS: Record<LiveProbeKind, string> = {
  auth: 'Live login probe',
  feed: 'Live feed probe',
  wallet: 'Live wallet probe',
};

export function LiveProbePanel({ kind }: { kind: LiveProbeKind }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  async function onRun() {
    setLoading(true);
    setResult(null);
    const next = await runProbe(kind);
    setResult(next);
    setLoading(false);
  }

  return (
    <Surface className="sy-live-probe" padding="md" elevation="flat" radius="lg">
      <div className="sy-live-probe__row">
        <div>
          <p className="sy-caption sy-fg-muted">Owner testing · {API_BASE}</p>
          <p className="sy-label">{LABELS[kind]}</p>
          <p className="sy-caption sy-fg-quiet">
            Fixture UI above stays demo. This button hits the real local API with seeded
            credentials.
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => void onRun()}>
          {loading ? 'Probing…' : 'Run live probe'}
        </Button>
      </div>
      {result ? (
        <div className="sy-live-probe__result">
          <Badge tone={result.ok ? 'success' : 'danger'} variant="soft">
            {result.ok ? 'Live OK' : 'Live FAIL'}
          </Badge>
          <span className="sy-caption sy-fg-muted">{result.summary}</span>
        </div>
      ) : null}
      <style>{`
        .sy-live-probe { margin-top: 1rem; display: grid; gap: 0.75rem; border: 1px dashed color-mix(in oklab, var(--sy-border, #444) 80%, transparent); }
        .sy-live-probe__row { display: flex; gap: 1rem; justify-content: space-between; align-items: start; flex-wrap: wrap; }
        .sy-live-probe__result { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
      `}</style>
    </Surface>
  );
}
