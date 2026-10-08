import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Camera, MapPin, Sparkle, Timer } from '@phosphor-icons/react/dist/ssr';
import { homePathForRole } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Report an Issue' };

const STEPS = [
  { icon: Camera, title: 'Add a photo', body: 'JPEG, PNG or WebP up to 5 MB. Location data inside the photo is removed.' },
  { icon: MapPin, title: 'Pin the location', body: 'Use your current location or tap the map. A landmark helps crews find it.' },
  { icon: Sparkle, title: 'Check the suggestion', body: 'See the suggested category and department before you submit.' },
  { icon: Timer, title: 'Track it', body: 'You get a tracking ID and alerts every time the status changes.' },
];

export default async function ReportIssuePage() {
  const user = await getSessionUser();
  if (user?.role === 'CITIZEN') redirect('/dashboard/complaints/new');

  return (
    <div className="container-page grid gap-14 py-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-20">
      <div className="grid content-start gap-6">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-fg md:text-5xl">Report an issue in your area.</h1>
        <p className="max-w-[56ch] text-lg leading-relaxed text-fg-muted">
          Sign in or create a free citizen account so you can follow your report and receive updates. It takes about a minute.
        </p>
        {user ? (
          <div className="grid gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <p className="text-sm text-fg-muted">
              You are signed in as a staff member. Reports are filed from citizen accounts.
            </p>
            <Button asChild variant="secondary" className="w-fit">
              <Link href={homePathForRole(user.role)}>Go to your workspace</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login?next=/dashboard/complaints/new">Sign in to report</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        )}
      </div>
      <ol className="grid content-start gap-6">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="grid grid-cols-[44px_1fr] gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-line bg-surface text-accent">
              <Icon size={21} />
            </span>
            <div className="grid gap-1">
              <h2 className="font-bold text-fg">{title}</h2>
              <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
