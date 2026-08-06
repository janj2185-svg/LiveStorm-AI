import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/server-api';

export async function GET() {
  const response = await apiFetch('/v1/clips/feed');
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
