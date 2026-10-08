'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Barricade, CalendarBlank, Info, MagnifyingGlass, Megaphone, PushPin, Warning, Wrench, type Icon } from '@phosphor-icons/react';
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
import { cn, formatDate, timeAgo } from '@/lib/utils';

/* Only urgent kinds of notice carry color; everything else stays neutral so they stand out. */
const CATEGORY_TONE: Record<AnnouncementCategory, 'neutral' | 'accent' | 'success' | 'warning' | 'danger'> = {
  GENERAL: 'neutral',
  SERVICE_UPDATE: 'neutral',
  MAINTENANCE: 'warning',
  EMERGENCY: 'danger',
  EVENT: 'neutral',
  ADVISORY: 'neutral',
};

const CATEGORY_ICON: Record<AnnouncementCategory, Icon> = {
  GENERAL: Info,
  SERVICE_UPDATE: Wrench,
  MAINTENANCE: Barricade,
  EMERGENCY: Warning,
  EVENT: CalendarBlank,
  ADVISORY: Megaphone,
};

function CategoryTag({ category }: { category: AnnouncementCategory }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <Badge tone={CATEGORY_TONE[category]}>
      <Icon size={12} weight="bold" aria-hidden /> {ANNOUNCEMENT_CATEGORY_LABELS[category]}
    </Badge>
  );
}

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

/** One notice on the board: date block, tags, title and summary. Opens the full notice. */
export function AnnouncementCard({ a, onOpen }: { a: AnnouncementDto; onOpen: (a: AnnouncementDto) => void }) {
  const urgent = a.category === 'EMERGENCY';
  const date = a.publishedAt ?? a.createdAt;
  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <button
        type="button"
        onClick={() => onOpen(a)}
        className={cn(
          'group relative grid w-full grid-cols-[52px_minmax(0,1fr)] gap-4 px-4 py-5 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[60px_minmax(0,1fr)] sm:px-6',
          (a.pinned || urgent) && 'before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full',
          urgent ? 'bg-danger-soft/60 before:bg-danger' : a.pinned && 'before:bg-accent',
        )}
      >
        <span className="grid h-[52px] content-center justify-items-center rounded-control border border-line bg-surface text-center sm:h-[60px]" aria-hidden>
          <span className="text-lg font-bold leading-none text-fg tabular sm:text-xl">{formatDate(date, 'd')}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">{formatDate(date, 'MMM')}</span>
        </span>
        <span className="grid min-w-0 gap-1.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <CategoryTag category={a.category} />
            {a.pinned && (
              <Badge tone="accent">
                <PushPin size={11} weight="fill" aria-hidden /> Featured
              </Badge>
            )}
            {a.isDemo && <Badge>Demo notice</Badge>}
          </span>
          <span className="text-base font-semibold leading-snug text-fg group-hover:text-accent-text">{a.title}</span>
          {a.summary && <span className="line-clamp-2 text-sm leading-relaxed text-fg-muted">{a.summary}</span>}
          <span className="text-xs text-fg-subtle">
            Published {timeAgo(a.publishedAt)}
            {a.expiresAt ? `, valid until ${formatDate(a.expiresAt)}` : ''}
          </span>
        </span>
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
            <CategoryTag category={a.category} />
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
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,340px)_minmax(0,1fr)_auto] lg:items-center">
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
        <ErrorState title="City updates could not be loaded" message={(query.error as Error).message} onRetry={() => query.refetch()} className="panel" />
      ) : query.isLoading ? (
        <div className="panel divide-y divide-line" role="status" aria-label="Loading notices">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[52px_1fr] gap-4 px-4 py-5 sm:grid-cols-[60px_1fr] sm:px-6">
              <Skeleton className="h-[52px] sm:h-[60px]" />
              <div className="grid gap-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          className="panel"
          icon={<Megaphone size={22} />}
          title={search || category || range ? 'No notices match' : 'No current notices'}
          description={
            search || category || range
              ? 'Nothing matches this search, category or date range. Try widening it.'
              : 'Administrators have not published any notices that are still valid. Check back later.'
          }
        />
      ) : (
        <ul className="panel divide-y divide-line overflow-hidden">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <AnnouncementCard key={a.id} a={a} onOpen={setOpen} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {query.data && query.data.meta.totalPages > 1 && (
        <div className="panel">
          <Pagination page={page} totalPages={query.data.meta.totalPages} total={query.data.meta.total} onPageChange={setPage} label="notices" />
        </div>
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
