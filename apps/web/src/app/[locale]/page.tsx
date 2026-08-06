import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SpectralLogo } from '@/components/SpectralLogo';
import { ApiStatus } from '@/components/ApiStatus';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const pillars = ['ai', 'live', 'creator', 'world'] as const;
  const icons: Record<(typeof pillars)[number], string> = {
    ai: '✦',
    live: '◉',
    creator: '◇',
    world: '◎',
  };

  return (
    <main className="page">
      <header className="topbar sy-glass">
        <span className="brand">SYLORA</span>
        <div className="topbar-actions">
          <ApiStatus />
          <LocaleSwitcher />
        </div>
      </header>

      <section className="hero">
        <SpectralLogo />
        <p className="motto">{t('hero.motto')}</p>
        <h1 className="headline">
          <span className="sy-gradient-text">{t('hero.headline')}</span>
        </h1>
        <p className="subhead">{t('hero.subhead')}</p>
        <div className="cta-row">
          <Link href={`/${locale}/auth/register`} className="btn btn-gold">
            {t('hero.ctaPrimary')}
          </Link>
          <Link href={`/${locale}/auth/login`} className="btn btn-glass">
            {t('hero.ctaSecondary')}
          </Link>
        </div>
        <p className="phase-note">{t('footer.phase')}</p>
      </section>

      <section className="pillars">
        {pillars.map((key) => (
          <div key={key} className="pillar sy-glass">
            <span className="pillar-icon">{icons[key]}</span>
            <span>{t(`pillars.${key}`)}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
