'use client';

import { use } from 'react';
import { ComplaintDetailView } from '@/components/complaints/complaint-detail-view';

export default function CitizenComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ComplaintDetailView
      id={id}
      mode="citizen"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Complaints', href: '/dashboard/complaints' },
        { label: 'Tracking' },
      ]}
    />
  );
}
