'use client';

import type { SessionUser } from '@fixmycity/shared';
import { SessionProvider } from '@/providers/session-provider';
import { RealtimeProvider } from '@/providers/realtime-provider';
import { AppShell } from './app-shell';

export function Workspace({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <SessionProvider user={user}>
      <RealtimeProvider>
        <AppShell>{children}</AppShell>
      </RealtimeProvider>
    </SessionProvider>
  );
}
