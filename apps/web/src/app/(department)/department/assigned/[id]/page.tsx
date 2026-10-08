'use client';

import { use } from 'react';
import { ComplaintDetailView } from '@/components/complaints/complaint-detail-view';

export default function OfficerComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ComplaintDetailView
      id={id}
      mode="officer"
      breadcrumbs={[
        { label: 'Overview', href: '/department' },
        { label: 'Assigned work', href: '/department/assigned' },
        { label: 'Workbench' },
      ]}
    />
  );
}
