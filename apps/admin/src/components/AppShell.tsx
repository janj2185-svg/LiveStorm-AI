"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";

import { Button } from "./Button";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "◆" },
  { href: "/users", label: "Users", icon: "☺" },
  { href: "/moderation", label: "Moderation", icon: "⚑" },
  { href: "/gifts", label: "Gifts", icon: "❋" },
  { href: "/settings", label: "Settings", icon: "⚙" },
  { href: "/integrations", label: "Integrations", icon: "⬢" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <div className={styles.railInner}>
          <div className={styles.brand}>
            <span className={styles.mark} aria-hidden>
              S
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandTitle}>SYLORA</span>
              <span className={styles.brandSub}>Admin Console</span>
            </span>
          </div>
          <nav className={styles.nav}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[styles.link, isActive(pathname, item.href) ? styles.linkActive : ""].join(
                  " ",
                )}
              >
                <span className={styles.linkIcon} aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.footer}>
            <div className={styles.identity}>
              <span className={styles.identityEmail}>{user?.email ?? "—"}</span>
              <span className={styles.identityRole}>{user?.roles.join(", ") || "no role"}</span>
            </div>
            <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className={styles.mobileTopbar}>
        <div className={styles.mobileBar}>
          <span className={styles.brandTitle}>SYLORA Admin</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
        <nav className={styles.mobileNav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                styles.mobileNavLink,
                isActive(pathname, item.href) ? styles.mobileNavLinkActive : "",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            {description ? <p className={styles.pageDescription}>{description}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
