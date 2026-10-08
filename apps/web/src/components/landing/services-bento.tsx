'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Buildings, CreditCard, Megaphone, SquaresFour, Warning } from '@phosphor-icons/react';
import { DEMO_PAYMENT_NOTICE, DEPARTMENT_DEFAULTS, DEPARTMENT_CODES, type ComplaintStatus } from '@fixmycity/shared';
import { StatusBadge } from '@/components/common/complaint-meta';
import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

const FLOW: ComplaintStatus[] = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

function Cell({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { y: -3 }}
      className={cn('relative overflow-hidden rounded-[var(--radius-panel)] border border-line p-6 sm:p-7', className)}
    >
      {children}
    </motion.article>
  );
}

export function ServicesBento() {
  return (
    <section id="services" className="py-20 lg:py-28">
      <div className="container-page grid gap-12">
        <Reveal className="grid max-w-2xl gap-4">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">Five services. One front door.</h2>
          <p className="max-w-[58ch] text-lg leading-relaxed text-fg-muted">
            Everything a resident needs from the city, organised around the requests people actually make.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-6">
          {/* Complaint management: the core workflow */}
          <Cell className="bg-surface md:col-span-4 md:row-span-2">
            <div className="grid h-full content-between gap-10">
              <div className="grid max-w-md gap-3">
                <Warning size={26} className="text-accent" />
                <h3 className="text-2xl font-extrabold tracking-tight text-fg">Complaint management</h3>
                <p className="text-[15px] leading-relaxed text-fg-muted">
                  Report a pothole, leak or broken light with a photo and a map pin. Every report gets a tracking ID and a full history from
                  submission to resolution.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {FLOW.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <StatusBadge status={s} />
                      {i < FLOW.length - 1 && <span className="h-px w-5 bg-line-strong" aria-hidden />}
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[13px] text-fg-subtle">FMC-2026-000001 is what a tracking ID looks like.</p>
              </div>
            </div>
          </Cell>

          {/* Unified dashboard */}
          <Cell delay={0.05} className="bg-[linear-gradient(150deg,var(--accent-soft),transparent_70%)] md:col-span-2">
            <SquaresFour size={24} className="text-accent" />
            <h3 className="mt-4 text-lg font-extrabold text-fg">Unified dashboard</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">Complaints, bills, notices and alerts on one screen after one sign-in.</p>
          </Cell>

          {/* Utility hub */}
          <Cell delay={0.1} className="bg-[linear-gradient(150deg,var(--success-soft),transparent_70%)] md:col-span-2">
            <CreditCard size={24} className="text-success" />
            <h3 className="mt-4 text-lg font-extrabold text-fg">Utility hub</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">Electricity, water, property tax and waste bills with due dates and receipts.</p>
            <p className="mt-4 inline-block rounded-full border border-success/30 px-2.5 py-1 text-[11px] font-bold text-success">{DEMO_PAYMENT_NOTICE}</p>
          </Cell>

          {/* City information */}
          <Cell delay={0.05} className="hairline-grid bg-surface md:col-span-3">
            <div className="relative grid gap-3">
              <Megaphone size={24} className="text-warning" />
              <h3 className="text-lg font-extrabold text-fg">City information</h3>
              <p className="max-w-sm text-sm leading-relaxed text-fg-muted">
                Maintenance schedules, advisories and emergency numbers, with expired notices hidden automatically.
              </p>
            </div>
          </Cell>

          {/* Connected administration */}
          <Cell delay={0.1} className="bg-surface-2 md:col-span-3">
            <Buildings size={24} className="text-st-review" />
            <h3 className="mt-4 text-lg font-extrabold text-fg">Connected administration</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">One workspace to review, assign and resolve across departments.</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Departments in the demo city">
              {DEPARTMENT_CODES.map((code) => (
                <li key={code} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-fg-muted">
                  {DEPARTMENT_DEFAULTS[code].name.replace(' Department', '')}
                </li>
              ))}
            </ul>
          </Cell>
        </div>
      </div>
    </section>
  );
}
