/**
 * Local Clerk mock — activated via Vite alias when VITE_LOCAL_DEV_AUTH=1.
 * Uses cookie-based /api/dev/login for API auth. Not for production.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type LocalUser = {
  id: string;
  fullName: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  imageUrl: string;
};

type AuthCtx = {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
};

type UserCtx = {
  isLoaded: boolean;
  user: LocalUser | null;
};

const AuthContext = createContext<AuthCtx>({
  isSignedIn: false,
  isLoaded: false,
  userId: null,
  getToken: async () => null,
});

const UserContext = createContext<UserCtx>({ isLoaded: false, user: null });

const FALLBACK_USER: LocalUser = {
  id: "dev_owner_clerk",
  fullName: "SYLORA Owner",
  primaryEmailAddress: { emailAddress: "kvasnytcya21@gmail.com" },
  imageUrl: "",
};

export function ClerkProvider({ children }: { children: ReactNode; publishableKey?: string; appearance?: unknown; proxyUrl?: string }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LocalUser>(FALLBACK_USER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/dev/login", { credentials: "include" });
        const me = await fetch("/api/users/me", { credentials: "include" });
        if (me.ok) {
          const data = await me.json();
          if (!cancelled) {
            setProfile({
              id: data.clerkId ?? data.clerk_id ?? FALLBACK_USER.id,
              fullName: data.displayName ?? data.display_name ?? FALLBACK_USER.fullName,
              primaryEmailAddress: {
                emailAddress: data.email ?? FALLBACK_USER.primaryEmailAddress!.emailAddress,
              },
              imageUrl: data.avatarUrl ?? data.avatar_url ?? "",
            });
          }
        }
      } catch {
        // keep fallback
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const authValue = useMemo<AuthCtx>(
    () => ({
      isSignedIn: true,
      isLoaded: ready,
      userId: profile.id,
      getToken: async () => null,
    }),
    [ready, profile.id],
  );

  const userValue = useMemo<UserCtx>(
    () => ({ isLoaded: ready, user: profile }),
    [ready, profile],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <UserContext.Provider value={userValue}>{children}</UserContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useUser() {
  return useContext(UserContext);
}

export function useClerk() {
  return {
    signOut: async () => {
      await fetch("/api/dev/logout", { credentials: "include" });
      window.location.href = "/";
    },
    addListener: (_cb: (state: { user: LocalUser | null }) => void) => () => {},
  };
}

export function Show({
  children,
  when,
}: {
  children: ReactNode;
  when?: "signed-in" | "signed-out";
  fallback?: ReactNode;
}) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (when === "signed-out") return isSignedIn ? null : <>{children}</>;
  if (when === "signed-in") return isSignedIn ? <>{children}</> : null;
  return <>{children}</>;
}

export function SignIn() {
  useEffect(() => {
    window.location.href = "/dashboard?_devMode=1";
  }, []);
  return <div className="min-h-screen flex items-center justify-center text-white">Local auth…</div>;
}

export function SignUp() {
  return <SignIn />;
}

export function publishableKeyFromHost(_host: string, key?: string) {
  return key || "pk_test_local_dev_bypass";
}
