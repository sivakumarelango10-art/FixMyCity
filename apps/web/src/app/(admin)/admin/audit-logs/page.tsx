'use client';

import * as React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MagnifyingGlass } from '@phosphor-icons/react';
import type { AuditLogDto } from '@fixmycity/shared';
import { AuditList } from '@/components/admin/audit-list';
import { PageHeader } from '@/components/common/page';
import { useDebouncedValue } from '@/components/complaints/complaint-filters';
import { Input } from '@/components/ui/field';
import { ErrorState, Pagination, Panel } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { api, toQuery } from '@/lib/api';
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';

const ENTITY_TYPES = [
  { value: '', label: 'All records' },
  { value: 'complaint', label: 'Complaints' },
  { value: 'user', label: 'Users' },
  { value: 'utility_bill', label: 'Utility bills' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'department', label: 'Departments' },
  { value: 'session', label: 'Sessions' },
];

const ACTION_PREFIXES = [
  { value: '', label: 'All actions' },
  { value: 'complaint.', label: 'Complaint actions' },
  { value: 'auth.', label: 'Sign-in and accounts' },
  { value: 'utility.', label: 'Payments' },
  { value: 'announcement.', label: 'Announcements' },
  { value: 'user.', label: 'User changes' },
];

export default function AuditLogsPage() {
  const [search, setSearch] = React.useState('');
  const [entityType, setEntityType] = React.useState('');
  const [action, setAction] = React.useState('');
  const debounced = useDebouncedValue(search, 350);
  const [page, setPage] = usePageReset([debounced, entityType, action]);
  const params = { page, pageSize: 25, search: debounced || undefined, entityType: entityType || undefined, action: action || undefined };
  const q = useQuery({
    queryKey: qk.adminAudit(params),
    queryFn: () => api.getPage<AuditLogDto>(`/api/admin/audit-logs${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Audit log' }]}
        title="Audit log"
        description="Sensitive actions with who did them and when. Passwords, tokens and session data are never recorded."
      />
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by person, action or record ID" aria-label="Search audit log" className="pl-10" />
          </div>
          <Select value={entityType} onValueChange={setEntityType} options={ENTITY_TYPES} aria-label="Filter by record type" className="md:w-44" />
          <Select value={action} onValueChange={setAction} options={ACTION_PREFIXES} aria-label="Filter by action" className="md:w-52" />
        </div>
        <Panel>
          {q.isError ? (
            <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : (
            <div className="p-2 sm:p-3">
              <AuditList entries={q.data?.data ?? []} loading={q.isLoading} expandable />
            </div>
          )}
          {q.data && q.data.meta.total > 0 && (
            <div className="border-t border-line">
              <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onPageChange={setPage} label="entries" />
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
