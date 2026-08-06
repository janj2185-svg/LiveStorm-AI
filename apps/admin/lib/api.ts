export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_SYLORA_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(payload: unknown, fallback: string): { message: string; code?: string } {
  if (!payload || typeof payload !== "object") return { message: fallback };

  const body = payload as Record<string, unknown>;
  const error =
    body.error && typeof body.error === "object"
      ? (body.error as Record<string, unknown>)
      : body;
  const detail = error.detail;

  if (typeof detail === "string") {
    return { message: detail, code: typeof error.code === "string" ? error.code : undefined };
  }
  if (typeof error.message === "string") {
    return {
      message: error.message,
      code: typeof error.code === "string" ? error.code : undefined,
    };
  }
  if (typeof error.title === "string") {
    return { message: error.title, code: typeof error.code === "string" ? error.code : undefined };
  }
  return { message: fallback, code: typeof error.code === "string" ? error.code : undefined };
}

export async function apiFetch<T>(
  path: string,
  token?: string | null,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(`Could not reach the SYLORA API at ${API_BASE_URL}.`, 0, "network_error");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const parsed = errorMessage(payload, `API request failed with status ${response.status}.`);
    throw new ApiError(parsed.message, response.status, parsed.code);
  }

  return payload as T;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function formatNumber(value: unknown): string {
  return typeof value === "number" ? new Intl.NumberFormat("en").format(value) : "0";
}
