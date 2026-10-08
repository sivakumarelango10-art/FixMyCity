import type { Metadata } from 'next';
import { AnnouncementsBrowser } from '@/components/announcements/announcements-browser';

export const metadata: Metadata = { title: 'City updates' };

export default function CityUpdatesPage() {
  return (
    <div className="container-page grid gap-10 py-12 md:py-16">
      <header className="grid max-w-3xl gap-4">
        <h1 className="type-section text-fg">City updates</h1>
        <p className="type-lead">
          Maintenance schedules, advisories and civic notices published by municipal administrators. Expired notices are hidden automatically.
        </p>
      </header>
      <AnnouncementsBrowser />
    </div>
  );
}
