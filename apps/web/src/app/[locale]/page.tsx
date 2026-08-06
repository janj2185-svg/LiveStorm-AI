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
          <button type="button" className="btn btn-gold" disabled title="Phase 1">
            {t('hero.ctaPrimary')}
          </button>
          <button type="button" className="btn btn-glass" disabled title="Phase 1">
            {t('hero.ctaSecondary')}
          </button>
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
