'use client';

import * as React from 'react';
import { useReducedMotion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Table } from '@phosphor-icons/react';
import { Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/*
 * Chart conventions (see the dataviz pass in docs/UI_UX_AUDIT.md):
 * - colors come from validated --chart-* tokens, one hue for single series
 * - one y-axis per chart, recessive grid, text in text tokens
 * - every chart has a hover tooltip and a table view
 */

const AXIS = { fontSize: 12, fill: 'var(--fg-subtle)' };

function useChartAnimation() {
  const reduce = useReducedMotion();
  return { isAnimationActive: !reduce, animationDuration: 650, animationEasing: 'ease-out' as const };
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ dataKey?: unknown; name?: unknown; value?: unknown; color?: string }>;
  label?: unknown;
  formatter?: (v: number) => string;
}

/** Recharts passes loosely typed props; only the fields used here are read. */
const tip = (p: unknown, extra: Partial<TipProps> = {}) => {
  const { active, payload, label } = p as TipProps;
  return <TooltipCard active={active} payload={payload} label={label} {...extra} />;
};

function TooltipCard({ active, payload, label, formatter }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[150px] rounded-[12px] border border-line bg-surface px-3 py-2.5 text-[12.5px] shadow-[var(--shadow-pop)]">
      {label !== undefined && <p className="mb-1.5 font-semibold text-fg">{String(label)}</p>}
      <ul className="grid gap-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-fg-muted">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: (p.color as string) ?? 'var(--chart-1)' }} aria-hidden />
              {String(p.name)}
            </span>
            <span className="font-semibold text-fg tabular">{formatter ? formatter(Number(p.value)) : String(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-[12.5px] font-medium text-fg-muted">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

interface ChartPanelProps {
  title: string;
  description?: string;
  loading?: boolean;
  empty?: boolean;
  emptyLabel?: string;
  height?: number;
  table: { columns: string[]; rows: (string | number)[][] };
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
  className?: string;
}

/** Panel with header, optional legend, chart body and an accessible table view. */
export function ChartPanel({ title, description, loading, empty, emptyLabel = 'No data yet', height = 260, table, legend, children, className }: ChartPanelProps) {
  const [showTable, setShowTable] = React.useState(false);
  const id = React.useId();
  return (
    <Panel className={cn('flex flex-col', className)}>
      <PanelHeader
        title={title}
        description={description}
        action={
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            aria-pressed={showTable}
            aria-controls={id}
            className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Table size={14} /> {showTable ? 'Chart' : 'Table'}
          </button>
        }
      />
      <div id={id} className="flex flex-1 flex-col gap-3 px-3 pb-4 pt-3 sm:px-4">
        {legend && !showTable && !loading && !empty && (
          <div className="px-2">
            <Legend items={legend} />
          </div>
        )}
        {loading ? (
          <Skeleton className="mx-2 rounded-[12px]" style={{ height }} />
        ) : empty ? (
          <div className="grid place-items-center text-sm text-fg-subtle" style={{ height }}>
            {emptyLabel}
          </div>
        ) : showTable ? (
          <div className="relative overflow-x-auto px-2" style={{ minHeight: height }}>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-fg-subtle">
                  {table.columns.map((c) => (
                    <th key={c} scope="col" className="py-2 pr-4 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    {r.map((cell, j) => (
                      <td key={j} className={cn('py-2 pr-4', j === 0 ? 'text-fg' : 'text-fg-muted tabular')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ height }} role="img" aria-label={`${title}. Use the Table button for the underlying values.`}>
            {children}
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

/** Horizontal bars for "magnitude per category". Single hue, labels on the axis. */
export function HorizontalBars({ data, valueLabel = 'Complaints' }: { data: { label: string; value: number }[]; valueLabel?: string }) {
  const anim = useChartAnimation();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--line)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={150} tick={{ ...AXIS, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => tip(p)} />
        <Bar dataKey="value" name={valueLabel} fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} {...anim} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Vertical bars for an ordered dimension (statuses, priorities). */
export function ColumnBars({ data, valueLabel = 'Complaints', colors }: { data: { label: string; value: number }[]; valueLabel?: string; colors?: string[] }) {
  const anim = useChartAnimation();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => tip(p)} />
        <Bar dataKey="value" name={valueLabel} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} {...anim}>
          {colors && data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface LineSeries {
  key: string;
  label: string;
  color: string;
}

/** Change over time. One y-axis; crosshair tooltip; last point directly labeled. */
export function TrendLines({
  data,
  xKey,
  series,
  formatX,
  formatValue,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: LineSeries[];
  formatX?: (v: string) => string;
  formatValue?: (v: number) => string;
}) {
  const anim = useChartAnimation();
  const last = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 12, right: 28, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={formatX} minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={formatValue} />
        <Tooltip
          cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
          content={(p) => {
            const raw = (p as TipProps).label;
            return tip(p, { label: raw !== undefined && formatX ? formatX(String(raw)) : raw, formatter: formatValue });
          }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4.5, stroke: 'var(--surface)', strokeWidth: 2 }}
            label={(raw: unknown) => {
              const props = raw as { index?: number; x?: number | string; y?: number | string };
              return props.index === last && series.length > 1 ? (
                <text x={Number(props.x) + 6} y={Number(props.y) + 4} fontSize={11} fill="var(--fg-muted)">
                  {s.label}
                </text>
              ) : (
                <g />
              );
            }}
            {...anim}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Stacked bars per entity, 2px surface gaps between segments. */
export function StackedBars({
  data,
  xKey,
  series,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  series: LineSeries[];
}) {
  const anim = useChartAnimation();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => tip(p)} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={s.color}
            stroke="var(--surface)"
            strokeWidth={2}
            maxBarSize={40}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            {...anim}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
