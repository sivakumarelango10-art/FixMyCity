import { cookies } from 'next/headers';
import type { SessionUser } from '@fixmycity/shared';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * Server-side session lookup for layouts. Forwards the HttpOnly session cookie
 * to the API, which remains the single authority on who the user is.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get('fmc_session')?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { cookie: `fmc_session=${token}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: SessionUser };
    return json.data;
  } catch {
    return null;
  }
}
