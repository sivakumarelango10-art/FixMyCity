import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

/**
 * First line of defence for workspace routes: no session cookie, no page.
 * Role checks happen in each workspace layout (server-side, against the API),
 * and the API enforces every permission again on each request.
 * Also keeps Supabase session refreshed.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/department')) &&
    !request.cookies.has('fmc_session')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return createClient(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

