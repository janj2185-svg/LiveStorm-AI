import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/auth-buttons";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/app");
  }
  const userLabel = session.user.name || session.user.email;

  return (
    <div className="command-shell">
      <header className="dash-header" style={{ position: "relative" }}>
        <Link className="brand-mark" href="/">
          SYLORA
        </Link>
        <div className="cta-row" style={{ alignItems: "center" }}>
          {userLabel ? <span className="pill">{userLabel}</span> : null}
          <LogoutButton />
        </div>
      </header>
      <AppNav />
      <div className="command-grid">{children}</div>
    </div>
  );
}
