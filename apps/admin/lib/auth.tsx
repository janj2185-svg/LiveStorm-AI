'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, type Json } from './api';

type Session = {
  accessToken: string;
  refreshToken: string;
  email: string;
  roles: string[];
};

type AuthContextValue = {
  session: Session | null;
  busy: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  request: <T = Json>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'sylora.admin.session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = useCallback((next: Session | null) => {
    setSession(next);
    if (next) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      setError(null);
      try {
        const tokens = await apiRequest<Json>('/v1/auth/login', {
          body: { email, password },
        });
        if (tokens.mfa_required === true) {
          throw new Error('MFA challenge required — complete TOTP in the Flutter client first');
        }
        const nested =
          typeof tokens.tokens === 'object' && tokens.tokens
            ? (tokens.tokens as Json)
            : tokens;
        const accessToken = String(nested.access_token ?? tokens.access_token ?? '');
        const refreshToken = String(nested.refresh_token ?? tokens.refresh_token ?? '');
        if (!accessToken) throw new Error('Login response missing access token');
        const me = await apiRequest<Json>('/v1/users/me', { token: accessToken });
        const user = (typeof me.user === 'object' && me.user ? (me.user as Json) : me);
        const roles = Array.isArray(user.roles)
          ? user.roles.map(String)
          : Array.isArray(me.roles)
            ? me.roles.map(String)
            : [];
        if (!roles.includes('admin') && !roles.includes('owner')) {
          throw new Error('Admin or owner role required');
        }
        persist({
          accessToken,
          refreshToken,
          email: String(user.email ?? me.email ?? email),
          roles,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
        persist(null);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
    setError(null);
  }, [persist]);

  const request = useCallback(
    async <T = Json>(path: string, init?: { method?: string; body?: unknown }) => {
      if (!session?.accessToken) throw new Error('Not authenticated');
      return apiRequest<T>(path, { ...init, token: session.accessToken });
    },
    [session],
  );

  const value = useMemo(
    () => ({ session, busy, error, login, logout, request }),
    [session, busy, error, login, logout, request],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
