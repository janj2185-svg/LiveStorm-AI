import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FeedView } from '@/components/FeedView';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { NotificationBell } from '@/components/NotificationBell';
import { getAccessToken, getSessionUser } from '@/lib/session';

export default async function FeedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('feed');
  const tHome = await getTranslations('home');
  const user = await getSessionUser();
  const accessToken = await getAccessToken();
  if (!user) redirect(`/${locale}/auth/login`);

  return (
    <main className="page feed-page">
      <header className="topbar sy-glass">
        <Link href={`/${locale}`} className="brand">
          SYLORA
        </Link>
        <div className="topbar-actions">
        <Link href={`/${locale}/clips`} className="btn btn-glass">
          {t('clipsLink')}
        </Link>
          <NotificationBell label={t('notifications')} accessToken={accessToken} />
          <LocaleSwitcher />
          <LogoutButton label={tHome('logout')} />
        </div>
      </header>

      <section className="feed-header">
        <h1>{t('title')}</h1>
        <p className="subhead">{t('subtitle', { name: user.display_name })}</p>
      </section>

      <FeedView
        labels={{
          composePlaceholder: t('composePlaceholder'),
          publish: t('publish'),
          empty: t('empty'),
          like: t('like'),
          comment: t('comment'),
          follow: t('follow'),
          commentPlaceholder: t('commentPlaceholder'),
          submitComment: t('submitComment'),
        }}
      />
    </main>
  );
}
