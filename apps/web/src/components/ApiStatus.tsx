'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export function ApiStatus() {
  const t = useTranslations('status');
  const [state, setState] = useState<'checking' | 'ok' | 'err'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/v1/health`)
      .then((r) => (r.ok ? 'ok' : 'err'))
      .catch(() => 'err')
      .then((s) => {
        if (!cancelled) setState(s as 'ok' | 'err');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    state === 'checking' ? t('checking') : state === 'ok' ? t('online') : t('offline');

  return (
    <div className="status" title={API_URL}>
      <span
        className={`status-dot status-dot--${state === 'ok' ? 'ok' : 'err'}`}
        aria-hidden
      />
      <span>
        {t('apiLabel')}: {label}
      </span>
    </div>
  );
}
