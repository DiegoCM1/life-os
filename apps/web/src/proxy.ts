import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, sha256Hex } from '@/features/auth/auth';

// Single password gate (v1 brief: protects the public URL, nothing more).
export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/login' || path === '/api/login') {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) {
    return new NextResponse('APP_PASSWORD is not configured', { status: 500 });
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await sha256Hex(password))) {
    return NextResponse.next();
  }

  if (path.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', req.nextUrl));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
