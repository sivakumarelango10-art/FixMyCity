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
  SUBMITTED: { text: 'text-st-submitted', bg: 'bg-st-submitted/10', border: 'border-st-submitted/30', dot: 'bg-st-submitted' },
  UNDER_REVIEW: { text: 'text-st-review', bg: 'bg-st-review/10', border: 'border-st-review/30', dot: 'bg-st-review' },
  ASSIGNED: { text: 'text-st-assigned', bg: 'bg-st-assigned/10', border: 'border-st-assigned/30', dot: 'bg-st-assigned' },
  IN_PROGRESS: { text: 'text-st-progress', bg: 'bg-st-progress/10', border: 'border-st-progress/30', dot: 'bg-st-progress' },
  RESOLVED: { text: 'text-st-resolved', bg: 'bg-st-resolved/10', border: 'border-st-resolved/30', dot: 'bg-st-resolved' },
  REJECTED: { text: 'text-st-rejected', bg: 'bg-st-rejected/10', border: 'border-st-rejected/30', dot: 'bg-st-rejected' },
  REOPENED: { text: 'text-st-reopened', bg: 'bg-st-reopened/10', border: 'border-st-reopened/30', dot: 'bg-st-reopened' },
};

/** Status plate: icon and label on a tint of the status color. */
export function StatusBadge({ status, className, size = 'md' }: { status: ComplaintStatus; className?: string; size?: 'sm' | 'md' }) {
  const Icon = STATUS_ICONS[status];
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip border font-semibold',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11.5px]' : 'px-2 py-1 text-xs',
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

/**
 * Where a report sits on its route, grouped for the map: waiting for work,
 * being worked on, resolved, or closed without action.
 */
export type RouteStage = 'open' | 'progress' | 'resolved' | 'closed';

export function routeStage(status: ComplaintStatus): RouteStage {
  if (status === 'IN_PROGRESS') return 'progress';
  if (status === 'RESOLVED') return 'resolved';
  if (status === 'REJECTED') return 'closed';
  return 'open';
}

export const ROUTE_STAGE_LABELS: Record<RouteStage, string> = {
  open: 'Reported, awaiting work',
  progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed without action',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: 'text-fg-subtle',
  MEDIUM: 'text-fg-muted',
  HIGH: 'text-st-progress',
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
export const CATEGORY_COLORS: Record<ComplaintCategory, string> = {
  POTHOLES: '#f59e0b',
  ROAD_DAMAGE: '#ea580c',
  WATER_LEAKAGE: '#0284c7',
  GARBAGE_COLLECTION: '#10b981',
  STREETLIGHT_FAILURE: '#eab308',
  DRAINAGE: '#2563eb',
  PUBLIC_SANITATION: '#0d9488',
  TRAFFIC_INFRASTRUCTURE: '#8b5cf6',
  PUBLIC_PROPERTY_DAMAGE: '#e11d48',
  OTHER: '#64748b',
};

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

export function CategoryIcon({ category, size = 18, className }: { category: ComplaintCategory; size?: number; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon size={size} className={className} aria-hidden />;
}

/** Category as a neutral glyph tile plus label. Category is identity, so it carries no status color. */
export function CategoryChip({ category, className }: { category: ComplaintCategory; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted', className)}>
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-chip border border-line bg-surface-2 text-fg-muted">
        <Icon size={14} weight="bold" aria-hidden />
      </span>
      {CATEGORY_META[category].label}
    </span>
  );
}

export function TrackingId({ value, className }: { value: string; className?: string }) {
  return <span className={cn('font-mono text-xs font-medium tracking-tight text-fg-subtle', className)}>{value}</span>;
}

export function DemoTag({ className, label = 'Demo record' }: { className?: string; label?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-chip border border-dashed border-line-strong px-1.5 py-px text-[11px] font-semibold text-fg-subtle', className)}>
      {label}
    </span>
  );
}
