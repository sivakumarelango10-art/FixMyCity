'use client';

import { useQuery } from '@tanstack/react-query';
import { CATEGORY_META, type PublicMapComplaint, type PublicStats } from '@fixmycity/shared';
import { CategoryIcon, StatusBadge } from '@/components/common/complaint-meta';
import { Reveal } from '@/components/motion/reveal';
import { Badge, ErrorState, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { timeAgo } from '@/lib/utils';

export function LiveFeed() {
  const map = useQuery({ queryKey: qk.publicMap({}), queryFn: () => api.get<PublicMapComplaint[]>('/api/public/map'), refetchInterval: 60_000 });
  const stats = useQuery({ queryKey: qk.publicStats, queryFn: () => api.get<PublicStats>('/api/public/stats') });
  const latest = (map.data ?? []).slice(0, 5);
  const top = (stats.data?.byCategory ?? []).slice(0, 6);
  const max = Math.max(1, ...top.map((t) => t.count));

  return (
    <section className="border-y border-line bg-surface py-16 md:py-24">
      <div className="container-page grid gap-10">
        <Reveal className="grid max-w-2xl gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="type-section text-fg">What residents are reporting.</h2>
          </div>
          <p className="type-lead">
            The newest public reports and running totals, straight from the database. <Badge className="align-middle">Demo data</Badge>
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <Reveal className="panel overflow-hidden bg-bg">
            <h3 className="sr-only">Latest public reports</h3>
            {map.isError ? (
              <ErrorState message="Recent reports are unavailable right now." onRetry={() => map.refetch()} />
            ) : (
              <ul className="divide-y divide-line" aria-label="Latest public reports">
                {map.isLoading
                  ? [0, 1, 2, 3].map((i) => (
                      <li key={i} className="p-5">
                        <Skeleton className="h-12" />
                      </li>
                    ))
                  : latest.map((c) => (
                      <li key={c.id} className="grid grid-cols-[36px_minmax(0,1fr)] gap-4 px-5 py-4 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center">
                        <span className="grid h-9 w-9 place-items-center rounded-chip border border-line bg-surface-2 text-fg-muted">
                          <CategoryIcon category={c.category} size={17} />
                        </span>
                        <div className="grid min-w-0 gap-1">
                          <p className="truncate text-[15px] font-semibold text-fg">{c.title}</p>
                          <p className="truncate text-[13px] text-fg-subtle">
                            {CATEGORY_META[c.category].label}, {c.address}
                          </p>
                        </div>
                        <div className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:flex-col sm:items-end sm:gap-1.5">
                          <StatusBadge status={c.status} size="sm" />
                          <span className="text-xs text-fg-subtle">{timeAgo(c.createdAt)}</span>
                        </div>
                      </li>
                    ))}
              </ul>
            )}
          </Reveal>

          <Reveal delay={0.08} className="grid content-start gap-8 lg:pt-1">
            <dl className="grid grid-cols-3 divide-x divide-line rounded-panel border border-line bg-bg">
              {[
                { label: 'Reports', value: stats.data?.total },
                { label: 'Open', value: stats.data?.open },
                { label: 'Resolved', value: stats.data?.resolved },
              ].map((s) => (
                <div key={s.label} className="grid gap-1.5 px-4 py-4 sm:px-5">
                  <dt className="text-xs font-medium text-fg-subtle">{s.label}</dt>
                  <dd className="type-metric text-fg">{s.value ?? '-'}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4">
              <h3 className="text-sm font-semibold text-fg">Most reported categories</h3>
              <ul className="grid gap-3.5">
                {top.map((t) => (
                  <li key={t.category} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="font-medium text-fg-muted">{CATEGORY_META[t.category].label}</span>
                      <span className="font-semibold text-fg tabular">{t.count}</span>
                    </div>
                    <span className="block h-1.5 rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(4, (t.count / max) * 100)}%` }} aria-hidden />
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
