'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PlusCircle } from '@phosphor-icons/react';
import { COMPLAINT_STATUSES, type ComplaintStatus } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { ComplaintsBrowser, ReportCta } from '@/components/complaints/complaints-browser';
import { Button } from '@/components/ui/button';

function Browser() {
  const status = useSearchParams().get('status');
  const initial = status && (COMPLAINT_STATUSES as readonly string[]).includes(status) ? (status as ComplaintStatus) : '';
  return (
    <ComplaintsBrowser
      endpoint="/api/complaints"
      layout="cards"
      initialFilters={{ status: initial }}
      hrefFor={(c) => `/dashboard/complaints/${c.id}`}
      emptyHint="Anything you report appears here with its tracking ID and live status."
      emptyAction={<ReportCta />}
    />
  );
}

export default function MyComplaintsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Complaints' }]}
        title="My complaints"
        description="Every report you have filed and where it is now. Search by tracking ID to find one quickly."
        actions={
          // The top bar carries a labeled Report button from the sm breakpoint up.
          <Button asChild className="sm:hidden">
            <Link href="/dashboard/complaints/new">
              <PlusCircle size={18} weight="bold" /> Report an Issue
            </Link>
          </Button>
        }
      />
      <Suspense>
        <Browser />
      </Suspense>
    </>
  );
}
