"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";

const TOKEN_KEY = "sylora.admin.access_token";

export type CurrentUser = {
  id: string;
  email: string;
  status: string;
  roles: string[];
};

type TokenSet = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type LoginResult = { mfaRequired: false } | { mfaRequired: true; challengeToken: string };

type AuthValue = {
  token: string | null;
  user: CurrentUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function persistToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AppProvider");
  return value;
}

const navigation = [
  { href: "/", label: "Overview", mark: "◌" },
  { href: "/users", label: "Users", mark: "◇" },
  { href: "/moderation", label: "Moderation", mark: "△" },
  { href: "/gifts", label: "Gifts", mark: "✦" },
  { href: "/ai", label: "AI systems", mark: "⌁" },
  { href: "/live", label: "Live", mark: "◎" },
  { href: "/settings", label: "Settings", mark: "⚙" },
];

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  "/": { eyebrow: "Command center", title: "Platform overview" },
  "/users": { eyebrow: "People", title: "User directory" },
  "/moderation": { eyebrow: "Trust & safety", title: "Moderation queue" },
  "/gifts": { eyebrow: "Economy", title: "Gift catalog" },
  "/ai": { eyebrow: "Intelligence", title: "AI systems" },
  "/live": { eyebrow: "Broadcast", title: "Live sessions" },
  "/settings": { eyebrow: "Workspace", title: "Admin settings" },
};

function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const meta = pageTitles[pathname] || pageTitles["/"];

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="SYLORA Admin home">
          <span className="brandOrb" aria-hidden="true">
            S
          </span>
          <span>
            <strong>SYLORA</strong>
            <small>ADMIN CONSOLE</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Admin navigation">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "navItem active" : "navItem"}>
                <span aria-hidden="true">{item.mark}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebarFooter">
          <span className="statusDot" />
          <div>
            <strong>Admin workspace</strong>
            <small>Live API data only</small>
          </div>
        </div>
      </aside>

      <div className="mainColumn">
        <header className="topbar">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h1>{meta.title}</h1>
          </div>
          <div className="account">
            <span className="avatar">{user?.email?.slice(0, 1).toUpperCase() || "A"}</span>
            <div>
              <strong>{user?.email || "Admin"}</strong>
              <small>{user?.roles?.join(" · ") || "Authenticated"}</small>
            </div>
            <button className="ghostButton" type="button" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  const establishSession = useCallback(async (accessToken: string) => {
    const profile = await apiFetch<CurrentUser>("/v1/auth/me", accessToken);
    persistToken(accessToken);
    setToken(accessToken);
    setUser(profile);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (!stored) {
      queueMicrotask(() => setReady(true));
      return;
    }
    apiFetch<CurrentUser>("/v1/auth/me", stored)
      .then((profile) => {
        setToken(stored);
        setUser(profile);
      })
      .catch(() => persistToken(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!token && pathname !== "/login") router.replace("/login");
    if (token && pathname === "/login") router.replace("/");
  }, [pathname, ready, router, token]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await apiFetch<{
        mfa_required: boolean;
        challenge_token?: string;
        tokens?: TokenSet;
      }>("/v1/auth/login", null, {
        method: "POST",
        body: JSON.stringify({ email, password, device_label: "SYLORA Admin" }),
      });

      if (result.mfa_required) {
        if (!result.challenge_token) throw new Error("The API did not return an MFA challenge.");
        return { mfaRequired: true, challengeToken: result.challenge_token };
      }
      if (!result.tokens?.access_token) throw new Error("The API did not return an access token.");
      await establishSession(result.tokens.access_token);
      return { mfaRequired: false };
    },
    [establishSession],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string) => {
      const tokens = await apiFetch<TokenSet>("/v1/auth/totp/verify", null, {
        method: "POST",
        body: JSON.stringify({
          challenge_token: challengeToken,
          code,
          device_label: "SYLORA Admin",
        }),
      });
      await establishSession(tokens.access_token);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    if (token) {
      await apiFetch("/v1/auth/logout", token, { method: "POST" }).catch(() => undefined);
    }
    persistToken(null);
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router, token]);

  const value = useMemo(
    () => ({ token, user, ready, login, verifyMfa, logout }),
    [login, logout, ready, token, user, verifyMfa],
  );

  if (!ready || (pathname !== "/login" && !token)) {
    return (
      <AuthContext.Provider value={value}>
        <div className="loadingScreen" role="status">
          <span className="loadingOrb">S</span>
          <p>Opening SYLORA Admin…</p>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {pathname === "/login" ? children : <AdminShell>{children}</AdminShell>}
    </AuthContext.Provider>
  );
}
