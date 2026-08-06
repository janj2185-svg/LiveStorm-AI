import { cookies } from 'next/headers';
import { fetchMe, type AuthUser } from '@/lib/api';

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sylora_access_token')?.value;
  if (!token) return null;
  try {
    return await fetchMe(token);
  } catch {
    return null;
  }
}
