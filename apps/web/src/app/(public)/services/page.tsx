import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ClipboardText, Clock, CreditCard, MapTrifold, Megaphone } from '@phosphor-icons/react/dist/ssr';
import { CITY_SERVICES, DEPARTMENT_CODES, DEPARTMENT_DEFAULTS } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { CategoryDirectory } from '@/components/services/category-directory';

export const metadata: Metadata = { title: 'Services' };

const ICONS = {
  'civic-complaints': ClipboardText,
  'utility-hub': CreditCard,
  'city-updates': Megaphone,
  'issue-map': MapTrifold,
} as const;

/** Where each service starts, using routes that exist today. */
const START: Record<string, { href: string; label: string }> = {
  'civic-complaints': { href: '/report-issue', label: 'Report an issue' },
  'utility-hub': { href: '/login?next=/dashboard/utilities', label: 'Sign in to see your bills' },
  'city-updates': { href: '/city-updates', label: 'Read city updates' },
  'issue-map': { href: '/login?next=/dashboard/city-map', label: 'Sign in to open the map' },
};

export default function ServicesPage() {
  return (
    <div className="container-page grid gap-16 py-12 md:gap-20 md:py-16">
      <header className="grid max-w-3xl gap-4">
        <h1 className="type-section text-fg">City services in one place.</h1>
        <p className="type-lead">
          FixMyCity brings complaints, utilities and city information behind one sign-in. Here is what each service does today in this prototype.
        </p>
      </header>

      <section aria-labelledby="services-heading" className="grid gap-6">
        <h2 id="services-heading" className="sr-only">
          Services
        </h2>
        <ul className="grid divide-y divide-line border-y border-line">
          {CITY_SERVICES.map((s) => {
            const Icon = ICONS[s.id as keyof typeof ICONS] ?? ClipboardText;
            const start = START[s.id];
            return (
              <li key={s.id} id={s.id} className="grid scroll-mt-24 gap-5 py-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-10">
                <div className="grid content-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-control border border-accent-line bg-accent-soft text-accent-text" aria-hidden>
                    <Icon size={22} />
                  </span>
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-fg">{s.title}</h3>
                  <p className="flex items-center gap-1.5 text-[13px] text-fg-subtle">
                    <Clock size={14} aria-hidden /> {s.hours}
                  </p>
                </div>
                <div className="grid content-start gap-4">
                  <p className="text-[15px] leading-relaxed text-fg">{s.summary}</p>
                  <ul className="grid gap-2">
                    {s.details.map((d) => (
                      <li key={d} className="flex items-start gap-2.5 text-sm text-fg-muted">
                        <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-success" aria-hidden />
                        {d}
                      </li>
                    ))}
                  </ul>
                  {start && (
                    <Link href={start.href} className="link inline-flex w-fit items-center gap-1.5 text-sm">
                      {start.label} <ArrowRight size={14} weight="bold" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="categories-heading" className="grid gap-6">
        <div className="grid max-w-2xl gap-2">
          <h2 id="categories-heading" className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            What you can report
          </h2>
          <p className="text-[15px] leading-relaxed text-fg-muted">Each category routes to a department by default. Administrators can change the routing for any report.</p>
        </div>
        <CategoryDirectory />
      </section>

      <section aria-labelledby="departments-heading" className="grid gap-6">
        <div className="grid max-w-2xl gap-2">
          <h2 id="departments-heading" className="text-2xl font-semibold tracking-[-0.02em] text-fg">
            Departments in the demo city
          </h2>
          <p className="text-[15px] leading-relaxed text-fg-muted">The teams that receive and resolve reports in this demonstration.</p>
        </div>
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_CODES.map((code) => (
            <li key={code} className="grid content-start gap-1.5 border-t border-line pt-4">
              <p className="font-semibold text-fg">{DEPARTMENT_DEFAULTS[code].name}</p>
              <p className="text-sm leading-relaxed text-fg-muted">{DEPARTMENT_DEFAULTS[code].description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-panel border border-accent-line bg-accent-soft px-6 py-7 sm:px-8">
        <p className="max-w-xl text-lg font-semibold text-fg">Spotted something that needs fixing?</p>
        <Button asChild size="lg">
          <Link href="/report-issue">
            Report an Issue <ArrowRight size={18} weight="bold" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
