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
        description="Describe the problem, add a photo and pin the location. You will get a tracking ID straight away."
      />
      <ReportForm />
    </>
  );
}
