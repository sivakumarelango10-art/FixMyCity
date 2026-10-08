import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page';
import { HelpContent } from '@/components/help/help-content';

export const metadata: Metadata = { title: 'Services & Help' };

export default function CitizenHelpPage() {
  return (
    <>
      <PageHeader title="Services & help" description="Emergency numbers, the departments behind FixMyCity and answers to common questions." />
      <HelpContent />
    </>
  );
}
