import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page';
import { ReportForm } from '@/components/complaints/report-form';

export const metadata: Metadata = { title: 'Report an Issue' };

export default function NewComplaintPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Report an Issue' }]}
        title="Report an issue"
        description="Four short steps: what happened, what kind of problem, a photo, and where. You get a tracking ID the moment you submit."
      />
      <ReportForm />
    </>
  );
}
