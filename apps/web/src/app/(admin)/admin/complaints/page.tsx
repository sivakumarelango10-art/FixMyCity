'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ComplaintStatus } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { ComplaintsBrowser } from '@/components/complaints/complaints-browser';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

function Browser() {
  const params = useSearchParams();
  const departments = useQuery({ queryKey: qk.departments, queryFn: () => api.get<{ id: string; name: string }[]>('/api/departments') });
  return (
    <ComplaintsBrowser
      endpoint="/api/admin/complaints"
      layout="table"
      showCitizen
      showDates
      departments={departments.data ?? []}
      initialFilters={{ status: (params.get('status') as ComplaintStatus | null) ?? '', departmentId: params.get('department') === 'unassigned' ? 'unassigned' : '' }}
      hrefFor={(c) => `/admin/complaints/${c.id}`}
    />
  );
}

export default function AdminComplaintsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Complaints' }]}
        title="Complaints"
        description="Search, filter and open any complaint to review it, assign a department or change its status."
      />
      <Suspense>
        <Browser />
      </Suspense>
    </>
  );
}
