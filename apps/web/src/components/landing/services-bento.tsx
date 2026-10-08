'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { ArrowRight, Drop, House, Lightning, MapTrifold, Megaphone, Recycle, Warning } from '@phosphor-icons/react';
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  DEMO_PAYMENT_NOTICE,
  UTILITY_LABELS,
  type AnnouncementDto,
} from '@fixmycity/shared';
import { CATEGORY_ICONS } from '@/components/common/complaint-meta';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, timeAgo } from '@/lib/utils';
import { useReducedMotionSafe } from '@/lib/hooks';

function Cell({ className, children, delay = 0, href, label }: { className?: string; children: React.ReactNode; delay?: number; href: string; label: string }) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn('group relative flex flex-col overflow-hidden rounded-panel border border-line p-6 transition-colors duration-200 hover:border-line-strong sm:p-7', className)}
    >
      {children}
      <Link href={href} className="mt-auto inline-flex w-fit items-center gap-1.5 pt-6 text-sm font-semibold text-accent-text">
        <span className="absolute inset-0" aria-hidden />
        {label}
        <ArrowRight size={15} weight="bold" className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </motion.article>
  );
}

const UTILITIES = [
  { icon: Lightning, key: 'ELECTRICITY' },
  { icon: Drop, key: 'WATER' },
  { icon: House, key: 'PROPERTY_TAX' },
  { icon: Recycle, key: 'WASTE_MANAGEMENT' },
] as const;

function LatestNotices() {
  const params = { page: 1, pageSize: 3 };
  const q = useQuery({
    queryKey: qk.announcementList(params),
    queryFn: () => api.getPage<AnnouncementDto>('/api/announcements?page=1&pageSize=3'),
  });
  if (q.isLoading) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  const items = q.data?.data ?? [];
  if (items.length === 0) return <p className="text-sm text-fg-subtle">No notices are published right now.</p>;
  return (
    <ul className="grid divide-y divide-line rounded-control border border-line bg-surface">
      {items.map((a) => (
        <li key={a.id} className="grid gap-0.5 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4">
          <span className="truncate text-sm font-semibold text-fg">{a.title}</span>
          <span className="text-xs text-fg-subtle">
            {ANNOUNCEMENT_CATEGORY_LABELS[a.category]}, {timeAgo(a.publishedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ServicesBento() {
  return (
    <section id="services" className="py-16 md:py-24">
      <div className="container-page grid gap-12">
        <Reveal className="grid max-w-2xl gap-4">
          <h2 className="type-section text-fg">One front door for city services.</h2>
          <p className="type-lead">Complaints, bills, notices and the issue map used to mean separate portals and separate logins. Here they share one account.</p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-12">
          {/* Civic complaints: the core service, with the ten real report categories. */}
          <Cell className="bg-surface md:col-span-7 md:row-span-2" href="/report-issue" label="Report an issue">
            <div className="grid gap-3">
              <h3 className="text-xl font-semibold tracking-[-0.02em] text-fg">Civic complaints</h3>
              <p className="max-w-md text-[15px] leading-relaxed text-fg-muted">
                Report a pothole, leak or broken streetlight with a photo and a map pin. Each report gets a tracking ID and a full history.
              </p>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Categories you can report">
              {COMPLAINT_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                return (
                  <li key={c} className="grid content-start gap-2 rounded-control border border-line bg-bg px-3 py-3">
                    <Icon size={20} className="text-fg-muted" aria-hidden />
                    <span className="text-[12.5px] font-medium leading-snug text-fg">{CATEGORY_META[c].label}</span>
                  </li>
                );
              })}
            </ul>
          </Cell>

          {/* Issue map: street-grid pattern, the same blue as open reports on the map. */}
          <Cell
            delay={0.06}
            className="bg-accent-soft [background-image:linear-gradient(var(--primary-border)_1px,transparent_1px),linear-gradient(90deg,var(--primary-border)_1px,transparent_1px)] [background-size:44px_44px] [background-position:-1px_-1px] md:col-span-5"
            href="/services#issue-map"
            label="How the map works"
          >
            <MapTrifold size={26} className="text-accent-text" aria-hidden />
            <h3 className="mt-4 text-lg font-semibold tracking-[-0.015em] text-fg">Issue map</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">See what is already reported nearby before you file, and watch pins change as work moves.</p>
          </Cell>

          {/* Utility hub */}
          <Cell delay={0.12} className="bg-surface-2 md:col-span-5" href="/services#utility-hub" label="About the utility hub">
            <ul className="flex flex-wrap gap-2" aria-label="Utility services">
              {UTILITIES.map(({ icon: Icon, key }) => (
                <li key={key} className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg-muted">
                  <Icon size={14} weight="bold" aria-hidden /> {UTILITY_LABELS[key].label}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-fg">Utility hub</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">Bills with due dates, receipts and payment history in one place.</p>
            <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-chip border border-warning/35 bg-warning-soft px-2 py-1 text-[11px] font-bold text-warning">
              <Warning size={12} weight="bold" aria-hidden /> {DEMO_PAYMENT_NOTICE}
            </p>
          </Cell>

          {/* City updates: the newest published notices. */}
          <Cell delay={0.06} className="bg-surface md:col-span-12" href="/city-updates" label="All city updates">
            <div className="grid gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start md:gap-10">
              <div className="grid gap-3">
                <Megaphone size={26} className="text-fg-muted" aria-hidden />
                <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg">City updates</h3>
                <p className="max-w-sm text-sm leading-relaxed text-fg-muted">Maintenance schedules, advisories and civic notices. Expired notices disappear on their own.</p>
              </div>
              <div className="relative z-10">
                <LatestNotices />
              </div>
            </div>
          </Cell>
        </div>
      </div>
    </section>
  );
}
