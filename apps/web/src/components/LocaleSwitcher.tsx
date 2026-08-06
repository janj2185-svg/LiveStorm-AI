'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';

const labels: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
  pl: 'Polski',
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (next: string) => {
    const segments = pathname.split('/');
    segments[1] = next;
    router.replace(segments.join('/') || `/${next}`);
  };

  return (
    <div className="locale-switcher">
      <select value={locale} onChange={(e) => onChange(e.target.value)} aria-label="Language">
        {locales.map((l) => (
          <option key={l} value={l}>
            {labels[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
