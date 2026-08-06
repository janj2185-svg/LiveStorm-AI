'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(data.message);
    if (data.dev_reset_token) setDevToken(data.dev_reset_token);
  }

  return (
    <main className="page auth-page">
      <form className="auth-form sy-glass" onSubmit={onSubmit}>
        <h1>Reset password</h1>
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {message && <p className="phase-note">{message}</p>}
        {devToken && (
          <p className="phase-note">
            Dev token:{' '}
            <Link href={`/${locale}/auth/reset?token=${devToken}`}>reset link</Link>
          </p>
        )}
        <button type="submit" className="btn btn-gold">
          Send reset link
        </button>
      </form>
    </main>
  );
}
