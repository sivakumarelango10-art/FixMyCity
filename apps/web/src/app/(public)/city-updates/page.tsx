import type { Metadata } from 'next';
import { AnnouncementsBrowser } from '@/components/announcements/announcements-browser';

export const metadata: Metadata = { title: 'City updates' };

export default function CityUpdatesPage() {
  return (
    <div className="container-page grid gap-10 py-14 lg:py-20">
      <header className="grid max-w-3xl gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-fg md:text-5xl">City updates</h1>
        <p className="text-lg leading-relaxed text-fg-muted">
          Maintenance schedules, advisories and civic notices published by municipal administrators. Expired notices are hidden automatically.
        </p>
      </header>
      <AnnouncementsBrowser />
    </div>
  );
}
