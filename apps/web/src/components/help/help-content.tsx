'use client';

import { useQuery } from '@tanstack/react-query';
import { EnvelopeSimple, Phone, Warning } from '@phosphor-icons/react';
import { EMERGENCY_CONTACTS, FAQ_ITEMS } from '@fixmycity/shared';
import { Accordion, AccordionItem, Badge, Skeleton } from '@/components/ui/primitives';
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
    <div className="grid gap-12">
      <section aria-labelledby="emergency-heading" className="grid gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="emergency-heading" className="text-xl font-extrabold text-fg">
            Emergency numbers
          </h2>
          <Badge tone="danger">
            <Warning size={12} weight="bold" /> For emergencies, call. Do not file a complaint.
          </Badge>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EMERGENCY_CONTACTS.map((c) => (
            <li key={c.id} className="panel grid gap-2 p-5">
              <p className="text-sm font-semibold text-fg-muted">{c.label}</p>
              <a href={`tel:${c.number}`} className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-fg hover:text-accent">
                <Phone size={22} weight="bold" className="text-danger" />
                {c.number}
              </a>
              <p className="text-[13px] leading-relaxed text-fg-subtle">{c.description}</p>
            </li>
          ))}
        </ul>
        <p className="text-[12.5px] text-fg-subtle">These are national emergency numbers in India. Availability of 108 varies by state.</p>
      </section>

      <section aria-labelledby="departments-heading" className="grid gap-5">
        <div className="grid gap-1">
          <h2 id="departments-heading" className="text-xl font-extrabold text-fg">
            Departments
          </h2>
          <p className="text-sm text-fg-subtle">Demonstration contacts. The email addresses below use a reserved demo domain and are not monitored.</p>
        </div>
        {departments.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[var(--radius-panel)]" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {(departments.data ?? []).map((d) => (
              <li key={d.id} className="panel grid gap-1.5 p-5">
                <p className="font-bold text-fg">{d.name}</p>
                <p className="text-sm leading-relaxed text-fg-muted">{d.description}</p>
                {d.contactEmail && (
                  <p className="mt-1 inline-flex items-center gap-2 font-mono text-[12px] text-fg-subtle">
                    <EnvelopeSimple size={14} /> {d.contactEmail}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="faq-heading" className="grid gap-4">
        <h2 id="faq-heading" className="text-xl font-extrabold text-fg">
          Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="panel px-5">
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
