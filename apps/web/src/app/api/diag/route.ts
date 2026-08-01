// GET /api/diag — "is it me or the backend?", answered in one request.
//
// Sits behind the same password gate as every other /api/ route (proxy.ts), so
// it is safe to hit from a phone when the dashboard looks wrong. It reports the
// web app's own view of its config, then probes the backend's /health/detail —
// which is what distinguishes "I forgot an env var" from "the database is down".
//
// Secrets are never echoed, only whether they are set.

import { NextResponse } from 'next/server';
import { apiDiagnostics } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await apiDiagnostics();
  // 200 even when unhealthy: the payload IS the answer, and a non-200 here would
  // just add a second thing to debug.
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
