'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AnnouncementsBrowser } from '@/components/announcements/announcements-browser';
import { PageHeader } from '@/components/common/page';

function Browser() {
  const open = useSearchParams().get('open');
  return <AnnouncementsBrowser initialOpenId={open} />;
}

export default function CitizenAnnouncementsPage() {
  return (
    <>
      <PageHeader title="City updates" description="Notices from municipal administrators. Demo notices are labeled." />
      <Suspense>
        <Browser />
      </Suspense>
    </>
  );
}
