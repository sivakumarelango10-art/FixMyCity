import Link from 'next/link';
import Image from 'next/image';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full min-w-0 max-w-[420px]">{children}</div>
        </main>
        <footer className="px-4 pb-6 text-caption text-fg-subtle sm:px-8">
          Hackathon prototype by team Kalvi Coder. Not an official municipal service.{' '}
          <Link href="/about" className="link">
            About
          </Link>
        </footer>
      </div>

      {/* Brand panel: what you get after signing in, shown with a real screenshot of the tracking page. */}
      <aside className="relative hidden overflow-hidden border-l border-line bg-surface-2 lg:flex lg:flex-col lg:justify-between lg:gap-10 lg:py-14 lg:pl-14">
        <div className="relative grid max-w-md gap-4 pr-14">
          <p className="type-section text-fg">One account for the services your city already offers.</p>
          <p className="text-[15px] leading-relaxed text-fg-muted">Report an issue, follow it from submission to resolution, and keep your bills and city notices in the same place.</p>
        </div>
        <figure className="relative grid gap-3">
          <div className="overflow-hidden rounded-l-panel border border-r-0 border-line-strong bg-surface shadow-[var(--shadow-pop)]">
            {(['dark', 'light'] as const).map((theme) => (
              <Image
                key={theme}
                src={`/screens/complaint-tracking-${theme}.webp`}
                alt="Complaint tracking page with the route from submitted to resolved and the activity timeline"
                width={1440}
                height={900}
                sizes="50vw"
                loading="eager"
                className={`aspect-[16/10] w-full object-cover object-left-top ${theme === 'dark' ? 'hidden dark:block' : 'block dark:hidden'}`}
              />
            ))}
          </div>
          <figcaption className="text-caption text-fg-subtle">The tracking page, shown with demo data.</figcaption>
        </figure>
      </aside>
    </div>
  );
}
