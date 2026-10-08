'use client';

import * as React from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCircle } from '@phosphor-icons/react';
import { STATUS_LABELS, type ComplaintListItem, type ComplaintStatus, type PaginationMeta } from '@fixmycity/shared';
import { CategoryChip, StatusBadge, TrackingId } from '@/components/common/complaint-meta';
import { PageHeader } from '@/components/common/page';
import { EmptyState, ErrorState, Pagination, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDateTime, timeAgo } from '@/lib/utils';

interface HistoryResponse {
  resolved: (ComplaintListItem & { resolvedAt: string | null; resolutionSummary: string | null })[];
  meta: PaginationMeta;
  myActions: { id: string; fromStatus: ComplaintStatus | null; toStatus: ComplaintStatus; reason: string | null; createdAt: string; complaint: { id: string; trackingId: string; title: string } }[];
}

export default function DepartmentHistoryPage() {
  const [page, setPage] = React.useState(1);
  const q = useQuery({
    queryKey: qk.deptHistory(page),
    queryFn: () => api.get<HistoryResponse>(`/api/department/history?page=${page}&pageSize=8`),
    placeholderData: keepPreviousData,
  });
  const d = q.data;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/department' }, { label: 'Work history' }]}
        title="Work history"
        description="Complaints your department has resolved, and the status changes you made yourself."
      />
      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="Resolved by your department" />
          {q.isLoading ? (
            <Skeleton className="m-5 h-60" />
          ) : d && d.resolved.length > 0 ? (
            <ul className="divide-y divide-line">
              {d.resolved.map((c) => (
                <li key={c.id}>
                  <Link href={`/department/assigned/${c.id}`} className="grid gap-2 px-5 py-4 transition-colors hover:bg-surface-2/60">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <TrackingId value={c.trackingId} />
                      <span className="text-xs text-fg-subtle">Resolved {timeAgo(c.resolvedAt)}</span>
                    </div>
                    <p className="font-bold text-fg">{c.title}</p>
                    <CategoryChip category={c.category} />
                    {c.resolutionSummary && <p className="line-clamp-2 text-[13px] text-fg-muted">{c.resolutionSummary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CheckCircle size={22} />} title="Nothing resolved yet" />
          )}
          {d && d.meta.total > 0 && (
            <div className="border-t border-line">
              <Pagination page={page} totalPages={d.meta.totalPages} total={d.meta.total} onPageChange={setPage} label="resolved" />
            </div>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Your recent status changes" />
          <div className="p-5 sm:p-6">
            {q.isLoading ? (
              <Skeleton className="h-40" />
            ) : d && d.myActions.length > 0 ? (
              <ol className="grid gap-4">
                {d.myActions.map((a) => (
                  <li key={a.id} className="grid gap-1.5">
                    <Link href={`/department/assigned/${a.complaint.id}`} className="text-[13.5px] font-semibold text-fg hover:text-accent">
                      {a.complaint.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                      {a.fromStatus && <span>{STATUS_LABELS[a.fromStatus]} to</span>}
                      <StatusBadge status={a.toStatus} size="sm" />
                      <span title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-fg-subtle">You have not changed any statuses yet.</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
