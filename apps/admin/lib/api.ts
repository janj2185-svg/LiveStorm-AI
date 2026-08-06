export const API_BASE =
  process.env.NEXT_PUBLIC_SYLORA_API_BASE_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000';

export type Json = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = Json>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    const detail =
      typeof data === 'object' && data && 'detail' in data
        ? String((data as Json).detail)
        : response.statusText;
    throw new ApiError(detail || 'Request failed', response.status, data);
  }
  return data as T;
}
