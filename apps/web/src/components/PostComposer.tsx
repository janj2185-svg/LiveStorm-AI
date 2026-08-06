'use client';

import { FormEvent, useState } from 'react';

type PostComposerProps = {
  placeholder: string;
  submitLabel: string;
  onPosted: () => void;
};

export function PostComposer({ placeholder, submitLabel, onPosted }: PostComposerProps) {
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), visibility: 'public' }),
      });
      if (!response.ok) throw new Error('Failed to post');
      setBody('');
      onPosted();
    } catch {
      setError('Failed to publish post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="composer sy-glass" onSubmit={onSubmit}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={5000}
      />
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="btn btn-gold" disabled={loading || !body.trim()}>
        {submitLabel}
      </button>
    </form>
  );
}
