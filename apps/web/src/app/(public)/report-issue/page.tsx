import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Camera, MapPin, Sparkle, Timer } from '@phosphor-icons/react/dist/ssr';
import { homePathForRole } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/primitives';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Report an Issue' };

const STEPS = [
  { icon: Sparkle, title: 'Describe it', body: 'A short headline and a few details. A suggested category and department appear as you type.' },
  { icon: Camera, title: 'Add a photo', body: 'JPEG, PNG or WebP up to 5 MB. Location data inside the photo is removed.' },
  { icon: MapPin, title: 'Pin the location', body: 'Use your current location or tap the map. A landmark helps crews find it.' },
  { icon: Timer, title: 'Track it', body: 'You get a tracking ID straight away and an alert every time the status changes.' },
];

export default async function ReportIssuePage() {
  const user = await getSessionUser();
  if (user?.role === 'CITIZEN') redirect('/dashboard/complaints/new');

  return (
    <div className="container-page grid gap-12 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
      <div className="grid content-start gap-6">
        <h1 className="type-section text-fg">Report an issue in your area.</h1>
        <p className="type-lead max-w-[52ch]">
          Sign in or create a free citizen account so you can follow your report and get updates. It takes about a minute.
        </p>
        {user ? (
          <Notice
            title="You are signed in as a staff member."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href={homePathForRole(user.role)}>Go to your workspace</Link>
              </Button>
            }
          >
            Reports are filed from citizen accounts.
          </Notice>
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
        <p className="text-sm text-fg-subtle">
          Is someone in danger right now? Call <a href="tel:112" className="link">112</a> instead of filing a report.
        </p>
      </div>
      <ol className="relative grid content-start gap-7" aria-label="What reporting involves">
        <span aria-hidden className="absolute bottom-5 left-[19px] top-5 w-0.5 rounded-full bg-line" />
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-4">
            <span className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-line-strong bg-bg text-fg-muted" aria-hidden>
              <Icon size={18} />
            </span>
            <div className="grid gap-1 pt-1.5">
              <h2 className="font-semibold text-fg">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
