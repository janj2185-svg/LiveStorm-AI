'use client';

import { FormEvent, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export function AdminClient() {
  const [token, setToken] = useState('');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, string>>>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) setToken(data.access_token);
  }

  async function loadDashboard() {
    const headers = { Authorization: `Bearer ${token}` };
    const statsRes = await fetch(`${API}/v1/admin/stats`, { headers });
    const usersRes = await fetch(`${API}/v1/admin/users`, { headers });
    if (statsRes.ok) setStats(await statsRes.json());
    if (usersRes.ok) setUsers((await usersRes.json()).items ?? []);
  }

  if (!token) {
    return (
      <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
        <input placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Sign in</button>
      </form>
    );
  }

  return (
    <div>
      <button type="button" onClick={loadDashboard} style={{ marginBottom: 16 }}>
        Refresh dashboard
      </button>
      {stats && (
        <pre style={{ background: '#f4f7fb', padding: 16, borderRadius: 12 }}>
          {JSON.stringify(stats, null, 2)}
        </pre>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr>
            <th align="left">Handle</th>
            <th align="left">Email</th>
            <th align="left">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>@{u.handle}</td>
              <td>{u.email}</td>
              <td>{u.system_role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
