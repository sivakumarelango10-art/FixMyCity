'use client';

import * as React from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ClipboardText } from '@phosphor-icons/react';
import type { ComplaintListItem } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Pagination, Panel } from '@/components/ui/primitives';
import { api, toQuery } from '@/lib/api';
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { ComplaintCards, ComplaintListSkeleton, ComplaintTable } from './complaint-list';
import { ComplaintFilters, EMPTY_FILTERS, filtersToParams, useDebouncedValue, type ComplaintFilterState } from './complaint-filters';

interface Props {
  endpoint: '/api/complaints' | '/api/admin/complaints' | '/api/department/complaints';
  hrefFor: (c: ComplaintListItem) => string;
  layout: 'cards' | 'table';
  departments?: { id: string; name: string }[];
  showDates?: boolean;
  initialFilters?: Partial<ComplaintFilterState>;
  emptyAction?: React.ReactNode;
  showCitizen?: boolean;
}

/** Server-paginated, filterable complaint list used by every role. */
export function ComplaintsBrowser({ endpoint, hrefFor, layout, departments, showDates, initialFilters, emptyAction, showCitizen }: Props) {
  const [filters, setFilters] = React.useState<ComplaintFilterState>({ ...EMPTY_FILTERS, ...initialFilters });
  const search = useDebouncedValue(filters.search, 350);
  const [page, setPage] = usePageReset([search, filters.status, filters.category, filters.priority, filters.departmentId, filters.from, filters.to, filters.sort, filters.order]);
  const pageSize = layout === 'table' ? 12 : 8;
  const params = filtersToParams(filters, search, page, pageSize);


  const q = useQuery({
    queryKey: qk.complaintList({ endpoint, ...params }),
    queryFn: () => api.getPage<ComplaintListItem>(`${endpoint}${toQuery(params)}`),
    placeholderData: keepPreviousData,
    refetchInterval: 45_000,
  });

  const items = q.data?.data ?? [];
  return (
    <div className="grid grid-cols-1 gap-5">
      <ComplaintFilters value={filters} onChange={setFilters} departments={departments} showDates={showDates} />
      <Panel className={q.isFetching && !q.isLoading ? 'opacity-80 transition-opacity' : 'transition-opacity'}>
        {q.isError ? (
          <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <ComplaintListSkeleton rows={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardText size={22} />}
            title="No complaints match"
            description={filters.search || filters.status || filters.category ? 'Try clearing a filter or searching for something else.' : 'Nothing has been reported here yet.'}
            action={emptyAction}
          />
        ) : layout === 'table' ? (
          <ComplaintTable items={items} hrefFor={hrefFor} showCitizen={showCitizen} suggestedPriorities={endpoint === '/api/admin/complaints'} />
        ) : (
          <div className="p-4 sm:p-5">
            <ComplaintCards items={items} hrefFor={hrefFor} />
          </div>
        )}
        {q.data && q.data.meta.total > 0 && (
          <div className="border-t border-line">
            <Pagination page={q.data.meta.page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onPageChange={setPage} label="complaints" />
          </div>
        )}
      </Panel>
    </div>
  );
}

export function ReportCta() {
  return (
    <Button asChild size="sm">
      <Link href="/dashboard/complaints/new">Report an Issue</Link>
    </Button>
  );
}
