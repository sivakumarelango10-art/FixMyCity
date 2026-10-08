'use client';

import * as React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { Reveal } from '@/components/motion/reveal';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';

/*
 * Real screenshots of the running application (scripts/capture-screens.mjs),
 * captured with the fictional demo accounts in both themes. Each view ships a
 * dark and a light image; only the one matching the active theme is shown.
 */
const VIEWS = [
  {
    id: 'citizen',
    label: 'Citizen',
    caption: 'Complaints, bills, alerts and city updates on one dashboard.',
    file: 'citizen-dashboard',
    alt: 'Citizen dashboard with complaint counts, quick actions, recent complaints and a status chart',
  },
  {
    id: 'tracking',
    label: 'Tracking',
    caption: 'Every status change, note and assignment on one timeline.',
    file: 'complaint-tracking',
    alt: 'Complaint tracking page showing the progress rail, details, rating panel and suggested routing',
  },
  {
    id: 'admin',
    label: 'Administrator',
    caption: 'Review suggestions, assign departments and watch workloads.',
    file: 'admin-overview',
    alt: 'Administrator overview with complaint totals, the assignment queue and a department workload chart',
  },
  {
    id: 'officer',
    label: 'Department',
    caption: 'Officers see only their department queue and record progress.',
    file: 'department-workbench',
    alt: 'Department officer workbench with the status action, progress update form and complaint details',
  },
] as const;

export function DashboardPreview() {
  const [view, setView] = React.useState<(typeof VIEWS)[number]['id']>('citizen');
  const active = VIEWS.find((v) => v.id === view)!;
  return (
    <section className="py-16 md:py-24">
      <div className="container-page grid gap-10">
        <Reveal className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid max-w-2xl gap-4">
            <h2 className="type-section text-fg">Every role gets its own workspace.</h2>
            <p className="type-lead" aria-live="polite">
              {active.caption}
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList aria-label="Choose a workspace preview">
              {VIEWS.map((v) => (
                <TabsTrigger key={v.id} value={v.id}>
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </Reveal>
        <Reveal delay={0.1}>
          <figure className="panel overflow-hidden p-2">
            <div className="relative aspect-[16/10] overflow-hidden rounded-control border border-line bg-surface-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, scale: 1.01 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0"
                >
                  {(['dark', 'light'] as const).map((theme) => (
                    <Image
                      key={theme}
                      src={`/screens/${active.file}-${theme}.webp`}
                      alt={active.alt}
                      width={1440}
                      height={900}
                      sizes="(min-width: 1280px) 1216px, 100vw"
                      className={`h-full w-full object-cover object-top ${theme === 'dark' ? 'hidden dark:block' : 'block dark:hidden'}`}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            <figcaption className="px-2 pb-1 pt-3 text-caption text-fg-subtle">
              Screenshot of the running app with fictional demo data.
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
