import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { SpectralLogo } from '@/components/SpectralLogo';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  return (
    <main className="page auth-page">
      <header className="topbar sy-glass">
        <Link href={`/${locale}`} className="brand">
          SYLORA
        </Link>
        <LocaleSwitcher />
      </header>
      <section className="auth-shell">
        <SpectralLogo size={100} />
        <h1>{t('loginTitle')}</h1>
        <AuthForm
          mode="login"
          locale={locale}
          switchHref={`/${locale}/auth/register`}
          labels={{
            email: t('email'),
            password: t('password'),
            handle: t('handle'),
            displayName: t('displayName'),
            submit: t('loginSubmit'),
            submitting: t('submitting'),
            switchPrompt: t('noAccount'),
            switchAction: t('createAccount'),
            errorGeneric: t('errorGeneric'),
          }}
        />
      </section>
    </main>
  );
}
