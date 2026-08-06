import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(`${API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  const cookieStore = await cookies();
  cookieStore.set('sylora_access_token', data.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: data.expires_in,
  });
  cookieStore.set('sylora_refresh_token', data.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json(data);
}
