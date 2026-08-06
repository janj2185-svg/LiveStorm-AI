import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipsViewer } from '@/components/ClipsViewer';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { LogoutButton } from '@/components/LogoutButton';
import { getSessionUser } from '@/lib/session';

export default async function ClipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('clips');
  const tHome = await getTranslations('home');
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/auth/login`);

  return (
    <main className="page clips-page">
      <header className="topbar sy-glass">
        <Link href={`/${locale}/feed`} className="brand">
          SYLORA
        </Link>
        <div className="topbar-actions">
          <Link href={`/${locale}/clips/upload`} className="btn btn-glass">
            {t('upload')}
          </Link>
          <LocaleSwitcher />
          <LogoutButton label={tHome('logout')} />
        </div>
      </header>
      <ClipsViewer emptyLabel={t('empty')} />
    </main>
  );
}
