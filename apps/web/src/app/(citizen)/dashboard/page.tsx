'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Bell,
  CheckCircle,
  ClipboardText,
  CreditCard,
  Lifebuoy,
  MapTrifold,
  Megaphone,
  Phone,
  PlusCircle,
  Receipt,
  Warning,
  Wrench,
  type Icon,
} from '@phosphor-icons/react';
import { EMERGENCY_CONTACTS, OPEN_STATUSES, STATUS_LABELS, type CitizenDashboard } from '@fixmycity/shared';
import { TrackingId } from '@/components/common/complaint-meta';
import { MetricStrip, PageHeader } from '@/components/common/page';
import { ComplaintCards, ComplaintListSkeleton } from '@/components/complaints/complaint-list';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Notice, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { useSessionUser } from '@/providers/session-provider';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, formatDate, formatMoney, pluralize, timeAgo } from '@/lib/utils';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

interface AttentionItem {
  key: string;
  icon: Icon;
  tone: 'danger' | 'warning' | 'accent' | 'review';
  title: string;
  detail: string;
  href: string;
  action: string;
}

/** Things that need the citizen to act or look, derived only from the dashboard data. */
function attentionItems(d: CitizenDashboard): AttentionItem[] {
  const items: AttentionItem[] = [];
  const dueNotOverdue = d.pendingBills.count - d.pendingBills.overdue;
  if (d.pendingBills.overdue > 0)
    items.push({
      key: 'overdue',
      icon: Warning,
      tone: 'danger',
      title: `${pluralize(d.pendingBills.overdue, 'bill')} overdue`,
      detail: 'Past the due date. These are simulated demo bills.',
      href: '/dashboard/utilities',
      action: 'Review bills',
    });
  if (dueNotOverdue > 0)
    items.push({
      key: 'due',
      icon: Receipt,
      tone: 'warning',
      title: `${pluralize(dueNotOverdue, 'bill')} due soon`,
      detail: `${formatMoney(d.pendingBills.totalAmount)} outstanding in total.`,
      href: '/dashboard/utilities',
      action: 'Open utilities',
    });
  if (d.counts.REOPENED > 0)
    items.push({
      key: 'reopened',
      icon: ArrowCounterClockwise,
      tone: 'review',
      title: `${pluralize(d.counts.REOPENED, 'complaint')} reopened`,
      detail: 'Back with the department after you reported the problem returned.',
      href: '/dashboard/complaints?status=REOPENED',
      action: 'See complaints',
    });
  if (d.unreadNotifications > 0)
    items.push({
      key: 'unread',
      icon: Bell,
      tone: 'accent',
      title: `${pluralize(d.unreadNotifications, 'unread update')}`,
      detail: 'Status changes and notices you have not opened yet.',
      href: '/dashboard/notifications',
      action: 'Read updates',
    });
  return items;
}

const TONE: Record<AttentionItem['tone'], string> = {
  danger: 'border-danger/30 bg-danger-soft text-danger',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  accent: 'border-accent-line bg-accent-soft text-accent-text',
  review: 'border-st-reopened/30 bg-st-reopened/10 text-st-reopened',
};

function Attention({ d, loading }: { d?: CitizenDashboard; loading: boolean }) {
  const items = d ? attentionItems(d) : [];
  return (
    <Panel>
      <PanelHeader title="Needs your attention" description="Things waiting on you, newest first." />
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="grid gap-2 p-1">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center gap-3 rounded-control px-2 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-success/30 bg-success-soft text-success" aria-hidden>
              <CheckCircle size={20} weight="bold" />
            </span>
            <div className="grid gap-0.5">
              <p className="text-sm font-semibold text-fg">You are all caught up</p>
              <p className="text-caption text-fg-subtle">No bills due, no unread updates and nothing reopened.</p>
            </div>
          </div>
        ) : (
          <ul className="grid gap-1">
            {items.map(({ key, icon: Icon, tone, title, detail, href, action }) => (
              <li key={key}>
                <Link href={href} className="group flex items-center gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-2">
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-control border', TONE[tone])} aria-hidden>
                    <Icon size={19} weight="bold" />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-semibold text-fg">{title}</span>
                    <span className="text-caption text-fg-subtle">{detail}</span>
                  </span>
                  <span className="hidden items-center gap-1 text-[13px] font-semibold text-accent-text sm:inline-flex">
                    {action} <ArrowRight size={13} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function activityTitle(e: CitizenDashboard['recentActivity'][number]) {
  if (e.type === 'ASSIGNMENT') return `Assigned to ${e.department?.name}`;
  if (e.type === 'NOTE') return 'New progress update';
  if (e.type === 'FEEDBACK') return 'You rated the resolution';
  if (e.toStatus === 'SUBMITTED') return 'Complaint submitted';
  return `Now ${STATUS_LABELS[e.toStatus!].toLowerCase()}`;
}

const SHORTCUTS = [
  { href: '/dashboard/city-map', label: 'City map', icon: MapTrifold },
  { href: '/dashboard/utilities', label: 'Utility bills', icon: CreditCard },
  { href: '/dashboard/announcements', label: 'City updates', icon: Megaphone },
  { href: '/dashboard/help', label: 'Services and help', icon: Lifebuoy },
];

function Welcome() {
  const params = useSearchParams();
  if (!params.get('welcome')) return null;
  return <Notice tone="success" title="Your account is ready">Report your first issue, or look around: your bills and city updates are already here.</Notice>;
}

export default function CitizenDashboardPage() {
  const user = useSessionUser();
  const q = useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<CitizenDashboard>('/api/dashboard'), refetchInterval: 60_000 });
  const d = q.data;
  const active = d ? OPEN_STATUSES.reduce((s, st) => s + d.counts[st], 0) : undefined;
  const activeComplaints = d ? d.recentComplaints.filter((c) => OPEN_STATUSES.includes(c.status)) : [];
  const shown = activeComplaints.length > 0 ? activeComplaints.slice(0, 4) : (d?.recentComplaints.slice(0, 3) ?? []);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description={
          d
            ? active
              ? `${pluralize(active, 'report')} on the way to being fixed. Here is where each one is.`
              : 'Nothing of yours is open right now. Spotted something new?'
            : 'Your reports, bills and city updates in one place.'
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/complaints/new">
              <PlusCircle size={18} weight="bold" /> Report an Issue
            </Link>
          </Button>
        }
        className="mb-2"
      />

      <Suspense>
        <Welcome />
      </Suspense>

      {q.isError && <ErrorState className="panel" title="Your dashboard could not be loaded" message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-6">
          <Attention d={d} loading={q.isLoading} />

          <Panel className="overflow-hidden">
            <PanelHeader
              title={activeComplaints.length > 0 || !d ? 'Your open reports' : 'Your recent reports'}
              description="Where each report is on its way from submitted to resolved."
              action={
                <Link href="/dashboard/complaints" className="link inline-flex items-center gap-1 text-[13px]">
                  All complaints <ArrowRight size={13} weight="bold" />
                </Link>
              }
              className="pb-4"
            />
            <div className="border-t border-line">
              {q.isLoading ? (
                <ComplaintListSkeleton rows={3} />
              ) : shown.length > 0 ? (
                <ComplaintCards items={shown} hrefFor={(c) => `/dashboard/complaints/${c.id}`} />
              ) : (
                <EmptyState
                  icon={<ClipboardText size={22} />}
                  title="No reports yet"
                  description="When you report a pothole, leak or broken light, it appears here with its live status."
                  action={
                    <Button asChild size="sm">
                      <Link href="/dashboard/complaints/new">Report an Issue</Link>
                    </Button>
                  }
                />
              )}
            </div>
          </Panel>

          <MetricStrip
            label="Your numbers"
            loading={q.isLoading}
            metrics={[
              { label: 'Reports filed', value: d?.counts.total, icon: <ClipboardText size={15} weight="bold" />, href: '/dashboard/complaints' },
              { label: 'Open', value: active, icon: <Wrench size={15} weight="bold" />, tone: 'warning', hint: d ? `${d.counts.IN_PROGRESS} in progress` : undefined },
              { label: 'Resolved', value: d?.counts.RESOLVED, icon: <CheckCircle size={15} weight="bold" />, tone: 'success' },
              { label: 'Bills due', value: d?.pendingBills.count, icon: <Receipt size={15} weight="bold" />, tone: d && d.pendingBills.overdue > 0 ? 'danger' : 'neutral', href: '/dashboard/utilities' },
            ]}
          />
        </div>

        <div className="grid min-w-0 content-start gap-6">
          <Panel>
            <PanelHeader title="Recent activity" description="The latest changes on your reports." />
            <div className="px-5 pb-5 pt-4 sm:px-6">
              {q.isLoading ? (
                <div className="grid gap-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : d && d.recentActivity.length > 0 ? (
                <ol className="relative grid gap-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
                  {d.recentActivity.slice(0, 6).map((e) => (
                    <li key={e.id} className="relative grid gap-0.5 pl-6">
                      <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-surface bg-accent" aria-hidden />
                      <Link href={`/dashboard/complaints/${e.complaint.id}`} className="text-sm font-semibold text-fg hover:text-accent-text">
                        {activityTitle(e)}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                        <TrackingId value={e.complaint.trackingId} className="text-[11.5px]" />
                        <span>{timeAgo(e.createdAt)}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-fg-subtle">No activity yet. Updates appear here as departments work on your reports.</p>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="City updates"
              action={
                <Link href="/dashboard/announcements" className="link text-[13px]">
                  All notices
                </Link>
              }
            />
            <div className="px-5 pb-5 pt-3 sm:px-6">
              {q.isLoading ? (
                <Skeleton className="h-28" />
              ) : d && d.latestAnnouncements.length > 0 ? (
                <ul className="grid divide-y divide-line">
                  {d.latestAnnouncements.map((a) => (
                    <li key={a.id} className="grid gap-0.5 py-3 first:pt-1 last:pb-0">
                      <Link href={`/dashboard/announcements?open=${a.id}`} className="text-sm font-semibold leading-snug text-fg hover:text-accent-text">
                        {a.title}
                      </Link>
                      <span className="text-xs text-fg-subtle">{timeAgo(a.publishedAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">No notices are current right now.</p>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Upcoming bills"
              description="Simulated demo bills."
              action={
                <Link href="/dashboard/utilities" className="link text-[13px]">
                  Utility hub
                </Link>
              }
            />
            <div className="px-3 pb-3 pt-2 sm:px-4">
              {q.isLoading ? (
                <Skeleton className="m-2 h-24" />
              ) : d && d.upcomingBills.length > 0 ? (
                <ul className="grid gap-0.5">
                  {d.upcomingBills.map((b) => (
                    <li key={b.id}>
                      <Link href={`/dashboard/utilities/${b.id}`} className="flex items-center justify-between gap-3 rounded-control px-2 py-2.5 transition-colors hover:bg-surface-2">
                        <span className="grid min-w-0">
                          <span className="truncate text-sm font-semibold text-fg">{b.serviceLabel}</span>
                          <span className={cn('text-xs', b.isOverdue ? 'font-semibold text-danger' : 'text-fg-subtle')}>
                            {b.isOverdue ? 'Overdue since' : 'Due'} {formatDate(b.dueDate)}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-fg tabular">{formatMoney(b.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 pb-2 text-sm text-fg-subtle">No bills are due.</p>
              )}
            </div>
          </Panel>

          <nav aria-label="Shortcuts" className="grid grid-cols-2 gap-2">
            {SHORTCUTS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-12 items-center gap-2.5 rounded-control border border-line bg-surface px-3 text-[13px] font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                <Icon size={18} className="shrink-0" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <section aria-labelledby="emergency" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-panel border border-danger/25 bg-danger-soft px-5 py-4">
        <h2 id="emergency" className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Phone size={16} weight="bold" className="text-danger" aria-hidden /> In an emergency, call. Do not file a report.
        </h2>
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {EMERGENCY_CONTACTS.map((c) => (
            <li key={c.id}>
              <a href={`tel:${c.number}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-chip text-sm text-fg-muted hover:text-fg">
                {c.label} <span className="font-bold text-fg tabular">{c.number}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
