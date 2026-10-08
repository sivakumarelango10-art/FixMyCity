import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { destinationFor } from '@/lib/forms';
import type { Role } from '@fixmycity/shared';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  const appOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  if (errorParam) {
    const message = errorDescription || errorParam;
    return NextResponse.redirect(`${appOrigin}/login?error=${encodeURIComponent(message)}`);
  }

  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${appOrigin}/login?error=missing_code`);
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.session?.access_token || !data?.user?.email) {
      const message = exchangeError?.message || 'oauth_failed';
      return NextResponse.redirect(`${appOrigin}/login?error=${encodeURIComponent(message)}`);
    }

    const user = data.user;
    const session = data.session;
    const email = user.email;
    if (!email) {
      return NextResponse.redirect(`${appOrigin}/login?error=missing_email`);
    }

    const apiInternalUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const syncRes = await fetch(`${apiInternalUrl}/api/auth/oauth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        accessToken: session.access_token,
        email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        provider: 'google',
        providerId: user.id,
      }),
      cache: 'no-store',
    });

    if (!syncRes.ok) {
      const errJson = await syncRes.json().catch(() => ({}));
      const message = errJson?.error?.message || 'oauth_sync_failed';
      return NextResponse.redirect(`${appOrigin}/login?error=${encodeURIComponent(message)}`);
    }

    const syncData = (await syncRes.json()) as {
      data: {
        user: { role: Role; [key: string]: any };
        sessionToken: string;
        cookieName?: string;
        maxAgeMs?: number;
      };
    };

    const sessionUser = syncData.data.user;
    const sessionToken = syncData.data.sessionToken;
    const maxAgeMs = syncData.data.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000;

    // Route directly to the permitted workspace for this user's role
    const target = destinationFor(sessionUser.role, next);
    const redirectUrl = new URL(target, appOrigin);
    const response = NextResponse.redirect(redirectUrl);

    // Set the HttpOnly session cookie on the redirect response
    response.cookies.set('fmc_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(maxAgeMs / 1000),
    });

    // Also forward any Set-Cookie headers from backend response
    const setCookieHeaders = syncRes.headers.getSetCookie?.() ?? [syncRes.headers.get('set-cookie')].filter(Boolean);
    for (const h of setCookieHeaders) {
      if (h) response.headers.append('set-cookie', h);
    }

    return response;
  } catch (err: any) {
    console.error('Failed to handle OAuth callback:', err);
    return NextResponse.redirect(`${appOrigin}/login?error=oauth_sync_failed`);
  }
}
