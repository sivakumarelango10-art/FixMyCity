import type { Metadata } from 'next';
import { HelpContent } from '@/components/help/help-content';

export const metadata: Metadata = { title: 'Help and emergency contacts' };

export default function HelpPage() {
  return (
    <div className="container-page grid gap-12 py-12 md:py-16">
      <header className="grid max-w-3xl gap-4">
        <h1 className="type-section text-fg">Help and contacts</h1>
        <p className="type-lead">Emergency numbers, the departments behind FixMyCity and answers to common questions.</p>
      </header>
      <HelpContent />
    </div>
  );
}
