import { NextRequest, NextResponse } from 'next/server';
import { apiForward } from '@/lib/api';

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad body' }, { status: 422 });
  const upstream = await apiForward('/fitness', 'PUT', body);
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
