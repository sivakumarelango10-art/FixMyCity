'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Checks } from '@phosphor-icons/react';
import type { NotificationDto } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, Panel, Skeleton, Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api, toQuery } from '@/lib/api';
import { useIsClient, usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { NotificationRow, useMarkAllRead, useMarkRead, useUnreadCount } from './notification-bell';

/** Buckets notifications by recency so a long list scans by day. */
function groupByDay(items: NotificationDto[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  const label = (iso: string) => {
    const t = new Date(iso).getTime();
    if (t >= startOfToday.getTime()) return 'Today';
    if (t >= startOfToday.getTime() - day) return 'Yesterday';
    if (t >= startOfToday.getTime() - 6 * day) return 'Earlier this week';
    return 'Older';
  };
  const groups: { label: string; items: NotificationDto[] }[] = [];
  for (const n of items) {
    const l = label(n.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === l) g.items.push(n);
    else groups.push({ label: l, items: [n] });
  }
  return groups;
}

export function NotificationCenter() {
  const router = useRouter();
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');
  const [page, setPage] = usePageReset([filter]);
  const params = { page, pageSize: 15, unreadOnly: filter === 'unread' ? 'true' : undefined };
  const q = useQuery({
    queryKey: qk.notificationList(params),
    queryFn: () => api.getPage<NotificationDto>(`/api/notifications${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });
  const unread = useUnreadCount();
  // The header bell shares this query and may fill the cache before this page hydrates.
  // Read it only after hydration so server and client markup always agree.
  const hydrated = useIsClient();
  const unreadCount = hydrated ? (unread.data?.count ?? 0) : 0;
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const open = (n: NotificationDto) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Status changes, assignments, payments and city notices. New ones arrive live while you are signed in."
        actions={
          <Button variant="secondary" disabled={!unreadCount || markAll.isPending} onClick={() => markAll.mutate()}>
            <Checks size={16} /> Mark all as read
          </Button>
        }
      />
      <div className="grid gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList aria-label="Filter notifications">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread{unreadCount ? ` (${unreadCount})` : ''}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Panel>
          {q.isError ? (
            <ErrorState title="Notifications could not be loaded" message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : q.isLoading ? (
            <div className="grid gap-2 p-4" role="status" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-9 w-9 shrink-0" />
                  <div className="grid flex-1 gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3.5 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : q.data && q.data.data.length > 0 ? (
            <div className="grid gap-4 p-2 sm:p-3" aria-live="polite">
              {groupByDay(q.data.data).map((g) => (
                <section key={g.label} aria-label={g.label} className="grid gap-1">
                  <h2 className="px-3 pb-1 pt-1 text-xs font-semibold text-fg-subtle">{g.label}</h2>
                  <ul className="grid gap-1">
                    <AnimatePresence initial={false}>
                      {g.items.map((n) => (
                        <motion.li key={n.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                          <NotificationRow n={n} onOpen={open} />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Bell size={22} />}
              title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
              description={
                filter === 'unread'
                  ? 'You have opened everything. New status changes and notices will show up here.'
                  : 'Status changes, assignments, payments and city notices will appear here as they happen.'
              }
              action={
                filter === 'unread' ? (
                  <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                    Show all notifications
                  </Button>
                ) : undefined
              }
            />
          )}
          {q.data && q.data.meta.totalPages > 1 && (
            <div className="border-t border-line">
              <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onPageChange={setPage} label="notifications" />
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
