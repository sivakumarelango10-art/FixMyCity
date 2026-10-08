'use client';

import * as React from 'react';
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { CATEGORY_META, COMPLAINT_CATEGORIES, DEPARTMENT_DEFAULTS } from '@fixmycity/shared';
import { CATEGORY_ICONS } from '@/components/common/complaint-meta';
import { FilterChips } from '@/components/common/page';
import { Input } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

const GROUPS = Array.from(new Set(COMPLAINT_CATEGORIES.map((c) => CATEGORY_META[c].group)));

/** Searchable list of what can be reported and which department it goes to by default. */
export function CategoryDirectory() {
  const [query, setQuery] = React.useState('');
  const [group, setGroup] = React.useState<string>('');
  const q = query.trim().toLowerCase();
  const items = COMPLAINT_CATEGORIES.filter((c) => {
    const m = CATEGORY_META[c];
    if (group && m.group !== group) return false;
    if (!q) return true;
    return [m.label, m.hint, m.group, DEPARTMENT_DEFAULTS[m.departmentCode].name].some((t) => t.toLowerCase().includes(q));
  });

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="relative max-w-md">
          <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search, for example: streetlight, leak, garbage" aria-label="Search report categories" className="pl-10" />
        </div>
        <FilterChips
          label="Filter by infrastructure group"
          value={group}
          onChange={setGroup}
          options={[{ value: '', label: 'All' }, ...GROUPS.map((g) => ({ value: g, label: g }))]}
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          className="panel"
          icon={<MagnifyingGlass size={22} />}
          title="No category matches"
          description={`Nothing matches "${query}". Pick Other when you report and describe the problem in your own words.`}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuery('');
                setGroup('');
              }}
            >
              Show all categories
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2" aria-live="polite">
          {items.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            const m = CATEGORY_META[c];
            return (
              <li key={c} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 bg-surface p-5 sm:[&:last-child:nth-child(odd)]:col-span-2">
                <span className="grid h-10 w-10 place-items-center rounded-control border border-line bg-surface-2 text-fg-muted" aria-hidden>
                  <Icon size={20} />
                </span>
                <div className="grid min-w-0 gap-1">
                  <p className="font-semibold text-fg">{m.label}</p>
                  <p className="text-sm leading-relaxed text-fg-muted">{m.hint}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-fg-subtle">
                    <ArrowRight size={12} weight="bold" aria-hidden /> Routed to {DEPARTMENT_DEFAULTS[m.departmentCode].name}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
