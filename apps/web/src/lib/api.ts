const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export type AuthUser = {
  id: string;
  email: string;
  email_verified: boolean;
  handle: string;
  display_name: string;
  locale: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
  dev_verification_token?: string | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data?.detail === 'object' && data.detail?.message
        ? data.detail.message
        : typeof data?.detail === 'string'
          ? data.detail
          : 'Request failed';
    throw new Error(message);
  }
  return data as T;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  handle: string;
  display_name: string;
  locale: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<AuthResponse>(response);
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<AuthResponse>(response);
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseJson<AuthUser>(response);
}
