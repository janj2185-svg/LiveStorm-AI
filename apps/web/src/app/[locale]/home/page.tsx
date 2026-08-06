import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { getSessionUser } from '@/lib/session';

export default async function HomeDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <main className="page">
      <header className="topbar sy-glass">
        <Link href={`/${locale}`} className="brand">
          SYLORA
        </Link>
        <div className="topbar-actions">
          <LocaleSwitcher />
          <LogoutButton label={t('logout')} />
        </div>
      </header>

      <section className="dashboard sy-glass">
        <p className="dashboard-kicker">{t('welcome')}</p>
        <h1 className="dashboard-title">{user.display_name}</h1>
        <p className="dashboard-handle">@{user.handle}</p>
        <div className="dashboard-meta">
          <span>{user.email}</span>
          <span>
            {user.email_verified ? t('emailVerified') : t('emailUnverified')}
          </span>
        </div>
        <p className="phase-note">{t('phaseNote')}</p>
      </section>
    </main>
  );
}
