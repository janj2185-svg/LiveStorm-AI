/**
 * Owner local diagnostics — development gallery screen.
 * Fetches /v1/diagnostics from the API. Never displays secrets.
 */

import { useEffect, useState } from 'react';

import { Badge, Button, Surface } from '../../design-system/primitives';

type DiagPayload = {
  environment?: string;
  commit?: string | null;
  branch?: string | null;
  backend?: { ok: boolean; detail?: string };
  database?: { ok: boolean; detail?: string };
  redis?: { ok: boolean; detail?: string };
  websocket?: { ok: boolean; detail?: string; paths?: string[] };
  storage?: { ok: boolean; detail?: string };
  workers?: { ok: boolean; detail?: string };
  migrations?: { ok: boolean; version?: string | null };
  payment_provider?: { ok: boolean; detail?: string };
  configured_providers?: string[];
  missing_providers?: string[];
  gift_library?: Record<string, number | string>;
  product_loop?: {
    ok?: boolean;
    demo_handles?: number;
    issuance_txns?: number;
    published_posts?: number;
    detail?: string;
  };
  notes?: string[];
  recent_errors?: unknown[];
  failed_background_jobs?: unknown[];
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000';

function StatusRow({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  return (
    <div className="sy-diag__row">
      <span className="sy-diag__label">{label}</span>
      <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'OK' : 'DOWN / MISSING'}</Badge>
      <span className="sy-caption sy-fg-muted">{detail ?? '—'}</span>
    </div>
  );
}

export function DiagnosticsScreen() {
  const [data, setData] = useState<DiagPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/diagnostics`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setData((await res.json()) as DiagPayload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="sy-diag">
      <header className="sy-diag__head">
        <div>
          <p className="sy-eyebrow">Owner testing</p>
          <h1 className="sy-title">Diagnostics</h1>
          <p className="sy-body sy-fg-muted">
            Development-only status board. Secrets are never shown. API base:{' '}
            <code>{API_BASE}</code>
          </p>
        </div>
        <Button onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </header>

      {error ? (
        <Surface className="sy-diag__error" padding="md" role="alert">
          <strong>Could not reach diagnostics.</strong>
          <p className="sy-body">
            {error}. Start the API with <code>./start-local.sh --host</code> (or Docker Compose).
          </p>
        </Surface>
      ) : null}

      {data ? (
        <>
          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Runtime</h2>
            <p className="sy-caption">
              env <code>{data.environment}</code> · branch <code>{data.branch ?? '—'}</code> · commit{' '}
              <code>{data.commit?.slice(0, 12) ?? '—'}</code>
            </p>
            <StatusRow label="Backend" ok={data.backend?.ok} detail={data.backend?.detail} />
            <StatusRow label="Database" ok={data.database?.ok} detail={data.database?.detail} />
            <StatusRow label="Redis" ok={data.redis?.ok} detail={data.redis?.detail} />
            <StatusRow label="WebSocket" ok={data.websocket?.ok} detail={data.websocket?.detail} />
            <StatusRow label="Object storage" ok={data.storage?.ok} detail={data.storage?.detail} />
            <StatusRow label="Workers / broker" ok={data.workers?.ok} detail={data.workers?.detail} />
            <StatusRow
              label="Migrations"
              ok={data.migrations?.ok}
              detail={data.migrations?.version ?? 'none'}
            />
            <StatusRow
              label="Payment provider"
              ok={data.payment_provider?.ok}
              detail={data.payment_provider?.detail}
            />
          </Surface>

          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Providers</h2>
            <p className="sy-body">
              <strong>Configured:</strong>{' '}
              {(data.configured_providers ?? []).join(', ') || 'none'}
            </p>
            <p className="sy-body">
              <strong>Missing / not configured:</strong>{' '}
              {(data.missing_providers ?? []).join(', ') || 'none'}
            </p>
            <p className="sy-caption sy-fg-muted">
              Missing providers must return “Provider not configured” — never fake success.
            </p>
          </Surface>

          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Gift library (honest)</h2>
            <pre className="sy-diag__pre">{JSON.stringify(data.gift_library ?? {}, null, 2)}</pre>
          </Surface>

          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Product loop (Phase 1)</h2>
            <StatusRow
              label="Demo seed"
              ok={data.product_loop?.ok}
              detail={data.product_loop?.detail}
            />
            <pre className="sy-diag__pre">{JSON.stringify(data.product_loop ?? {}, null, 2)}</pre>
            <p className="sy-caption sy-fg-muted">
              Seed: <code>python3 scripts/seed_product_demo.py</code> · Verify:{' '}
              <code>./verify-product-loop.sh</code>
            </p>
          </Surface>

          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Flutter mobile client</h2>
            <p className="sy-body">
              The Flutter app under <code>apps/sylora</code> talks to this same API (no demo fixtures).
              Stripe/top-up stays fail-closed; use sandbox credits.
            </p>
            <ul className="sy-body">
              <li>
                Desktop / iOS sim: <code>./scripts/run-flutter-local.sh ios</code> →{' '}
                <code>http://127.0.0.1:8000</code>
              </li>
              <li>
                Android emulator: <code>./scripts/run-flutter-local.sh android</code> →{' '}
                <code>http://10.0.2.2:8000</code>
              </li>
              <li>
                Physical device: <code>SYLORA_LAN_IP=&lt;pc-ip&gt; ./scripts/run-flutter-local.sh device</code>
              </li>
            </ul>
            <p className="sy-caption sy-fg-muted">
              Login: <code>owner@sylora.dev</code> / <code>OwnerTest!2026Local</code> · Guide:{' '}
              <code>docs/implementation/FLUTTER_MOBILE_INTEGRATION.md</code> · Verify:{' '}
              <code>./verify-flutter-integration.sh</code>
            </p>
            <StatusRow
              label="OpenAI"
              ok={(data.configured_providers ?? []).includes('openai_api_key')}
              detail="assistant / AI routes"
            />
            <StatusRow
              label="MediaMTX"
              ok={(data.configured_providers ?? []).includes('mediamtx_control')}
              detail="live ingest control"
            />
            <StatusRow
              label="Payment"
              ok={data.payment_provider?.ok === false}
              detail="fail-closed expected (Stripe skipped)"
            />
          </Surface>

          <Surface padding="lg" className="sy-diag__card">
            <h2 className="sy-subtitle">Notes</h2>
            <ul>
              {(data.notes ?? []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Surface>
        </>
      ) : null}

      <style>{`
        .sy-diag { display: grid; gap: 1rem; padding: 1.25rem; }
        .sy-diag__head { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
        .sy-diag__row { display: grid; grid-template-columns: 9rem auto 1fr; gap: 0.75rem; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid color-mix(in oklab, var(--sy-border, #333) 60%, transparent); }
        .sy-diag__label { font-weight: 600; }
        .sy-diag__pre { font-size: 0.85rem; overflow: auto; }
        .sy-diag__card { display: grid; gap: 0.5rem; }
        .sy-diag__error { border: 1px solid color-mix(in oklab, crimson 50%, transparent); }
      `}</style>
    </div>
  );
}
