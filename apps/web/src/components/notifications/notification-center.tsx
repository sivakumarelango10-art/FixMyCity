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
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { NotificationRow, useMarkAllRead, useMarkRead, useUnreadCount } from './notification-bell';

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
          <Button variant="secondary" disabled={!unread.data?.count || markAll.isPending} onClick={() => markAll.mutate()}>
            <Checks size={16} /> Mark all as read
          </Button>
        }
      />
      <div className="grid gap-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList aria-label="Filter notifications">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread{unread.data?.count ? ` (${unread.data.count})` : ''}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Panel>
          {q.isError ? (
            <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : q.isLoading ? (
            <div className="grid gap-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : q.data && q.data.data.length > 0 ? (
            <ul className="grid gap-1 p-2 sm:p-3" aria-live="polite">
              <AnimatePresence initial={false}>
                {q.data.data.map((n) => (
                  <motion.li key={n.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                    <NotificationRow n={n} onOpen={open} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <EmptyState icon={<Bell size={22} />} title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="Updates about your work appear here." />
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
