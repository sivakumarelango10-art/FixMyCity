'use client';

import { useQuery } from '@tanstack/react-query';
import { CATEGORY_META, type PublicMapComplaint, type PublicStats } from '@fixmycity/shared';
import { CATEGORY_COLORS, CategoryChip, StatusBadge } from '@/components/common/complaint-meta';
import { Reveal } from '@/components/motion/reveal';
import { Skeleton } from '@/components/ui/primitives';
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
    <section className="py-20 lg:py-28">
      <div className="container-page grid gap-12">
        <Reveal className="grid max-w-2xl gap-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-accent">Live from the demo database</p>
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">What residents are reporting.</h2>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal className="panel">
            <ul className="divide-y divide-line" aria-label="Latest public reports">
              {map.isLoading
                ? [0, 1, 2, 3].map((i) => (
                    <li key={i} className="p-5">
                      <Skeleton className="h-12" />
                    </li>
                  ))
                : latest.map((c) => (
                    <li key={c.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
                      <div className="grid min-w-0 gap-1.5">
                        <p className="truncate text-[15px] font-bold text-fg">{c.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <CategoryChip category={c.category} />
                          <span className="text-[13px] text-fg-subtle">{c.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                        <StatusBadge status={c.status} size="sm" />
                        <span className="text-xs text-fg-subtle">{timeAgo(c.createdAt)}</span>
                      </div>
                    </li>
                  ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="panel grid content-start gap-6 p-6">
            <dl className="grid grid-cols-3 gap-4">
              {[
                { label: 'Reports', value: stats.data?.total },
                { label: 'Open', value: stats.data?.open },
                { label: 'Resolved', value: stats.data?.resolved },
              ].map((s) => (
                <div key={s.label} className="grid gap-1">
                  <dt className="text-xs font-semibold text-fg-subtle">{s.label}</dt>
                  <dd className="text-2xl font-extrabold text-fg tabular">{s.value ?? '-'}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-3">
              <p className="text-sm font-bold text-fg">Top categories</p>
              <ul className="grid gap-3">
                {top.map((t) => (
                  <li key={t.category} className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div className="grid gap-1.5">
                      <span className="text-[13px] font-medium text-fg-muted">{CATEGORY_META[t.category].label}</span>
                      <span className="h-1.5 rounded-full" style={{ width: `${(t.count / max) * 100}%`, background: CATEGORY_COLORS[t.category] }} aria-hidden />
                    </div>
                    <span className="text-sm font-bold text-fg tabular">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs leading-relaxed text-fg-subtle">Counts come straight from the database. Seeded records are fictional demonstration data.</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
