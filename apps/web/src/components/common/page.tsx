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
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-fg-subtle">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="font-medium transition-colors hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-fg-muted">
                {item.label}
              </span>
            )}
            {i < items.length - 1 && <CaretRight size={11} aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

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
    <div className={cn('mb-7 grid gap-3', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-1.5">
          <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-fg sm:text-[1.75rem]">{title}</h1>
          {description && <p className="max-w-[70ch] text-[15px] leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

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
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'review';
  loading?: boolean;
  href?: string;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const tones = {
    neutral: 'bg-surface-2 text-fg-muted',
    accent: 'bg-accent-soft text-accent',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    review: 'bg-st-review/12 text-st-review',
  } as const;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-fg-muted">{label}</p>
        {icon && <span className={cn('grid h-8 w-8 place-items-center rounded-[10px]', tones[tone])}>{icon}</span>}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-[1.75rem] font-extrabold leading-none tracking-tight text-fg tabular">
          {typeof value === 'number' ? <CountUp value={value} /> : (value ?? '-')}
        </p>
      )}
      {hint && <p className="mt-2 text-[12.5px] text-fg-subtle">{hint}</p>}
    </>
  );
  return (
    <motion.div
      className="h-full"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      {href ? (
        <Link href={href} className="panel block h-full p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong">
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
}: {
  value: T | '';
  onChange: (v: T | '') => void;
  options: { value: T | ''; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
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
              'h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors duration-150',
              active ? 'border-accent-line bg-accent-soft text-accent' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
