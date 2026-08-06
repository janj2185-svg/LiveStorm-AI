'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function ResetPasswordForm() {
  const params = useParams();
  const search = useSearchParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = search.get('token');
    if (!token) {
      setError('Missing reset token');
      return;
    }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (!response.ok) {
      setError('Reset failed');
      return;
    }
    router.push(`/${locale}/auth/login`);
  }

  return (
    <main className="page auth-page">
      <form className="auth-form sy-glass" onSubmit={onSubmit}>
        <h1>New password</h1>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-gold">
          Update password
        </button>
      </form>
    </main>
  );
}
