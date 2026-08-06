'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type Clip = { id: string; url: string; title: string };

export function ClipsViewer({ emptyLabel }: { emptyLabel: string }) {
  const params = useParams();
  const locale = params.locale as string;
  const [clips, setClips] = useState<Clip[]>([]);
  const [index, setIndex] = useState(0);

  const load = useCallback(async () => {
    const response = await fetch('/api/clips/feed');
    if (response.ok) {
      const data = await response.json();
      setClips(data.items ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (clips.length === 0) {
    return (
      <div className="clips-empty sy-glass">
        <p>{emptyLabel}</p>
        <Link href={`/${locale}/clips/upload`} className="btn btn-gold">
          Upload clip
        </Link>
      </div>
    );
  }

  const clip = clips[index];

  return (
    <div className="clips-viewer">
      <video
        key={clip.id}
        src={clip.url}
        controls
        autoPlay
        playsInline
        className="clip-video"
      />
      {clip.title && <p className="clip-title">{clip.title}</p>}
      <div className="clip-nav">
        <button
          type="button"
          className="btn btn-glass"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-glass"
          disabled={index >= clips.length - 1}
          onClick={() => setIndex((i) => Math.min(clips.length - 1, i + 1))}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
