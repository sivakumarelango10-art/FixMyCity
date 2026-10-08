'use client';

import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  SOCKET_EVENTS,
  type AnnouncementEventPayload,
  type ComplaintEventPayload,
  type NotificationEventPayload,
} from '@fixmycity/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

const RealtimeContext = React.createContext<RealtimeStatus>('connecting');
export const useRealtimeStatus = () => React.useContext(RealtimeContext);

function socketUrl() {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

/**
 * One authenticated socket per signed-in tab. Events only carry IDs; this
 * provider turns them into cache invalidations so data is always refetched
 * through the permission-checked REST API. Polling on the queries themselves
 * remains the fallback when the socket is down.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [status, setStatus] = React.useState<RealtimeStatus>('connecting');

  React.useEffect(() => {
    let hadConnected = false;
    const socket: Socket = io(socketUrl(), {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      // Called on every (re)connection attempt, so tokens are always fresh.
      auth: (cb) => {
        api
          .get<{ token: string }>('/api/auth/socket-token')
          .then(({ token }) => cb({ token }))
          .catch(() => cb({ token: '' }));
      },
    });

    const invalidateComplaint = (p: ComplaintEventPayload) => {
      qc.invalidateQueries({ queryKey: qk.complaints });
      qc.invalidateQueries({ queryKey: qk.complaint(p.complaintId) });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
      qc.invalidateQueries({ queryKey: ['department'] });
      qc.invalidateQueries({ queryKey: ['public'] });
    };

    socket.on('connect', () => {
      setStatus('live');
      // After a drop, refetch anything that may have changed while offline.
      if (hadConnected) qc.invalidateQueries();
      hadConnected = true;
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));

    socket.on(SOCKET_EVENTS.COMPLAINT_CREATED, invalidateComplaint);
    socket.on(SOCKET_EVENTS.COMPLAINT_ASSIGNED, invalidateComplaint);
    socket.on(SOCKET_EVENTS.COMPLAINT_STATUS_CHANGED, invalidateComplaint);
    socket.on(SOCKET_EVENTS.COMPLAINT_RESOLVED, invalidateComplaint);
    socket.on(SOCKET_EVENTS.COMPLAINT_UPDATED, invalidateComplaint);
    socket.on(SOCKET_EVENTS.BILL_PAID, () => {
      qc.invalidateQueries({ queryKey: qk.bills });
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    });
    socket.on(SOCKET_EVENTS.NOTIFICATION_CREATED, (n: NotificationEventPayload) => {
      qc.invalidateQueries({ queryKey: qk.notifications });
      toast(n.title, {
        description: n.message,
        action: n.link ? { label: 'Open', onClick: () => router.push(n.link!) } : undefined,
      });
    });
    socket.on(SOCKET_EVENTS.ANNOUNCEMENT_PUBLISHED, (a: AnnouncementEventPayload) => {
      qc.invalidateQueries({ queryKey: qk.announcements });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      toast('New city announcement', { description: a.title });
    });

    // Connect on the next tick: React StrictMode mounts effects twice in development, and the
    // first (immediately unmounted) instance should never open a connection.
    const start = setTimeout(() => socket.connect(), 0);

    return () => {
      clearTimeout(start);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [qc, router]);

  return <RealtimeContext.Provider value={status}>{children}</RealtimeContext.Provider>;
}
