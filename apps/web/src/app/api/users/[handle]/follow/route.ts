import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/server-api';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const response = await apiFetch(`/v1/users/${handle}/follow`, { method: 'POST' });
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
