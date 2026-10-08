'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { CaretRight } from '@phosphor-icons/react';
import { CATEGORY_META, type ComplaintListItem } from '@fixmycity/shared';
import { CategoryChip, DemoTag, PriorityLabel, StatusBadge, TrackingId } from '@/components/common/complaint-meta';
import { Skeleton } from '@/components/ui/primitives';
import { formatDate, timeAgo } from '@/lib/utils';
import { ComplaintThumb } from './complaint-media';

/** Card list for citizens and for narrow screens. */
export function ComplaintCards({ items, hrefFor }: { items: ComplaintListItem[]; hrefFor: (c: ComplaintListItem) => string }) {
  return (
    <ul className="grid gap-3">
      {items.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03 }}>
          <Link
            href={hrefFor(c)}
            className="panel group grid grid-cols-[64px_1fr_auto] items-center gap-4 p-3.5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong sm:grid-cols-[84px_1fr_auto] sm:p-4"
          >
            <ComplaintThumb src={c.thumbnailUrl} category={c.category} title={c.title} className="aspect-square w-full" />
            <div className="grid min-w-0 gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <TrackingId value={c.trackingId} />
                {c.isDemo && <DemoTag />}
              </div>
              <p className="truncate text-[15px] font-bold text-fg">{c.title}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusBadge status={c.status} size="sm" />
                <span className="hidden sm:inline">
                  <CategoryChip category={c.category} />
                </span>
                <span className="text-xs text-fg-subtle">Updated {timeAgo(c.updatedAt)}</span>
              </div>
            </div>
            <CaretRight size={16} className="text-fg-subtle transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}

/** Dense table for staff, collapsing to cards below the md breakpoint. */
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
      <div className="p-4 md:hidden">
        <ComplaintCards items={items} hrefFor={hrefFor} />
      </div>
      {/* relative: keeps absolutely positioned descendants (sr-only labels) inside the scroll clip */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] font-semibold text-fg-subtle">
              <th scope="col" className="py-3 pl-5 pr-3">Complaint</th>
              <th scope="col" className="px-3 py-3">Category</th>
              <th scope="col" className="px-3 py-3">Priority</th>
              <th scope="col" className="px-3 py-3">Department</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3">Submitted</th>
              <th scope="col" className="py-3 pl-3 pr-5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="group border-b border-line/70 transition-colors last:border-0 hover:bg-surface-2/60">
                <td className="max-w-[320px] py-3 pl-5 pr-3">
                  <Link href={hrefFor(c)} className="grid gap-0.5">
                    <span className="flex items-center gap-2">
                      <TrackingId value={c.trackingId} />
                      {c.isDemo && <DemoTag />}
                    </span>
                    <span className="truncate font-bold text-fg group-hover:text-accent">{c.title}</span>
                    <span className="truncate text-xs text-fg-subtle">
                      {c.address}
                      {showCitizen && c.citizen ? ` · ${c.citizen.name}` : ''}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-fg-muted">{CATEGORY_META[c.category].label}</td>
                <td className="px-3 py-3">
                  <PriorityLabel priority={c.priority} suggested={suggestedPriorities && !c.department} />
                </td>
                <td className="px-3 py-3 text-fg-muted">{c.department ? c.department.name.replace(' Department', '') : <span className="text-fg-subtle">Unassigned</span>}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={c.status} size="sm" />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-fg-subtle">{formatDate(c.createdAt)}</td>
                <td className="py-3 pl-3 pr-5 text-right">
                  <Link href={hrefFor(c)} className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-accent hover:bg-accent-soft">
                    Open <CaretRight size={12} />
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

export function ComplaintListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3 p-4">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-[14px]" />
      ))}
    </div>
  );
}

export { PriorityLabel };
