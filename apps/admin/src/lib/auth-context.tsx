"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ApiError, authApi } from "./api-client";
import { SESSION_STORAGE_KEY } from "./config";
import type { CurrentUser, TokenBundle } from "./types";

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}

export type AuthStatus = "loading" | "anonymous" | "authenticated";

export interface LoginOutcome {
  mfaRequired: boolean;
  challengeToken?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  callWithAuth: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEVICE_LABEL = "SYLORA Admin Console (Web)";

function isAdminRole(roles: string[]): boolean {
  return roles.some((role) => role === "admin" || role === "owner");
}

function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null): void {
  if (typeof window === "undefined") return;
  if (session === null) {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  // Access + refresh tokens live only in memory (via ref) and sessionStorage,
  // deliberately never in localStorage, to limit the XSS blast radius.
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored) {
      accessTokenRef.current = stored.accessToken;
      refreshTokenRef.current = stored.refreshToken;
      setUser(stored.user);
      setStatus("authenticated");
    } else {
      setStatus("anonymous");
    }
  }, []);

  const persist = useCallback((tokens: TokenBundle, nextUser: CurrentUser) => {
    accessTokenRef.current = tokens.access_token;
    refreshTokenRef.current = tokens.refresh_token;
    setUser(nextUser);
    setStatus("authenticated");
    writeStoredSession({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: nextUser,
    });
  }, []);

  const clear = useCallback(() => {
    accessTokenRef.current = null;
    refreshTokenRef.current = null;
    setUser(null);
    setStatus("anonymous");
    writeStoredSession(null);
  }, []);

  const establishSession = useCallback(
    async (tokens: TokenBundle) => {
      const currentUser = await authApi.me(tokens.access_token);
      persist(tokens, currentUser);
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<LoginOutcome> => {
      const response = await authApi.login(email, password, DEVICE_LABEL);
      if (response.mfa_required) {
        return { mfaRequired: true, challengeToken: response.challenge_token ?? undefined };
      }
      if (!response.tokens) {
        throw new Error("The API did not return session tokens.");
      }
      await establishSession(response.tokens);
      return { mfaRequired: false };
    },
    [establishSession],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string) => {
      const tokens = await authApi.verifyTotp(challengeToken, code, DEVICE_LABEL);
      await establishSession(tokens);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    const token = accessTokenRef.current;
    clear();
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        // Best-effort: the local session is already cleared regardless.
      }
    }
  }, [clear]);

  const refreshSession = useCallback(async (): Promise<string> => {
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) {
      clear();
      throw new ApiError({
        title: "Session expired",
        status: 401,
        detail: "Your session has expired. Please sign in again.",
        code: "session_expired",
      });
    }
    try {
      const tokens = await authApi.refresh(refreshToken);
      const currentUser = user ?? (await authApi.me(tokens.access_token));
      persist(tokens, currentUser);
      return tokens.access_token;
    } catch (error) {
      clear();
      throw error;
    }
  }, [clear, persist, user]);

  const callWithAuth = useCallback(
    async <T,>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      const token = accessTokenRef.current;
      if (!token) {
        throw new ApiError({
          title: "Authentication required",
          status: 401,
          detail: "Sign in to continue.",
          code: "authentication_required",
        });
      }
      try {
        return await fn(token);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const nextToken = await refreshSession();
          return await fn(nextToken);
        }
        throw error;
      }
    },
    [refreshSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAdmin: user ? isAdminRole(user.roles) : false,
      login,
      verifyMfa,
      logout,
      callWithAuth,
    }),
    [status, user, login, verifyMfa, logout, callWithAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
