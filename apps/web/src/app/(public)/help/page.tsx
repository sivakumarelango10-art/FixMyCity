import type { Metadata } from 'next';
import { HelpContent } from '@/components/help/help-content';

export const metadata: Metadata = { title: 'Help and emergency contacts' };

export default function HelpPage() {
  return (
    <div className="container-page grid gap-10 py-14 lg:py-20">
      <header className="grid max-w-3xl gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-fg md:text-5xl">Help and contacts</h1>
        <p className="text-lg leading-relaxed text-fg-muted">Emergency numbers, the departments behind FixMyCity and answers to common questions.</p>
      </header>
      <HelpContent />
    </div>
  );
}
