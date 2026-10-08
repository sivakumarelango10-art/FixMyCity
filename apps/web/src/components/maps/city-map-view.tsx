'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CaretRight, ListBullets, MapTrifold } from '@phosphor-icons/react';
import {
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  STATUS_LABELS,
  type ComplaintCategory,
  type ComplaintStatus,
  type PublicMapComplaint,
} from '@fixmycity/shared';
import { CategoryIcon, ROUTE_STAGE_LABELS, StatusBadge, routeStage, type RouteStage } from '@/components/common/complaint-meta';
import { EmptyState, ErrorState, Panel, Skeleton, Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { api, toQuery } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, timeAgo } from '@/lib/utils';
import { IssuesMap } from './index';

const STAGE_SWATCH: Record<RouteStage, string> = {
  open: 'bg-accent',
  progress: 'bg-st-progress',
  resolved: 'bg-st-resolved opacity-80',
  closed: 'bg-fg-subtle opacity-60',
};

/** Map key: what the pin colors mean, with live counts for the current filter. */
export function MapLegend({ items, className }: { items: PublicMapComplaint[]; className?: string }) {
  const counts = new Map<RouteStage, number>();
  for (const c of items) counts.set(routeStage(c.status), (counts.get(routeStage(c.status)) ?? 0) + 1);
  const stages = (['open', 'progress', 'resolved', 'closed'] as const).filter((s) => s !== 'closed' || counts.get('closed'));
  return (
    <div className={cn('grid gap-2', className)}>
      <ul className="grid gap-1.5" aria-label="Map legend">
        {stages.map((s) => (
          <li key={s} className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-2 text-fg-muted">
              <span className={cn('h-3 w-3 rounded-[4px]', STAGE_SWATCH[s])} aria-hidden />
              {ROUTE_STAGE_LABELS[s]}
            </span>
            <span className="font-semibold text-fg tabular">{counts.get(s) ?? 0}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-relaxed text-fg-subtle">The glyph on each pin shows the category. Pulsing pins were reported in the last 48 hours.</p>
    </div>
  );
}

function ReportRow({ c, selected, onSelect, href }: { c: PublicMapComplaint; selected?: boolean; onSelect?: () => void; href: string | null }) {
  const body = (
    <>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-chip border border-line bg-surface-2 text-fg-muted">
        <CategoryIcon category={c.category} size={16} />
      </span>
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="truncate text-sm font-semibold text-fg">{c.title}</span>
        <span className="truncate text-xs text-fg-subtle">{c.address}</span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} size="sm" />
          <span className="text-xs text-fg-subtle">
            {timeAgo(c.createdAt)}
            {c.isMine ? ', yours' : ''}
          </span>
        </span>
      </span>
    </>
  );
  const cls = cn('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2', selected && 'bg-accent-soft hover:bg-accent-soft');
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className={cls}>
        {body}
      </button>
    );
  }
  return href ? (
    <Link href={href} className={cls}>
      {body}
      <CaretRight size={14} className="mt-2 shrink-0 text-fg-subtle" />
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** City-wide issue map with category/status filters, a synced report list and a list view. Public-safe data only. */
export function CityMapView({ linkFor }: { linkFor: (c: PublicMapComplaint) => string | null }) {
  const [category, setCategory] = React.useState<ComplaintCategory | ''>('');
  const [status, setStatus] = React.useState<ComplaintStatus | ''>('');
  const [view, setView] = React.useState<'map' | 'list'>('map');
  const [selected, setSelected] = React.useState<string | null>(null);
  const params = { category: category || undefined, status: status || undefined };
  const q = useQuery({
    queryKey: qk.publicMap(params),
    queryFn: () => api.get<PublicMapComplaint[]>(`/api/public/map${toQuery(params)}`),
    refetchInterval: 60_000,
  });
  const items = q.data ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          size="sm"
          value={category}
          onValueChange={(v) => setCategory(v as ComplaintCategory | '')}
          options={[{ value: '', label: 'All categories' }, ...COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))]}
          aria-label="Filter map by category"
          className="w-auto min-w-44"
        />
        <Select
          size="sm"
          value={status}
          onValueChange={(v) => setStatus(v as ComplaintStatus | '')}
          options={[{ value: '', label: 'Open and resolved' }, ...COMPLAINT_STATUSES.filter((s) => s !== 'REJECTED').map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          aria-label="Filter map by status"
          className="w-auto min-w-40"
        />
        <span className="text-[13px] text-fg-subtle tabular" aria-live="polite">
          {q.isLoading ? 'Loading reports' : `${items.length} ${items.length === 1 ? 'report' : 'reports'}`}
        </span>
        <Tabs value={view} onValueChange={(v) => setView(v as 'map' | 'list')} className="ml-auto">
          <TabsList aria-label="Choose view">
            <TabsTrigger value="map">
              <MapTrifold size={15} /> Map
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListBullets size={15} /> List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {q.isError ? (
        <ErrorState className="panel" title="The map data could not be loaded" message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : view === 'map' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,360px)_1fr]">
          <Panel className="order-2 flex max-h-[min(70dvh,660px)] min-h-0 flex-col overflow-hidden lg:order-1">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-fg">Reports on the map</h2>
              <span className="text-xs text-fg-subtle">Select one to find it</span>
            </div>
            {q.isLoading ? (
              <div className="grid gap-2 p-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState icon={<MapTrifold size={22} />} title="No reports match" description="Nothing is on the map for this filter. Try another category or status." />
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
                {items.slice(0, 100).map((c) => (
                  <li key={c.id}>
                    <ReportRow c={c} href={linkFor(c)} selected={selected === c.id} onSelect={() => setSelected(c.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <div className="order-1 grid gap-3 lg:order-2">
            <div className="panel relative overflow-hidden">
              <IssuesMap complaints={items} showLocate linkFor={linkFor} selectedId={selected} className="h-[min(62dvh,560px)] min-h-[340px]" />
            </div>
            <Panel className="px-4 py-3.5">
              <MapLegend items={items} />
            </Panel>
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="panel" icon={<MapTrifold size={22} />} title="No reports match" description="Nothing has been reported for this filter. Try another category or status." />
      ) : (
        <Panel className="overflow-hidden">
          <ul className="divide-y divide-line">
            {items.slice(0, 100).map((c) => (
              <li key={c.id}>
                <ReportRow c={c} href={linkFor(c)} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
