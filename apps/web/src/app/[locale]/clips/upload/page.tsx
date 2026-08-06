'use client';

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ClipUploadPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    try {
      const response = await fetch('/api/clips/upload', { method: 'POST', body: form });
      if (!response.ok) throw new Error('Upload failed');
      router.push(`/${locale}/clips`);
      router.refresh();
    } catch {
      setError('Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <form className="auth-form sy-glass" onSubmit={onSubmit}>
        <h1>Upload SYLORA Clip</h1>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </label>
        <label>
          Video (MP4/WebM)
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-gold" disabled={loading || !file}>
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </main>
  );
}
