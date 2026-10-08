'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { CaretRight } from '@phosphor-icons/react';
import { CATEGORY_META, type ComplaintListItem } from '@fixmycity/shared';
import { DemoTag, PriorityLabel, StatusBadge, TrackingId } from '@/components/common/complaint-meta';
import { Skeleton } from '@/components/ui/primitives';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import { ComplaintThumb } from './complaint-media';
import { MiniRoute } from './timeline';

/** Row list: photo, tracking ID, title, where it is on its route. Used inside a panel. */
export function ComplaintCards({ items, hrefFor, className }: { items: ComplaintListItem[]; hrefFor: (c: ComplaintListItem) => string; className?: string }) {
  return (
    <ul className={cn('divide-y divide-line', className)}>
      {items.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.025 }}>
          <Link
            href={hrefFor(c)}
            className="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:px-5"
          >
            <ComplaintThumb src={c.thumbnailUrl} category={c.category} title={c.title} className="aspect-square w-full" />
            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <TrackingId value={c.trackingId} />
                {c.isDemo && <DemoTag />}
              </div>
              <p className="truncate text-[15px] font-semibold text-fg group-hover:text-accent-text">{c.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusBadge status={c.status} size="sm" />
                <MiniRoute status={c.status} className="hidden sm:inline-flex" />
                <span className="text-xs text-fg-subtle">
                  {c.department ? `${c.department.name.replace(' Department', '')}, ` : ''}updated {timeAgo(c.updatedAt)}
                </span>
              </div>
            </div>
            <CaretRight size={16} weight="bold" className="text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

/** Dense table for staff, collapsing to rows below the md breakpoint. */
export function ComplaintTable({
  items,
  hrefFor,
  showCitizen,
  suggestedPriorities,
}: {
  items: ComplaintListItem[];
  hrefFor: (c: ComplaintListItem) => string;
  showCitizen?: boolean;
  suggestedPriorities?: boolean;
}) {
  return (
    <>
      <div className="md:hidden">
        <ComplaintCards items={items} hrefFor={hrefFor} />
      </div>
      {/* relative: keeps absolutely positioned descendants (sr-only labels) inside the scroll clip */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-surface-2/70 text-xs font-semibold text-fg-subtle">
              <th scope="col" className="py-2.5 pl-5 pr-3 font-semibold">Complaint</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Category</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Priority</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Department</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Submitted</th>
              <th scope="col" className="py-2.5 pl-3 pr-5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((c) => (
              <tr key={c.id} className="group transition-colors hover:bg-surface-2/60">
                <td className="max-w-[340px] py-2.5 pl-5 pr-3">
                  <Link href={hrefFor(c)} className="grid gap-0.5 rounded-chip">
                    <span className="flex items-center gap-2">
                      <TrackingId value={c.trackingId} />
                      {c.isDemo && <DemoTag />}
                    </span>
                    <span className="truncate font-semibold text-fg group-hover:text-accent-text">{c.title}</span>
                    <span className="truncate text-xs text-fg-subtle">
                      {c.address}
                      {showCitizen && c.citizen ? `, ${c.citizen.name}` : ''}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-fg-muted">{CATEGORY_META[c.category].label}</td>
                <td className="px-3 py-2.5">
                  <PriorityLabel priority={c.priority} suggested={suggestedPriorities && !c.department} />
                </td>
                <td className="px-3 py-2.5 text-fg-muted">{c.department ? c.department.name.replace(' Department', '') : <span className="text-fg-subtle">Unassigned</span>}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={c.status} size="sm" />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-fg-subtle tabular">{formatDate(c.createdAt)}</td>
                <td className="py-2.5 pl-3 pr-5 text-right">
                  <Link href={hrefFor(c)} className="inline-flex h-8 items-center gap-1 rounded-chip px-2 text-[12.5px] font-semibold text-accent-text hover:bg-accent-soft">
                    Open <CaretRight size={12} weight="bold" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Placeholder rows shaped like the real list while it loads. */
export function ComplaintListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line" role="status" aria-label="Loading complaints">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[52px_1fr] items-center gap-4 px-4 py-3.5 sm:grid-cols-[64px_1fr] sm:px-5">
          <Skeleton className="aspect-square w-full" />
          <div className="grid gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { PriorityLabel };
