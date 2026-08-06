import { API_V1 } from "./config";
import type {
  AdminAnalytics,
  AdminUser,
  AdminUserDetail,
  CurrentUser,
  CursorPage,
  FeatureFlag,
  GiftRefundResponse,
  LoginResponse,
  ModerationSummary,
  OwnerCatalogResponse,
  OwnerDeployReadiness,
  PlatformSetting,
  ProblemDetails,
  SecurityDashboard,
  ServiceHealthResponse,
  TokenBundle,
  TrustSafetyReport,
  UserStatus,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly requestId: string | null;
  readonly invalidFields: string[];

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.requestId = problem.request_id ?? null;
    this.invalidFields = problem.invalid_fields ?? [];
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super(
      "Could not reach the SYLORA API. Confirm NEXT_PUBLIC_API_BASE_URL is correct and the service is running.",
    );
    this.name = "NetworkError";
    this.cause = cause;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", token, body, query, headers } = options;
  const url = `${API_V1}${path}${buildQuery(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const text = await response.text();
  const data: unknown = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    if (isProblemDetails(data)) {
      throw new ApiError(data);
    }
    throw new ApiError({
      title: response.statusText || "Request failed",
      status: response.status,
      detail:
        (data && typeof data === "object" && "detail" in data
          ? String((data as { detail?: unknown }).detail)
          : undefined) || `The API responded with HTTP ${response.status}.`,
      code: `http_${response.status}`,
    });
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    !!value &&
    typeof value === "object" &&
    "detail" in value &&
    "status" in value &&
    "code" in value
  );
}

export const authApi = {
  login: (email: string, password: string, deviceLabel: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password, device_label: deviceLabel },
    }),
  verifyTotp: (challengeToken: string, code: string, deviceLabel: string) =>
    request<TokenBundle>("/auth/totp/verify", {
      method: "POST",
      body: { challenge_token: challengeToken, code, device_label: deviceLabel },
    }),
  refresh: (refreshToken: string) =>
    request<TokenBundle>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),
  me: (token: string) => request<CurrentUser>("/auth/me", { token }),
  logout: (token: string) =>
    request<{ status: string }>("/auth/logout", { method: "POST", token }),
};

export const adminApi = {
  analytics: (token: string) => request<AdminAnalytics>("/admin/analytics", { token }),

  serviceHealth: (token: string) =>
    request<ServiceHealthResponse>("/admin/service-health", { token }),

  security: (token: string) => request<SecurityDashboard>("/admin/security", { token }),

  moderationSummary: (token: string) =>
    request<ModerationSummary>("/admin/moderation/summary", { token }),

  users: (
    token: string,
    params: { q?: string; status?: UserStatus | ""; cursor?: string | null } = {},
  ) =>
    request<CursorPage<AdminUser>>("/admin/users", {
      token,
      query: { q: params.q, status: params.status || undefined, cursor: params.cursor },
    }),

  user: (token: string, id: string) => request<AdminUserDetail>(`/admin/users/${id}`, { token }),

  suspendUser: (token: string, id: string, reason: string) =>
    request<AdminUser>(`/admin/users/${id}/suspend`, { method: "POST", token, body: { reason } }),

  restoreUser: (token: string, id: string, reason: string) =>
    request<AdminUser>(`/admin/users/${id}/restore`, { method: "POST", token, body: { reason } }),

  featureFlags: (token: string) => request<FeatureFlag[]>("/admin/feature-flags", { token }),

  createFeatureFlag: (
    token: string,
    payload: {
      key: string;
      environments: string[];
      enabled: boolean;
      rollout_bps: number;
      allow_subjects: string[];
      deny_subjects: string[];
    },
  ) =>
    request<FeatureFlag>("/admin/feature-flags", { method: "POST", token, body: payload }),

  patchFeatureFlag: (
    token: string,
    key: string,
    payload: {
      expected_version: number;
      environments?: string[];
      enabled?: boolean;
      rollout_bps?: number;
      allow_subjects?: string[];
      deny_subjects?: string[];
    },
  ) =>
    request<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
      method: "PATCH",
      token,
      body: payload,
    }),

  settings: (token: string) => request<PlatformSetting[]>("/admin/settings", { token }),

  updateSetting: (
    token: string,
    key: string,
    payload: { expected_version: number | null; value: Record<string, unknown>; secret: boolean },
  ) =>
    request<PlatformSetting>(`/admin/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      token,
      body: payload,
    }),

  ownerConfigCatalog: (token: string, environment?: string) =>
    request<OwnerCatalogResponse>("/admin/owner-config", { token, query: { environment } }),

  ownerDeployReadiness: (token: string, environment?: string) =>
    request<OwnerDeployReadiness>("/admin/owner-config/deploy-readiness", {
      token,
      query: { environment },
    }),

  refundGiftSend: (token: string, giftSendId: string, reason: string, idempotencyKey: string) =>
    request<GiftRefundResponse>(`/admin/gifts/sends/${giftSendId}/refund`, {
      method: "POST",
      token,
      body: { reason },
      headers: { "Idempotency-Key": idempotencyKey },
    }),

  refundGiftInventory: (
    token: string,
    inventoryItemId: string,
    reason: string,
    idempotencyKey: string,
  ) =>
    request<GiftRefundResponse>(`/admin/gifts/inventory/${inventoryItemId}/refund`, {
      method: "POST",
      token,
      body: { reason },
      headers: { "Idempotency-Key": idempotencyKey },
    }),
};

export const trustSafetyApi = {
  reports: (token: string, cursor?: string | null) =>
    request<CursorPage<TrustSafetyReport> & { items: TrustSafetyReport[] }>(
      "/trust-safety/reports",
      { token, query: { cursor } },
    ),

  resolve: (
    token: string,
    reportId: string,
    payload: {
      status: "resolved" | "dismissed";
      action: "none" | "warn" | "hide_content" | "suspend_user" | "remove_content";
      notes?: string;
    },
  ) =>
    request<TrustSafetyReport>(`/trust-safety/reports/${reportId}/resolve`, {
      method: "POST",
      token,
      body: payload,
    }),

  escalate: (token: string, reportId: string, notes: string) =>
    request<TrustSafetyReport>(`/trust-safety/reports/${reportId}/escalate`, {
      method: "POST",
      token,
      body: { notes },
    }),
};
