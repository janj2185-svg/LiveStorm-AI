'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

type AuthFormProps = {
  mode: 'login' | 'register';
  locale: string;
  labels: {
    email: string;
    password: string;
    handle: string;
    displayName: string;
    submit: string;
    submitting: string;
    switchPrompt: string;
    switchAction: string;
    errorGeneric: string;
  };
  switchHref: string;
};

export function AuthForm({ mode, locale, labels, switchHref }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload =
      mode === 'register'
        ? { email, password, handle, display_name: displayName, locale }
        : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const message =
          typeof data?.detail === 'object' && data.detail?.message
            ? data.detail.message
            : labels.errorGeneric;
        throw new Error(message);
      }
      router.push(`/${locale}/feed`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form sy-glass" onSubmit={onSubmit}>
      <label>
        <span>{labels.email}</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {mode === 'register' && (
        <>
          <label>
            <span>{labels.handle}</span>
            <input
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
            />
          </label>
          <label>
            <span>{labels.displayName}</span>
            <input
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
        </>
      )}
      <label>
        <span>{labels.password}</span>
        <input
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn btn-gold" disabled={loading}>
        {loading ? labels.submitting : labels.submit}
      </button>
      <p className="auth-switch">
        {labels.switchPrompt}{' '}
        <a href={switchHref}>{labels.switchAction}</a>
      </p>
    </form>
  );
}
