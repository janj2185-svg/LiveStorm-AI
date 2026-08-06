const TOKEN_KEY = "sylora.admin.access";
const API_BASE =
  process.env.NEXT_PUBLIC_SYLORA_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000/v1";

export type Json = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly detail?: string,
  ) {
    super(message);
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (!token) sessionStorage.removeItem(TOKEN_KEY);
  else sessionStorage.setItem(TOKEN_KEY, token);
}

export async function api<T = Json>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = init.token === undefined ? getStoredToken() : init.token;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: Json | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as Json;
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      String(data?.title || data?.detail || `HTTP ${response.status}`),
      response.status,
      typeof data?.code === "string" ? data.code : undefined,
      typeof data?.detail === "string" ? data.detail : undefined,
    );
  }
  return data as T;
}

export async function login(email: string, password: string) {
  const body = await api<{
    mfa_required?: boolean;
    tokens?: { access_token?: string };
    access_token?: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
  if (body.mfa_required) {
    throw new ApiError("MFA required", 401, "mfa_required", "Complete MFA in the main client first.");
  }
  const token = body.tokens?.access_token || body.access_token;
  if (!token) throw new ApiError("Missing access token", 500, "missing_token");
  storeToken(token);
  return token;
}

export async function fetchMe() {
  return api<{ email?: string; roles?: string[]; id?: string }>("/auth/me");
}

export async function fetchUsers(query = "") {
  const q = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
  return api<{ items?: Json[]; next_cursor?: string | null }>(`/admin/users${q}`);
}

export async function fetchAnalytics() {
  return api<Json>("/admin/analytics");
}

export async function fetchFlags() {
  return api<{ items?: Json[] } | Json[]>("/admin/feature-flags");
}

export async function fetchSettings() {
  return api<{ items?: Json[] } | Json>("/admin/settings");
}

export async function fetchAudit() {
  return api<{ items?: Json[] }>("/admin/audit");
}

export async function fetchHealth() {
  return api<Json>("/admin/service-health");
}

export async function fetchSecurity() {
  return api<Json>("/admin/security");
}

export function metricEntries(payload: Json | null | undefined): Array<[string, string]> {
  if (!payload) return [];
  return Object.entries(payload)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .slice(0, 12)
    .map(([key, value]) => [key, String(value)]);
}
