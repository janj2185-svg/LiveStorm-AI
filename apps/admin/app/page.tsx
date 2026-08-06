'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/api';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/flags', label: 'Feature flags' },
  { href: '/health', label: 'Service health' },
  { href: '/moderation', label: 'Moderation' },
];

export default function HomePage() {
  const auth = useAuth();
  const pathname = usePathname();
  const [email, setEmail] = useState('owner@sylora.dev');
  const [password, setPassword] = useState('OwnerTest!2026Local');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await auth.login(email, password);
    } catch {
      // surfaced via auth.error
    }
  }

  if (!auth.session) {
    return (
      <main className="main" style={{ maxWidth: 520, margin: '10vh auto' }}>
        <div className="panel">
          <h2 style={{ marginTop: 0, fontFamily: 'Instrument Serif, Georgia, serif' }}>
            SYLORA Admin
          </h2>
          <p className="muted">
            Sign in with an owner/admin account. API: <code>{API_BASE}</code>
          </p>
          <form
            onSubmit={onSubmit}
            className="row"
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button className="btn" type="submit" disabled={auth.busy}>
              {auth.busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {auth.error ? (
            <p className="error" style={{ marginTop: 16 }}>
              {auth.error}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <div className="shell">
      <aside className="rail">
        <h1>SYLORA</h1>
        <p>Admin · {auth.session.email}</p>
        <nav className="nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 24 }}>
          <button className="btn secondary" type="button" onClick={auth.logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        {pathname === '/' ? <Overview /> : null}
        {pathname === '/users' ? <UsersPanel /> : null}
        {pathname === '/flags' ? <FlagsPanel /> : null}
        {pathname === '/health' ? <HealthPanel /> : null}
        {pathname === '/moderation' ? <ModerationPanel /> : null}
      </main>
    </div>
  );
}

function Overview() {
  const auth = useAuth();
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const users = await auth.request<Record<string, unknown>>('/v1/admin/users?limit=1');
        const flags = await auth.request<Record<string, unknown>>('/v1/admin/feature-flags');
        const health = await auth
          .request<Record<string, unknown>>('/v1/diagnostics/summary')
          .catch(() => ({ status: 'partial' }));
        if (cancelled) return;
        setStats({
          usersTotal:
            users.total ??
            users.count ??
            (Array.isArray(users.items) ? users.items.length : '—'),
          flags: Array.isArray(flags.items)
            ? flags.items.length
            : Array.isArray(flags)
              ? flags.length
              : '—',
          health:
            (health as Record<string, unknown>).status ??
            (health as Record<string, unknown>).overall ??
            'ok',
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load overview');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Operations overview</h2>
      <p className="muted">Live data from the SYLORA FastAPI control plane.</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="grid">
        <div className="panel metric">
          <span className="muted">Users</span>
          <strong>{String(stats?.usersTotal ?? '…')}</strong>
        </div>
        <div className="panel metric">
          <span className="muted">Feature flags</span>
          <strong>{String(stats?.flags ?? '…')}</strong>
        </div>
        <div className="panel metric">
          <span className="muted">Diagnostics</span>
          <strong>{String(stats?.health ?? '…')}</strong>
        </div>
      </div>
    </>
  );
}

function UsersPanel() {
  const auth = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(
    async (query = q) => {
      setError(null);
      try {
        const path = query
          ? `/v1/admin/users?limit=50&q=${encodeURIComponent(query)}`
          : '/v1/admin/users?limit=50';
        const data = await auth.request<Record<string, unknown>>(path);
        setRows((data.items as Array<Record<string, unknown>>) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      }
    },
    [auth, q],
  );

  useEffect(() => {
    void load('');
  }, [load]);

  async function suspend(id: string) {
    await auth.request(`/v1/admin/users/${id}/suspend`, {
      method: 'POST',
      body: { reason: 'admin_console' },
    });
    await load();
  }

  async function restore(id: string) {
    await auth.request(`/v1/admin/users/${id}/restore`, {
      method: 'POST',
      body: {},
    });
    await load();
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Users</h2>
      <div className="row" style={{ marginBottom: 16 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or handle"
        />
        <button className="btn" type="button" onClick={() => void load()}>
          Search
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = String(row.id ?? '');
              const suspended = Boolean(row.suspended_at ?? row.is_suspended);
              return (
                <tr key={id}>
                  <td>{String(row.email ?? '—')}</td>
                  <td>
                    {(Array.isArray(row.roles) ? row.roles : []).map(String).join(', ') || '—'}
                  </td>
                  <td>
                    <span className={`badge ${suspended ? 'bad' : 'ok'}`}>
                      {suspended ? 'suspended' : 'active'}
                    </span>
                  </td>
                  <td>
                    {suspended ? (
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={() => void restore(id)}
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        className="btn danger"
                        type="button"
                        onClick={() => void suspend(id)}
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FlagsPanel() {
  const auth = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await auth.request<
          Record<string, unknown> | Array<Record<string, unknown>>
        >('/v1/admin/feature-flags');
        if (cancelled) return;
        setRows(
          Array.isArray(data)
            ? data
            : ((data.items as Array<Record<string, unknown>>) ?? []),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load flags');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Feature flags</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Enabled</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.key ?? row.id)}>
                <td>{String(row.key ?? '—')}</td>
                <td>
                  <span className={`badge ${row.enabled ? 'ok' : 'warn'}`}>
                    {row.enabled ? 'on' : 'off'}
                  </span>
                </td>
                <td className="muted">{String(row.description ?? row.note ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HealthPanel() {
  const auth = useAuth();
  const [payload, setPayload] = useState('Loading…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await auth.request('/v1/diagnostics/summary');
        if (!cancelled) setPayload(JSON.stringify(data, null, 2));
      } catch (err) {
        try {
          const live = await auth.request('/health/live');
          if (!cancelled) setPayload(JSON.stringify(live, null, 2));
        } catch (inner) {
          if (!cancelled) {
            setError(
              inner instanceof Error
                ? inner.message
                : err instanceof Error
                  ? err.message
                  : 'Health failed',
            );
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Service health</h2>
      {error ? <p className="error">{error}</p> : null}
      <div className="panel">
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>{payload}</pre>
      </div>
    </>
  );
}

function ModerationPanel() {
  return (
    <>
      <h2 style={{ marginTop: 0 }}>Moderation</h2>
      <div className="panel">
        <p className="muted">
          Trust &amp; safety queues are served by <code>/v1</code> trust-safety and admin report
          endpoints. Use Users → Suspend for immediate account action; deep queues remain available
          in the Flutter admin console and OpenAPI docs.
        </p>
      </div>
    </>
  );
}
