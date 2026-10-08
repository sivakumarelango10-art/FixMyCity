'use client';

import { PageHeader } from '@/components/common/page';
import { ComplaintsBrowser } from '@/components/complaints/complaints-browser';

export default function AssignedPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/department' }, { label: 'Assigned work' }]}
        title="Assigned work"
        description="Complaints routed to your department. Open one to review the evidence, record progress and resolve it."
      />
      <ComplaintsBrowser
        endpoint="/api/department/complaints"
        layout="table"
        initialFilters={{ sort: 'priority', order: 'desc' }}
        hrefFor={(c) => `/department/assigned/${c.id}`}
      />
    </>
  );
}
