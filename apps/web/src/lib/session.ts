import { cookies } from 'next/headers';
import { fetchMe, type AuthUser } from '@/lib/api';

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('sylora_access_token')?.value;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await fetchMe(token);
  } catch {
    return null;
  }
}
