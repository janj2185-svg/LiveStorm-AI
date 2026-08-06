import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { SpectralLogo } from '@/components/SpectralLogo';

export default async function RegisterPage({
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
        <h1>{t('registerTitle')}</h1>
        <AuthForm
          mode="register"
          locale={locale}
          switchHref={`/${locale}/auth/login`}
          labels={{
            email: t('email'),
            password: t('password'),
            handle: t('handle'),
            displayName: t('displayName'),
            submit: t('registerSubmit'),
            submitting: t('submitting'),
            switchPrompt: t('hasAccount'),
            switchAction: t('signIn'),
            errorGeneric: t('errorGeneric'),
          }}
        />
      </section>
    </main>
  );
}
