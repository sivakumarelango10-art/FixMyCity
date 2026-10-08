import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, ClipboardText, CreditCard, MapTrifold, Megaphone } from '@phosphor-icons/react/dist/ssr';
import { CITY_SERVICES, COMPLAINT_CATEGORIES, CATEGORY_META, DEPARTMENT_CODES, DEPARTMENT_DEFAULTS } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Services' };

const ICONS = {
  'civic-complaints': ClipboardText,
  'utility-hub': CreditCard,
  'city-updates': Megaphone,
  'issue-map': MapTrifold,
} as const;

export default function ServicesPage() {
  return (
    <div className="container-page grid gap-20 py-14 lg:py-20">
      <header className="grid max-w-3xl gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-fg md:text-5xl">City services in one place.</h1>
        <p className="text-lg leading-relaxed text-fg-muted">
          FixMyCity brings complaints, utilities and city information behind one sign-in. Here is what each service does today in this prototype.
        </p>
      </header>

      <section aria-labelledby="services-heading" className="grid gap-6">
        <h2 id="services-heading" className="sr-only">
          Services
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {CITY_SERVICES.map((s) => {
            const Icon = ICONS[s.id as keyof typeof ICONS] ?? ClipboardText;
            return (
              <article key={s.id} className="panel grid content-start gap-4 p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-accent-soft text-accent">
                    <Icon size={22} />
                  </span>
                  <span className="text-xs font-semibold text-fg-subtle">{s.hours}</span>
                </div>
                <h3 className="text-xl font-extrabold text-fg">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-fg-muted">{s.summary}</p>
                <ul className="grid gap-2">
                  {s.details.map((d) => (
                    <li key={d} className="flex items-start gap-2.5 text-sm text-fg-muted">
                      <CheckCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-success" />
                      {d}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
        <div className="grid content-start gap-3">
          <h2 id="categories-heading" className="text-2xl font-extrabold tracking-tight text-fg">What you can report</h2>
          <p className="text-[15px] leading-relaxed text-fg-muted">Each category routes to a department by default. Administrators can change the routing for any report.</p>
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {COMPLAINT_CATEGORIES.map((c) => (
            <div key={c} className="grid gap-1">
              <dt className="font-bold text-fg">{CATEGORY_META[c].label}</dt>
              <dd className="text-sm text-fg-muted">{CATEGORY_META[c].hint}</dd>
              <dd className="text-xs text-fg-subtle">{DEPARTMENT_DEFAULTS[CATEGORY_META[c].departmentCode].name}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="departments-heading" className="grid gap-6">
        <h2 id="departments-heading" className="text-2xl font-extrabold tracking-tight text-fg">Departments in the demo city</h2>
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-panel)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {DEPARTMENT_CODES.map((code) => (
            <div key={code} className="grid gap-1.5 bg-surface p-5">
              <p className="font-bold text-fg">{DEPARTMENT_DEFAULTS[code].name}</p>
              <p className="text-sm leading-relaxed text-fg-muted">{DEPARTMENT_DEFAULTS[code].description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-[var(--radius-panel)] border border-line bg-surface-2 p-7">
        <p className="max-w-xl text-lg font-bold text-fg">Spotted something that needs fixing?</p>
        <Button asChild size="lg">
          <Link href="/report-issue">
            Report an Issue <ArrowRight size={18} weight="bold" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
