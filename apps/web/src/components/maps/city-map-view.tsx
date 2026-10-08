'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ListBullets, MapTrifold } from '@phosphor-icons/react';
import {
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  STATUS_LABELS,
  type ComplaintCategory,
  type ComplaintStatus,
  type PublicMapComplaint,
} from '@fixmycity/shared';
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryChip, StatusBadge } from '@/components/common/complaint-meta';
import { EmptyState, ErrorState, Panel, Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { api, toQuery } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { timeAgo } from '@/lib/utils';
import { IssuesMap } from './index';

/** City-wide issue map with category/status filters and a list view. Public-safe data only. */
export function CityMapView({ linkFor }: { linkFor: (c: PublicMapComplaint) => string | null }) {
  const [category, setCategory] = React.useState<ComplaintCategory | ''>('');
  const [status, setStatus] = React.useState<ComplaintStatus | ''>('');
  const [view, setView] = React.useState<'map' | 'list'>('map');
  const params = { category: category || undefined, status: status || undefined };
  const q = useQuery({
    queryKey: qk.publicMap(params),
    queryFn: () => api.get<PublicMapComplaint[]>(`/api/public/map${toQuery(params)}`),
    refetchInterval: 60_000,
  });
  const items = q.data ?? [];
  const counts = new Map<ComplaintCategory, number>();
  for (const c of items) counts.set(c.category, (counts.get(c.category) ?? 0) + 1);

  return (
    <div className="grid gap-5">
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
        <span className="text-[13px] text-fg-subtle">{q.isLoading ? 'Loading' : `${items.length} reports`}</span>
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
        <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : view === 'map' ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
          <Panel className="overflow-hidden p-1.5">
            <IssuesMap complaints={items} showLocate linkFor={linkFor} className="h-[min(68dvh,640px)] min-h-[380px] rounded-[14px]" />
          </Panel>
          <Panel className="p-5">
            <p className="mb-3 text-sm font-bold text-fg">Legend</p>
            <ul className="grid gap-2.5">
              {COMPLAINT_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                return (
                  <li key={c} className="flex items-center justify-between gap-2 text-[13px] text-fg-muted">
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: CATEGORY_COLORS[c] }}>
                        <Icon size={13} weight="bold" />
                      </span>
                      {CATEGORY_META[c].label}
                    </span>
                    <span className="font-semibold text-fg tabular">{counts.get(c) ?? 0}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[12px] leading-relaxed text-fg-subtle">Faded pins are resolved. Pulsing pins were reported in the last 48 hours. Demo records are labeled in their popups.</p>
          </Panel>
        </div>
      ) : items.length === 0 ? (
        <EmptyState className="panel" icon={<MapTrifold size={22} />} title="No reports match" description="Try another category or status." />
      ) : (
        <Panel>
          <ul className="divide-y divide-line">
            {items.slice(0, 100).map((c) => {
              const href = linkFor(c);
              const body = (
                <div className="grid gap-1.5 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="grid min-w-0 gap-1">
                    <p className="truncate font-semibold text-fg">{c.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <CategoryChip category={c.category} />
                      <span className="text-xs text-fg-subtle">{c.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <StatusBadge status={c.status} size="sm" />
                    <span className="text-xs text-fg-subtle">
                      {timeAgo(c.createdAt)}
                      {c.isMine ? ', yours' : ''}
                    </span>
                  </div>
                </div>
              );
              return <li key={c.id}>{href ? <Link href={href} className="block transition-colors hover:bg-surface-2">{body}</Link> : body}</li>;
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
