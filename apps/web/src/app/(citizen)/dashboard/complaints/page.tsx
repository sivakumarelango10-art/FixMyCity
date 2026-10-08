'use client';

import Link from 'next/link';
import { PlusCircle } from '@phosphor-icons/react';
import { PageHeader } from '@/components/common/page';
import { ComplaintsBrowser, ReportCta } from '@/components/complaints/complaints-browser';
import { Button } from '@/components/ui/button';

export default function MyComplaintsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Complaints' }]}
        title="My complaints"
        description="Every report you have filed, with its live status. Search by tracking ID to find one quickly."
        actions={
          <Button asChild>
            <Link href="/dashboard/complaints/new">
              <PlusCircle size={18} weight="bold" /> Report an Issue
            </Link>
          </Button>
        }
      />
      <ComplaintsBrowser endpoint="/api/complaints" layout="cards" hrefFor={(c) => `/dashboard/complaints/${c.id}`} emptyAction={<ReportCta />} />
    </>
  );
}
