'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { SessionUser } from '@fixmycity/shared';
import { api, ApiError } from '@/lib/api';
import { qk } from '@/lib/query-keys';

const SessionContext = React.createContext<SessionUser | null>(null);

/** Seeds the "me" query with the user the server layout already verified. */
export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const router = useRouter();
  const { data, error } = useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<SessionUser>('/api/auth/me'),
    initialData: user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  React.useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.replace('/login?expired=1');
    }
  }, [error, router]);

  return <SessionContext.Provider value={data ?? user}>{children}</SessionContext.Provider>;
}

export function useSessionUser(): SessionUser {
  const user = React.useContext(SessionContext);
  if (!user) throw new Error('useSessionUser must be used inside SessionProvider');
  return user;
}

export function useOptionalSessionUser(): SessionUser | null {
  return React.useContext(SessionContext);
}

export function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return React.useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      qc.clear();
      router.replace('/login?signedOut=1');
      router.refresh();
    }
  }, [qc, router]);
}
