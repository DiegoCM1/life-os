import { NextRequest, NextResponse } from 'next/server';
import { apiForwardJson } from '@/lib/api';

// Browser → Next (gate cookie checked by proxy.ts) → FastAPI (API_SECRET).
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'bad body' }, { status: 422 });
  const { status, body: out } = await apiForwardJson('/weeks', 'PUT', body);
  return NextResponse.json(out, { status });
}
