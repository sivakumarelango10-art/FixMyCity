'use client';

import * as React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CATEGORY_META, type AdminAnalytics } from '@fixmycity/shared';
import { CategoryChart, PriorityChart, ResolutionTrendChart, StatusChart, TrendChart, WorkloadChart } from '@/components/admin/analytics-charts';
import { PageHeader, StatCard } from '@/components/common/page';
import { ErrorState, Panel, PanelHeader, Tabs, TabsList, TabsTrigger } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatHours } from '@/lib/utils';

const RANGES = [7, 30, 90] as const;

export default function AnalyticsPage() {
  const [days, setDays] = React.useState<number>(30);
  const q = useQuery({
    queryKey: qk.adminAnalytics(days),
    queryFn: () => api.get<AdminAnalytics>(`/api/admin/analytics?days=${days}`),
    placeholderData: keepPreviousData,
  });
  const a = q.data;
  const resolvedShare = a && a.totals.total ? Math.round((a.totals.RESOLVED / a.totals.total) * 1000) / 10 : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Analytics' }]}
        title="Service insights"
        description="All figures are computed from complaint records in the database. Seeded demo records are included."
        actions={
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList aria-label="Time range">
              {RANGES.map((r) => (
                <TabsTrigger key={r} value={String(r)}>
                  {r} days
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        className="mb-0"
      />
      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <section aria-label="Key figures" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Open complaints" value={a?.totals.open} loading={q.isLoading} />
        <StatCard index={1} label="Resolved share" value={resolvedShare === null ? undefined : `${resolvedShare}%`} loading={q.isLoading} hint="Resolved out of all complaints" />
        <StatCard
          index={2}
          label="Avg. resolution time"
          value={a ? (formatHours(a.averageResolutionHours) ?? 'Not enough data') : undefined}
          loading={q.isLoading}
          hint={a ? `Shown once at least 3 are resolved (${a.resolvedSampleSize} so far)` : undefined}
        />
        <StatCard index={3} label="Rejected" value={a?.totals.REJECTED} loading={q.isLoading} hint="Duplicates and invalid reports" />
      </section>

      <TrendChart a={a} loading={q.isLoading} />
      <div className="grid gap-6 xl:grid-cols-2">
        <WorkloadChart a={a} loading={q.isLoading} />
        <ResolutionTrendChart a={a} loading={q.isLoading} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CategoryChart a={a} loading={q.isLoading} />
        </div>
        <PriorityChart a={a} loading={q.isLoading} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <StatusChart a={a} loading={q.isLoading} />
        <Panel>
          <PanelHeader title="Repeat issue locations" description="Places with two or more reports in the same category (grouped within roughly 100 m)." />
          <div className="p-5 sm:p-6">
            {a && a.repeatHotspots.length > 0 ? (
              <ul className="grid gap-3">
                {a.repeatHotspots.map((h) => (
                  <li key={`${h.address}-${h.category}`} className="flex items-center justify-between gap-4 rounded-[12px] bg-surface-2 px-4 py-3">
                    <span className="grid min-w-0">
                      <span className="truncate text-[13.5px] font-semibold text-fg">{h.address}</span>
                      <span className="text-xs text-fg-subtle">{CATEGORY_META[h.category].label}</span>
                    </span>
                    <span className="text-lg font-extrabold text-fg tabular">{h.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-subtle">{q.isLoading ? 'Loading' : 'No repeated locations yet.'}</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
