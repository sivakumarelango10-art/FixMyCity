'use client';

import { use } from 'react';
import { ComplaintDetailView } from '@/components/complaints/complaint-detail-view';

export default function AdminComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ComplaintDetailView
      id={id}
      mode="admin"
      breadcrumbs={[
        { label: 'Overview', href: '/admin' },
        { label: 'Complaints', href: '/admin/complaints' },
        { label: 'Review' },
      ]}
    />
  );
}
