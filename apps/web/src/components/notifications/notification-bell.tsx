'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Checks } from '@phosphor-icons/react';
import type { NotificationDto } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { EmptyState, Popover, PopoverClose, PopoverContent, PopoverTrigger, Skeleton } from '@/components/ui/primitives';
import { notificationsPathForRole } from '@/components/layout/nav-config';
import { useSessionUser } from '@/providers/session-provider';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, timeAgo } from '@/lib/utils';
import { NOTIFICATION_ICONS } from './notification-icons';

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: () => api.get<{ count: number }>('/api/notifications/unread-count'),
    refetchInterval: 45_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function NotificationRow({ n, onOpen }: { n: NotificationDto; onOpen?: (n: NotificationDto) => void }) {
  const Icon = NOTIFICATION_ICONS[n.type];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(n)}
      className={cn('flex w-full gap-3 rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-surface-2', !n.isRead && 'bg-accent-soft/50')}
    >
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px]', n.isRead ? 'bg-surface-2 text-fg-subtle' : 'bg-accent-soft text-accent')}>
        <Icon size={16} weight="bold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[13.5px] leading-snug', n.isRead ? 'font-medium text-fg-muted' : 'font-bold text-fg')}>{n.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-relaxed text-fg-subtle">{n.message}</span>
        <span className="mt-1 block text-[11.5px] text-fg-subtle">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
    </button>
  );
}

export function NotificationBell() {
  const user = useSessionUser();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { data: unread } = useUnreadCount();
  const count = unread?.count ?? 0;
  const list = useQuery({
    queryKey: qk.notificationList({ page: 1, pageSize: 8, bell: true }),
    queryFn: () => api.getPage<NotificationDto>('/api/notifications?pageSize=8'),
    enabled: open,
  });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const openNotification = (n: NotificationDto) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={count ? `Notifications, ${count} unread` : 'Notifications'} className="relative">
          <Bell size={19} />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10.5px] font-bold text-accent-fg tabular"
              >
                {count > 99 ? '99+' : count}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-bold text-fg">Notifications</p>
          <Button variant="ghost" size="sm" disabled={count === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            <Checks size={15} /> Mark all read
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {list.isLoading ? (
            <div className="grid gap-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : list.data && list.data.data.length > 0 ? (
            list.data.data.map((n) => <NotificationRow key={n.id} n={n} onOpen={openNotification} />)
          ) : (
            <EmptyState icon={<Bell size={22} />} title="You are all caught up" description="Updates about your complaints and the city appear here." />
          )}
        </div>
        <div className="border-t border-line p-2">
          <PopoverClose asChild>
            <Link href={notificationsPathForRole(user.role)} className="block rounded-[10px] px-3 py-2 text-center text-[13px] font-semibold text-accent hover:bg-surface-2">
              View all notifications
            </Link>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}
