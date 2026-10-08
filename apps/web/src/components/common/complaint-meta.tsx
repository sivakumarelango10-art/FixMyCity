'use client';

import {
  ArrowCounterClockwise,
  Barricade,
  Broom,
  Buildings,
  CheckCircle,
  DotsThreeCircle,
  Drop,
  Lightbulb,
  MagnifyingGlass,
  PaperPlaneTilt,
  RoadHorizon,
  Signpost,
  TrafficSignal,
  Trash,
  Waves,
  Wrench,
  XCircle,
  type Icon,
} from '@phosphor-icons/react';
import {
  CATEGORY_META,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ComplaintCategory,
  type ComplaintStatus,
  type Priority,
} from '@fixmycity/shared';
import { cn } from '@/lib/utils';

export const STATUS_ICONS: Record<ComplaintStatus, Icon> = {
  SUBMITTED: PaperPlaneTilt,
  UNDER_REVIEW: MagnifyingGlass,
  ASSIGNED: Signpost,
  IN_PROGRESS: Wrench,
  RESOLVED: CheckCircle,
  REJECTED: XCircle,
  REOPENED: ArrowCounterClockwise,
};

/** Tailwind classes per status. Always rendered together with an icon and label. */
export const STATUS_STYLES: Record<ComplaintStatus, { text: string; bg: string; border: string; dot: string }> = {
  SUBMITTED: { text: 'text-st-submitted', bg: 'bg-st-submitted/12', border: 'border-st-submitted/30', dot: 'bg-st-submitted' },
  UNDER_REVIEW: { text: 'text-st-review', bg: 'bg-st-review/12', border: 'border-st-review/30', dot: 'bg-st-review' },
  ASSIGNED: { text: 'text-st-assigned', bg: 'bg-st-assigned/12', border: 'border-st-assigned/30', dot: 'bg-st-assigned' },
  IN_PROGRESS: { text: 'text-st-progress', bg: 'bg-st-progress/12', border: 'border-st-progress/30', dot: 'bg-st-progress' },
  RESOLVED: { text: 'text-st-resolved', bg: 'bg-st-resolved/12', border: 'border-st-resolved/30', dot: 'bg-st-resolved' },
  REJECTED: { text: 'text-st-rejected', bg: 'bg-st-rejected/12', border: 'border-st-rejected/30', dot: 'bg-st-rejected' },
  REOPENED: { text: 'text-st-reopened', bg: 'bg-st-reopened/12', border: 'border-st-reopened/30', dot: 'bg-st-reopened' },
};

export function StatusBadge({ status, className, size = 'md' }: { status: ComplaintStatus; className?: string; size?: 'sm' | 'md' }) {
  const Icon = STATUS_ICONS[status];
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        s.text,
        s.bg,
        s.border,
        className,
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} weight="bold" aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'text-fg-subtle',
  MEDIUM: 'text-fg-muted',
  HIGH: 'text-st-reopened',
  CRITICAL: 'text-danger',
};

/** Priority as a compact bar meter plus label (never color alone). */
export function PriorityLabel({ priority, suggested, className }: { priority: Priority; suggested?: boolean; className?: string }) {
  const level = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[priority];
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-semibold', PRIORITY_STYLES[priority], className)}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('w-[3px] rounded-full', i <= level ? 'bg-current' : 'bg-line-strong')} style={{ height: 4 + i * 2.5 }} />
        ))}
      </span>
      {PRIORITY_LABELS[priority]}
      {suggested && <span className="font-normal text-fg-subtle">(suggested)</span>}
    </span>
  );
}

export const CATEGORY_ICONS: Record<ComplaintCategory, Icon> = {
  POTHOLES: Barricade,
  ROAD_DAMAGE: RoadHorizon,
  WATER_LEAKAGE: Drop,
  GARBAGE_COLLECTION: Trash,
  STREETLIGHT_FAILURE: Lightbulb,
  DRAINAGE: Waves,
  PUBLIC_SANITATION: Broom,
  TRAFFIC_INFRASTRUCTURE: TrafficSignal,
  PUBLIC_PROPERTY_DAMAGE: Buildings,
  OTHER: DotsThreeCircle,
};

/** Fixed category hues, used for map markers and category chips. */
export const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  POTHOLES: '#ff734f',
  ROAD_DAMAGE: '#ff8f5e',
  TRAFFIC_INFRASTRUCTURE: '#ffa26b',
  WATER_LEAKAGE: '#2fc6dc',
  DRAINAGE: '#5ba8ff',
  GARBAGE_COLLECTION: '#3fbf95',
  PUBLIC_SANITATION: '#57d8ad',
  STREETLIGHT_FAILURE: '#e9a83a',
  PUBLIC_PROPERTY_DAMAGE: '#8f9bbd',
  OTHER: '#7f8aa8',
};

export function CategoryIcon({ category, size = 18, className }: { category: ComplaintCategory; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={size} className={className} aria-hidden />;
}

export function CategoryChip({ category, className }: { category: ComplaintCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted', className)}>
      <span className="grid h-6 w-6 place-items-center rounded-lg" style={{ background: `${CATEGORY_COLORS[category]}22`, color: CATEGORY_COLORS[category] }}>
        <Icon size={14} weight="bold" aria-hidden />
      </span>
      {CATEGORY_META[category].label}
    </span>
  );
}

export function TrackingId({ value, className }: { value: string; className?: string }) {
  return <span className={cn('font-mono text-[12.5px] font-medium tracking-tight text-fg-muted', className)}>{value}</span>;
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-line-strong px-2 py-0.5 text-[10.5px] font-semibold text-fg-subtle', className)}>
      Demo record
    </span>
  );
}
