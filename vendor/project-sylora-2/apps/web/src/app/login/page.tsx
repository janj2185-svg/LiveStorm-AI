import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginButtons } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  OAuthSignin: "Не вдалося почати вхід через провайдера.",
  OAuthCallback: "Помилка відповіді від провайдера OAuth.",
  OAuthCreateAccount: "Не вдалося створити обліковий запис.",
  Callback: "Помилка під час завершення входу.",
  AccessDenied: "Доступ відхилено.",
  Configuration: "Авторизація ще не налаштована (перевірте OAuth ключі).",
  Default: "Сталася помилка входу. Спробуйте ще раз.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session) {
    redirect("/app");
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/app";
  const error = params.error ? errorMessages[params.error] || errorMessages.Default : null;

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <Link className="brand-mark" href="/">
          SyLora
        </Link>
        <Link className="header-link" href="/">
          На головну
        </Link>
      </header>
      <main className="dash-main">
        <h1>Увійти в SyLora</h1>
        <p>Використовуйте Google або GitHub. Сесії зберігаються в PostgreSQL із захищеними cookie.</p>
        {error ? (
          <p role="alert" style={{ color: "var(--gold-soft)", marginBottom: "1.25rem" }}>
            {error}
          </p>
        ) : null}
        <LoginButtons callbackUrl={callbackUrl} />
      </main>
    </div>
  );
}
