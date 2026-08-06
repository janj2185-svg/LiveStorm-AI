import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('sylora_refresh_token')?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  cookieStore.delete('sylora_access_token');
  cookieStore.delete('sylora_refresh_token');
  return new NextResponse(null, { status: 204 });
}
