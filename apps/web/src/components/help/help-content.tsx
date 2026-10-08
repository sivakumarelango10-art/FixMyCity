'use client';

import { useQuery } from '@tanstack/react-query';
import { EnvelopeSimple, Phone, Warning } from '@phosphor-icons/react';
import { EMERGENCY_CONTACTS, FAQ_ITEMS } from '@fixmycity/shared';
import { Accordion, AccordionItem, ErrorState, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

interface PublicDepartment {
  id: string;
  code: string;
  name: string;
  description: string;
  contactEmail: string | null;
}

/** Emergency numbers, department directory and FAQ. Shared by the public help page and the citizen portal. */
export function HelpContent() {
  const departments = useQuery({ queryKey: qk.departments, queryFn: () => api.get<PublicDepartment[]>('/api/departments') });

  return (
    <div className="grid gap-14">
      <section aria-labelledby="emergency-heading" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="emergency-heading" className="text-xl font-semibold tracking-[-0.02em] text-fg">
            Emergency numbers
          </h2>
          <p className="flex items-center gap-2 text-sm font-medium text-danger">
            <Warning size={16} weight="bold" aria-hidden /> For emergencies, call. Do not file a complaint.
          </p>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {EMERGENCY_CONTACTS.map((c) => (
            <li key={c.id} className="grid content-start gap-2 bg-surface p-5">
              <p className="text-sm font-medium text-fg-muted">{c.label}</p>
              <a href={`tel:${c.number}`} className="inline-flex w-fit items-center gap-2.5 rounded-control text-3xl font-bold tracking-[-0.02em] text-fg tabular hover:text-danger">
                <Phone size={22} weight="bold" className="text-danger" aria-hidden />
                {c.number}
              </a>
              <p className="text-[13px] leading-relaxed text-fg-subtle">{c.description}</p>
            </li>
          ))}
        </ul>
        <p className="text-caption text-fg-subtle">These are national emergency numbers in India. Availability of 108 varies by state.</p>
      </section>

      <section aria-labelledby="departments-heading" className="grid gap-5">
        <div className="grid gap-1">
          <h2 id="departments-heading" className="text-xl font-semibold tracking-[-0.02em] text-fg">
            Departments
          </h2>
          <p className="text-sm text-fg-subtle">Demonstration contacts. The email addresses below use a reserved demo domain and are not monitored.</p>
        </div>
        {departments.isError ? (
          <ErrorState className="panel" title="Departments could not be loaded" message={(departments.error as Error).message} onRetry={() => departments.refetch()} />
        ) : departments.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-x-10 md:grid-cols-2">
            {(departments.data ?? []).map((d) => (
              <li key={d.id} className="grid gap-1.5 border-t border-line py-5">
                <p className="font-semibold text-fg">{d.name}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{d.description}</p>
                {d.contactEmail && (
                  <p className="mt-1 inline-flex items-center gap-2 font-mono text-xs text-fg-subtle">
                    <EnvelopeSimple size={14} aria-hidden /> {d.contactEmail}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="faq-heading" className="grid gap-4">
        <h2 id="faq-heading" className="text-xl font-semibold tracking-[-0.02em] text-fg">
          Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="panel px-5 sm:px-6">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`q-${i}`} question={item.q}>
              {item.a}
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
