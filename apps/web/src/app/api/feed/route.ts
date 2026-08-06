import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/server-api';

export async function GET() {
  const response = await apiFetch('/v1/feed');
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(request: Request) {
  const body = await request.json();
  const response = await apiFetch('/v1/posts', { method: 'POST', body: JSON.stringify(body) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
