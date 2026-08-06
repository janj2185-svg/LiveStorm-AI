import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/server-api';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const response = await apiFetch(`/v1/posts/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const response = await apiFetch(`/v1/posts/${id}/comments`);
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
