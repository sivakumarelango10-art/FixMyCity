'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlass, Megaphone, PushPin } from '@phosphor-icons/react';
import { subDays, format } from 'date-fns';
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_CATEGORY_LABELS, type AnnouncementCategory, type AnnouncementDto } from '@fixmycity/shared';
import { FilterChips } from '@/components/common/page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { Badge, EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { api, toQuery } from '@/lib/api';
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { formatDate, timeAgo } from '@/lib/utils';

const CATEGORY_TONE: Record<AnnouncementCategory, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  GENERAL: 'neutral',
  SERVICE_UPDATE: 'accent',
  MAINTENANCE: 'warning',
  EMERGENCY: 'danger',
  EVENT: 'success',
  ADVISORY: 'accent',
};

const RANGES = [
  { value: '', label: 'Any time' },
  { value: '7', label: 'Past 7 days' },
  { value: '30', label: 'Past 30 days' },
  { value: '90', label: 'Past 90 days' },
];

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function AnnouncementCard({ a, onOpen }: { a: AnnouncementDto; onOpen: (a: AnnouncementDto) => void }) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="panel grid h-full w-full content-start gap-3 p-5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CATEGORY_TONE[a.category]}>{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
          {a.pinned && (
            <Badge tone="accent">
              <PushPin size={11} weight="fill" /> Featured
            </Badge>
          )}
          {a.isDemo && <Badge>Demo notice</Badge>}
        </div>
        <h3 className="text-[16px] font-bold leading-snug text-fg">{a.title}</h3>
        {a.summary && <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{a.summary}</p>}
        <p className="text-xs text-fg-subtle">
          Published {timeAgo(a.publishedAt)}
          {a.expiresAt ? `, until ${formatDate(a.expiresAt)}` : ''}
        </p>
      </button>
    </motion.li>
  );
}

export function AnnouncementDialog({ a, onClose }: { a: AnnouncementDto | null; onClose: () => void }) {
  return (
    <Dialog open={!!a} onOpenChange={(o) => !o && onClose()}>
      {a && (
        <DialogContent title={a.title} description={a.summary ?? undefined} className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={CATEGORY_TONE[a.category]}>{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
            {a.isDemo && <Badge>Demonstration notice, not an official announcement</Badge>}
          </div>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg">{a.content}</p>
          <dl className="grid gap-1 border-t border-line pt-4 text-[13px] text-fg-subtle">
            <div>
              <dt className="inline font-semibold text-fg-muted">Published: </dt>
              <dd className="inline">{formatDate(a.publishedAt, 'd MMM yyyy, h:mm a')}</dd>
            </div>
            {a.expiresAt && (
              <div>
                <dt className="inline font-semibold text-fg-muted">Valid until: </dt>
                <dd className="inline">{formatDate(a.expiresAt, 'd MMM yyyy, h:mm a')}</dd>
              </div>
            )}
            {a.author && (
              <div>
                <dt className="inline font-semibold text-fg-muted">Posted by: </dt>
                <dd className="inline">{a.author.name}, municipal administration</dd>
              </div>
            )}
          </dl>
        </DialogContent>
      )}
    </Dialog>
  );
}

/** Search, filter and read live announcements. Used publicly and inside the citizen portal. */
export function AnnouncementsBrowser({ initialOpenId }: { initialOpenId?: string | null }) {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<AnnouncementCategory | ''>('');
  const [range, setRange] = React.useState('');
  const [open, setOpen] = React.useState<AnnouncementDto | null>(null);
  const [deepLinkDismissed, setDeepLinkDismissed] = React.useState(false);
  const debounced = useDebounced(search);
  const [page, setPage] = usePageReset([debounced, category, range]);

  const from = range ? format(subDays(new Date(), Number(range)), 'yyyy-MM-dd') : undefined;
  const params = { page, pageSize: 9, search: debounced || undefined, category: category || undefined, from };
  const query = useQuery({
    queryKey: qk.announcementList(params),
    queryFn: () => api.getPage<AnnouncementDto>(`/api/announcements${toQuery(params)}`),
    placeholderData: (prev) => prev,
  });

  // Deep link from notifications (?open=<id>).
  const deepLink = useQuery({
    queryKey: ['announcements', 'one', initialOpenId],
    queryFn: () => api.get<AnnouncementDto>(`/api/announcements/${initialOpenId}`),
    enabled: !!initialOpenId,
  });
  // A deep-linked notice opens once, until the reader closes it.
  const shown = open ?? (deepLinkDismissed ? null : (deepLink.data ?? null));

  const items = query.data?.data ?? [];

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,360px)_1fr_auto] lg:items-center">
        <div className="relative">
          <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notices" aria-label="Search announcements" className="pl-10" />
        </div>
        <FilterChips
          label="Filter by category"
          value={category}
          onChange={setCategory}
          options={[{ value: '', label: 'All' }, ...ANNOUNCEMENT_CATEGORIES.map((c) => ({ value: c, label: ANNOUNCEMENT_CATEGORY_LABELS[c] }))]}
        />
        <Select value={range} onValueChange={setRange} options={RANGES} aria-label="Filter by publication date" size="sm" className="w-full lg:w-40" />
      </div>

      {query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} className="panel" />
      ) : query.isLoading ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-44 rounded-[var(--radius-panel)]" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <EmptyState className="panel" icon={<Megaphone size={22} />} title="No notices match" description="Try a different search, category or date range." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <AnnouncementCard key={a.id} a={a} onOpen={setOpen} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {query.data && query.data.meta.totalPages > 1 && (
        <Pagination page={page} totalPages={query.data.meta.totalPages} total={query.data.meta.total} onPageChange={setPage} label="notices" />
      )}
      <AnnouncementDialog
        a={shown}
        onClose={() => {
          setOpen(null);
          setDeepLinkDismissed(true);
        }}
      />
    </div>
  );
}
