'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { CaretRight } from '@phosphor-icons/react';
import { CountUp } from '@/components/motion/reveal';
import { Skeleton } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-fg-subtle">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="rounded-chip font-medium transition-colors hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-fg-muted">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <CaretRight size={11} weight="bold" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Page title block: breadcrumbs, title, one line of context, and the page's actions. */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <div className={cn('mb-8 grid gap-3', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="grid min-w-0 max-w-3xl gap-2">
          <h1 className="type-page text-fg">{title}</h1>
          {description && <div className="max-w-[68ch] text-[15px] leading-relaxed text-fg-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type MetricTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'review';

const TONE_TEXT: Record<MetricTone, string> = {
  neutral: 'text-fg-subtle',
  accent: 'text-accent-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  review: 'text-st-review',
};

export interface Metric {
  label: string;
  value: number | string | null | undefined;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: MetricTone;
  href?: string;
}

function MetricBody({ m, loading }: { m: Metric; loading?: boolean }) {
  return (
    <>
      <p className="flex items-center gap-2 text-caption font-medium text-fg-muted">
        {m.icon && (
          <span className={cn('shrink-0', TONE_TEXT[m.tone ?? 'neutral'])} aria-hidden>
            {m.icon}
          </span>
        )}
        {m.label}
      </p>
      {loading ? (
        <Skeleton className="h-7 w-14" />
      ) : (
        <p className="type-metric text-fg">{typeof m.value === 'number' ? <CountUp value={m.value} /> : (m.value ?? '-')}</p>
      )}
      {m.hint && <p className="text-xs text-fg-subtle">{m.hint}</p>}
    </>
  );
}

/**
 * A row of key figures in one bordered strip, separated by hairlines instead
 * of a card per number. Wraps to two columns on small screens.
 */
export function MetricStrip({ metrics, loading, className, label }: { metrics: Metric[]; loading?: boolean; className?: string; label: string }) {
  const cols = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' }[metrics.length] ?? 'lg:grid-cols-4';
  return (
    <section aria-label={label} className={cn('panel overflow-hidden', className)}>
      <ul className={cn('grid grid-cols-2 gap-px bg-line', cols)}>
        {metrics.map((m) => {
          const content = (
            <div className="grid h-full content-start gap-2 bg-surface px-5 py-4">
              <MetricBody m={m} loading={loading} />
            </div>
          );
          return (
            <li key={m.label} className="min-w-0 [&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1">
              {m.href ? (
                <Link href={m.href} className="block h-full [&>div]:transition-colors hover:[&>div]:bg-surface-2">
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Single figure in its own card, for places where one number stands alone. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'neutral',
  loading,
  href,
  index = 0,
}: {
  label: string;
  value: number | string | null | undefined;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: MetricTone;
  loading?: boolean;
  href?: string;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const body = (
    <div className="grid gap-2">
      <MetricBody m={{ label, value, icon, hint, tone }} loading={loading} />
    </div>
  );
  return (
    <motion.div
      className="h-full"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      {href ? (
        <Link href={href} className="panel block h-full p-5 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2">
          {body}
        </Link>
      ) : (
        <div className="panel h-full p-5">{body}</div>
      )}
    </motion.div>
  );
}

/** Chip-style single-select filter row. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T | '';
  onChange: (v: T | '') => void;
  options: { value: T | ''; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value || 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-chip border px-3 text-[13px] font-semibold transition-colors duration-150',
              active ? 'border-accent-line bg-accent-soft text-accent-text' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="font-medium tabular opacity-70">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Section title used inside pages, below the page header. */
export function SectionHeader({ title, description, action, id, className }: { title: string; description?: React.ReactNode; action?: React.ReactNode; id?: string; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="grid gap-1">
        <h2 id={id} className="text-lg font-semibold tracking-[-0.015em] text-fg">
          {title}
        </h2>
        {description && <p className="text-sm text-fg-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
