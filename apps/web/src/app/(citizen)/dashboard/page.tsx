'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
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
  Wrench,
} from '@phosphor-icons/react';
import { EMERGENCY_CONTACTS, OPEN_STATUSES, STATUS_LABELS, type CitizenDashboard } from '@fixmycity/shared';
import { ChartPanel, ColumnBars } from '@/components/charts/charts';
import { TrackingId } from '@/components/common/complaint-meta';
import { PageHeader, StatCard } from '@/components/common/page';
import { ComplaintCards, ComplaintListSkeleton } from '@/components/complaints/complaint-list';
import { Button } from '@/components/ui/button';
import { Badge, EmptyState, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { useSessionUser } from '@/providers/session-provider';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDate, formatMoney, timeAgo } from '@/lib/utils';

const QUICK_ACTIONS = [
  { href: '/dashboard/complaints/new', label: 'Report an Issue', icon: PlusCircle, primary: true },
  { href: '/dashboard/complaints', label: 'My complaints', icon: ClipboardText },
  { href: '/dashboard/utilities', label: 'Utility bills', icon: CreditCard },
  { href: '/dashboard/city-map', label: 'City map', icon: MapTrifold },
  { href: '/dashboard/announcements', label: 'City updates', icon: Megaphone },
  { href: '/dashboard/help', label: 'Services & help', icon: Lifebuoy },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function CitizenDashboardPage() {
  const user = useSessionUser();
  const q = useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<CitizenDashboard>('/api/dashboard'), refetchInterval: 60_000 });
  const d = q.data;
  const active = d ? OPEN_STATUSES.reduce((s, st) => s + d.counts[st], 0) : undefined;
  const statusData = d
    ? (['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'] as const).map((s) => ({ label: STATUS_LABELS[s], value: d.counts[s] }))
    : [];

  return (
    <div className="grid gap-7">
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description="Your complaints, bills and city updates in one place."
        actions={
          <Button asChild>
            <Link href="/dashboard/complaints/new">
              <PlusCircle size={18} weight="bold" /> Report an Issue
            </Link>
          </Button>
        }
        className="mb-0"
      />

      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Total complaints" value={d?.counts.total} loading={q.isLoading} icon={<ClipboardText size={17} />} href="/dashboard/complaints" />
        <StatCard index={1} label="Active" value={active} loading={q.isLoading} icon={<Wrench size={17} />} tone="warning" hint={d ? `${d.counts.IN_PROGRESS} in progress` : undefined} />
        <StatCard index={2} label="Resolved" value={d?.counts.RESOLVED} loading={q.isLoading} icon={<CheckCircle size={17} />} tone="success" />
        <StatCard
          index={3}
          label="Bills due"
          value={d?.pendingBills.count}
          loading={q.isLoading}
          icon={<CreditCard size={17} />}
          tone={d && d.pendingBills.overdue > 0 ? 'danger' : 'accent'}
          hint={d ? `${formatMoney(d.pendingBills.totalAmount)} outstanding${d.pendingBills.overdue ? `, ${d.pendingBills.overdue} overdue` : ''}` : undefined}
          href="/dashboard/utilities"
        />
      </section>

      <nav aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={
              primary
                ? 'flex items-center gap-3 rounded-[14px] border border-accent-line bg-accent-soft px-4 py-3.5 text-sm font-bold text-fg transition-transform duration-200 hover:-translate-y-0.5'
                : 'flex items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg-muted transition-[transform,color,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:text-fg'
            }
          >
            <Icon size={20} className={primary ? 'text-accent' : undefined} weight={primary ? 'fill' : 'regular'} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHeader
            title="Recent complaints"
            action={
              <Link href="/dashboard/complaints" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
                View all <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="p-4 sm:p-5">
            {q.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : d && d.recentComplaints.length > 0 ? (
              <ComplaintCards items={d.recentComplaints} hrefFor={(c) => `/dashboard/complaints/${c.id}`} />
            ) : (
              <EmptyState
                icon={<ClipboardText size={22} />}
                title="No complaints yet"
                description="When you report an issue it appears here with its live status."
                action={
                  <Button asChild size="sm">
                    <Link href="/dashboard/complaints/new">Report an Issue</Link>
                  </Button>
                }
              />
            )}
          </div>
        </Panel>

        <ChartPanel
          title="Your complaints by status"
          loading={q.isLoading}
          empty={!!d && d.counts.total === 0}
          emptyLabel="No complaints to chart yet"
          height={240}
          table={{ columns: ['Status', 'Complaints'], rows: statusData.map((s) => [s.label, s.value]) }}
        >
          <ColumnBars data={statusData.map((s) => ({ ...s, label: s.label.replace('Under review', 'Review') }))} />
        </ChartPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Recent activity" description="Status changes and updates on your complaints." />
          <div className="p-5 sm:p-6">
            {q.isLoading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : d && d.recentActivity.length > 0 ? (
              <ol className="grid gap-4">
                {d.recentActivity.slice(0, 6).map((e) => (
                  <li key={e.id} className="grid gap-1">
                    <Link href={`/dashboard/complaints/${e.complaint.id}`} className="text-[13.5px] font-semibold text-fg hover:text-accent">
                      {e.type === 'ASSIGNMENT'
                        ? `Assigned to ${e.department?.name}`
                        : e.type === 'NOTE'
                          ? 'New progress update'
                          : e.type === 'FEEDBACK'
                            ? 'You rated the resolution'
                            : e.toStatus === 'SUBMITTED'
                              ? 'Complaint submitted'
                              : `Now ${STATUS_LABELS[e.toStatus!].toLowerCase()}`}
                    </Link>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                      <TrackingId value={e.complaint.trackingId} className="text-[11.5px]" />
                      {timeAgo(e.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-fg-subtle">No activity yet.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Upcoming bills"
            description="Simulated demo bills."
            action={
              <Link href="/dashboard/utilities" className="text-[13px] font-semibold text-accent hover:underline">
                Open hub
              </Link>
            }
          />
          <div className="p-5 sm:p-6">
            {q.isLoading ? (
              <Skeleton className="h-32" />
            ) : d && d.upcomingBills.length > 0 ? (
              <ul className="grid gap-3">
                {d.upcomingBills.map((b) => (
                  <li key={b.id}>
                    <Link href={`/dashboard/utilities/${b.id}`} className="flex items-center justify-between gap-3 rounded-[12px] px-2 py-1.5 transition-colors hover:bg-surface-2">
                      <span className="grid">
                        <span className="text-[13.5px] font-semibold text-fg">{b.serviceLabel}</span>
                        <span className="text-xs text-fg-subtle">Due {formatDate(b.dueDate)}</span>
                      </span>
                      <span className="grid justify-items-end gap-1">
                        <span className="text-sm font-bold text-fg tabular">{formatMoney(b.amount)}</span>
                        {b.isOverdue && <Badge tone="danger">Overdue</Badge>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-subtle">No bills due. Nice.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="City updates"
            action={
              <Link href="/dashboard/announcements" className="text-[13px] font-semibold text-accent hover:underline">
                All notices
              </Link>
            }
          />
          <div className="p-5 sm:p-6">
            {q.isLoading ? (
              <Skeleton className="h-32" />
            ) : d && d.latestAnnouncements.length > 0 ? (
              <ul className="grid gap-4">
                {d.latestAnnouncements.map((a) => (
                  <li key={a.id} className="grid gap-1">
                    <Link href={`/dashboard/announcements?open=${a.id}`} className="text-[13.5px] font-semibold leading-snug text-fg hover:text-accent">
                      {a.title}
                    </Link>
                    <span className="text-xs text-fg-subtle">{timeAgo(a.publishedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-subtle">No current notices.</p>
            )}
          </div>
        </Panel>
      </div>

      <section aria-label="Emergency numbers" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[var(--radius-panel)] border border-line bg-surface-2 px-5 py-4">
        <p className="text-sm font-bold text-fg">Emergency?</p>
        {EMERGENCY_CONTACTS.map((c) => (
          <a key={c.id} href={`tel:${c.number}`} className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg">
            <Phone size={15} className="text-danger" /> {c.label} <span className="font-bold text-fg tabular">{c.number}</span>
          </a>
        ))}
        <Link href="/dashboard/notifications" className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
          <Bell size={15} /> {d ? `${d.unreadNotifications} unread notifications` : 'Notifications'}
        </Link>
      </section>

    </div>
  );
}
