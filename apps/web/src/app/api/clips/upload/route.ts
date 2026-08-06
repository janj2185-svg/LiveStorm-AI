import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/server-api';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  const title = form.get('title');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ detail: 'file required' }, { status: 400 });
  }

  const body = new FormData();
  body.append('file', file, 'clip.mp4');
  if (typeof title === 'string') body.append('title', title);

  const tokenResponse = await apiFetch('/v1/media/upload/clip', {
    method: 'POST',
    body,
    headers: {},
  });
  const data = await tokenResponse.json();
  return NextResponse.json(data, { status: tokenResponse.status });
}
