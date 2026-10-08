'use client';

import {
  CATEGORY_META,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type AdminAnalytics,
} from '@fixmycity/shared';
import { ChartPanel, ColumnBars, HorizontalBars, StackedBars, TrendLines } from '@/components/charts/charts';
import { formatDate } from '@/lib/utils';

const WORKLOAD_SERIES = [
  { key: 'assigned', label: 'Assigned', color: 'var(--chart-1)' },
  { key: 'inProgress', label: 'In progress', color: 'var(--chart-2)' },
  { key: 'resolved', label: 'Resolved', color: 'var(--chart-3)' },
];

const TREND_SERIES = [
  { key: 'submitted', label: 'Submitted', color: 'var(--chart-1)' },
  { key: 'resolved', label: 'Resolved', color: 'var(--chart-3)' },
];

// Short axis labels so six departments fit side by side without overlapping.
const SHORT_DEPT: Record<string, string> = { ROADS: 'Roads', WATER: 'Water', SANITATION: 'Sanitation', LIGHTING: 'Lighting', DRAINAGE: 'Drainage', GENERAL: 'General' };
const shortDept = (code: string, name: string) => SHORT_DEPT[code] ?? name.replace(' Department', '');

export function TrendChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = a?.trend ?? [];
  return (
    <ChartPanel
      title="Complaints over time"
      description={a ? `Submitted and resolved per day, last ${a.rangeDays} days.` : undefined}
      loading={loading}
      empty={!!a && data.every((d) => d.submitted === 0 && d.resolved === 0)}
      legend={TREND_SERIES}
      height={260}
      table={{ columns: ['Date', 'Submitted', 'Resolved'], rows: data.map((d) => [formatDate(d.date), d.submitted, d.resolved]) }}
    >
      <TrendLines data={data} xKey="date" series={TREND_SERIES} formatX={(v) => formatDate(v, 'd MMM')} />
    </ChartPanel>
  );
}

export function WorkloadChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = (a?.departmentWorkload ?? []).map((d) => ({ name: shortDept(d.code, d.name), assigned: d.assigned, inProgress: d.inProgress, resolved: d.resolved }));
  return (
    <ChartPanel
      title="Department workload"
      description="Complaints currently held by each department."
      loading={loading}
      empty={!!a && data.every((d) => d.assigned + d.inProgress + d.resolved === 0)}
      legend={WORKLOAD_SERIES}
      height={260}
      table={{ columns: ['Department', 'Assigned', 'In progress', 'Resolved'], rows: data.map((d) => [d.name, d.assigned, d.inProgress, d.resolved]) }}
    >
      <StackedBars data={data} xKey="name" series={WORKLOAD_SERIES} />
    </ChartPanel>
  );
}

export function CategoryChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = (a?.byCategory ?? []).map((c) => ({ label: CATEGORY_META[c.category].label, value: c.count }));
  return (
    <ChartPanel
      title="Complaints by category"
      loading={loading}
      empty={!!a && data.length === 0}
      height={Math.max(220, data.length * 30)}
      table={{ columns: ['Category', 'Complaints'], rows: data.map((d) => [d.label, d.value]) }}
    >
      <HorizontalBars data={data} />
    </ChartPanel>
  );
}

export function StatusChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = (a?.byStatus ?? []).map((s) => ({ label: STATUS_LABELS[s.status], value: s.count }));
  return (
    <ChartPanel
      title="Complaints by status"
      loading={loading}
      empty={!!a && a.totals.total === 0}
      height={240}
      table={{ columns: ['Status', 'Complaints'], rows: data.map((d) => [d.label, d.value]) }}
    >
      <ColumnBars data={data.map((d) => ({ ...d, label: d.label.replace('Under review', 'Review').replace('In progress', 'Progress') }))} />
    </ChartPanel>
  );
}

export function PriorityChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = (a?.byPriority ?? []).map((p) => ({ label: PRIORITY_LABELS[p.priority], value: p.count }));
  return (
    <ChartPanel
      title="Priority distribution"
      description="Priority currently set on each complaint."
      loading={loading}
      empty={!!a && a.totals.total === 0}
      height={220}
      table={{ columns: ['Priority', 'Complaints'], rows: data.map((d) => [d.label, d.value]) }}
    >
      <ColumnBars data={data} />
    </ChartPanel>
  );
}

export function ResolutionTrendChart({ a, loading }: { a?: AdminAnalytics; loading: boolean }) {
  const data = (a?.resolutionTrend ?? []).map((w) => ({ week: w.week, averageHours: w.averageHours, count: w.count }));
  return (
    <ChartPanel
      title="Average resolution time"
      description="Hours from submission to resolution, by week of resolution (last 12 weeks)."
      loading={loading}
      empty={!!a && data.length < 2}
      emptyLabel="Not enough resolved complaints to show a trend yet"
      height={220}
      table={{ columns: ['Week of', 'Average hours', 'Resolved'], rows: data.map((d) => [formatDate(d.week), d.averageHours, d.count]) }}
    >
      <TrendLines
        data={data}
        xKey="week"
        series={[{ key: 'averageHours', label: 'Average hours', color: 'var(--chart-1)' }]}
        formatX={(v) => formatDate(v, 'd MMM')}
        formatValue={(v) => `${Math.round(v)} h`}
      />
    </ChartPanel>
  );
}
