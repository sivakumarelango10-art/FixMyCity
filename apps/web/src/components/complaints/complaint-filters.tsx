'use client';

import * as React from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import {
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ComplaintCategory,
  type ComplaintStatus,
  type Priority,
} from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

export interface ComplaintFilterState {
  search: string;
  status: ComplaintStatus | '';
  category: ComplaintCategory | '';
  priority: Priority | '';
  departmentId: string;
  from: string;
  to: string;
  sort: 'createdAt' | 'updatedAt' | 'priority' | 'trackingNumber' | 'title';
  order: 'asc' | 'desc';
}

export const EMPTY_FILTERS: ComplaintFilterState = {
  search: '',
  status: '',
  category: '',
  priority: '',
  departmentId: '',
  from: '',
  to: '',
  sort: 'createdAt',
  order: 'desc',
};

const SORTS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
  { value: 'priority:desc', label: 'Highest priority' },
  { value: 'trackingNumber:asc', label: 'Tracking ID' },
];

export function useDebouncedValue<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Filter bar shared by citizen, admin and officer complaint lists. */
export function ComplaintFilters({
  value,
  onChange,
  departments,
  showPriority = true,
  showDates = false,
}: {
  value: ComplaintFilterState;
  onChange: (v: ComplaintFilterState) => void;
  departments?: { id: string; name: string }[];
  showPriority?: boolean;
  showDates?: boolean;
}) {
  const set = <K extends keyof ComplaintFilterState>(k: K, v: ComplaintFilterState[K]) => onChange({ ...value, [k]: v });
  const active = value.search || value.status || value.category || value.priority || value.departmentId || value.from || value.to;
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto]">
        <div className="relative">
          <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={value.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search by tracking ID, title or address"
            aria-label="Search complaints"
            className="pl-10"
          />
        </div>
        <Select
          value={`${value.sort}:${value.order}`}
          onValueChange={(v) => {
            const [sort, order] = v.split(':') as [ComplaintFilterState['sort'], ComplaintFilterState['order']];
            onChange({ ...value, sort, order });
          }}
          options={SORTS}
          aria-label="Sort complaints"
          className="md:w-48"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          size="sm"
          value={value.status}
          onValueChange={(v) => set('status', v as ComplaintStatus | '')}
          options={[{ value: '', label: 'All statuses' }, ...COMPLAINT_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))]}
          aria-label="Filter by status"
          className="w-auto min-w-36"
        />
        <Select
          size="sm"
          value={value.category}
          onValueChange={(v) => set('category', v as ComplaintCategory | '')}
          options={[{ value: '', label: 'All categories' }, ...COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))]}
          aria-label="Filter by category"
          className="w-auto min-w-40"
        />
        {showPriority && (
          <Select
            size="sm"
            value={value.priority}
            onValueChange={(v) => set('priority', v as Priority | '')}
            options={[{ value: '', label: 'Any priority' }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))]}
            aria-label="Filter by priority"
            className="w-auto min-w-32"
          />
        )}
        {departments && (
          <Select
            size="sm"
            value={value.departmentId}
            onValueChange={(v) => set('departmentId', v)}
            options={[{ value: '', label: 'All departments' }, { value: 'unassigned', label: 'Unassigned' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            aria-label="Filter by department"
            className="w-auto min-w-44"
          />
        )}
        {showDates && (
          <>
            <label className="sr-only" htmlFor="filter-from">
              Submitted from
            </label>
            <Input id="filter-from" type="date" value={value.from} onChange={(e) => set('from', e.target.value)} className="h-9 w-auto rounded-control px-3 text-[13px]" />
            <span className="text-xs text-fg-subtle">to</span>
            <label className="sr-only" htmlFor="filter-to">
              Submitted to
            </label>
            <Input id="filter-to" type="date" value={value.to} onChange={(e) => set('to', e.target.value)} className="h-9 w-auto rounded-control px-3 text-[13px]" />
          </>
        )}
        {active && (
          <Button variant="ghost" size="sm" onClick={() => onChange({ ...EMPTY_FILTERS, sort: value.sort, order: value.order })}>
            <X size={14} /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

/** Converts filter state into API query params. */
export function filtersToParams(f: ComplaintFilterState, debouncedSearch: string, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: f.status || undefined,
    category: f.category || undefined,
    priority: f.priority || undefined,
    departmentId: f.departmentId || undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    sort: f.sort,
    order: f.order,
  };
}
