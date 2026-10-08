'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowCounterClockwise, ArrowRight, CheckCircle, Clock, Signpost, Warning, Wrench } from '@phosphor-icons/react';
import type { DepartmentOverview } from '@fixmycity/shared';
import { PageHeader, StatCard } from '@/components/common/page';
import { ComplaintCards, ComplaintListSkeleton } from '@/components/complaints/complaint-list';
import { EmptyState, ErrorState, Panel, PanelHeader } from '@/components/ui/primitives';
import { useSessionUser } from '@/providers/session-provider';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatHours } from '@/lib/utils';

export default function DepartmentOverviewPage() {
  const user = useSessionUser();
  const q = useQuery({ queryKey: qk.deptOverview, queryFn: () => api.get<DepartmentOverview>('/api/department/overview'), refetchInterval: 45_000 });
  const d = q.data;
  const deptNames = user.departments.map((x) => x.name).join(', ') || 'No department assigned';

  return (
    <div className="grid gap-7">
      <PageHeader title={deptNames} description={`Signed in as ${user.name}. You see complaints assigned to your department only.`} className="mb-0" />
      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      {user.departments.length === 0 && (
        <Panel className="p-5 text-sm text-fg-muted">Your account is not linked to a department yet. Ask an administrator to add you to one.</Panel>
      )}

      <section aria-label="Workload" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard index={0} label="New assignments" value={d?.counts.assigned} loading={q.isLoading} icon={<Signpost size={17} />} tone="accent" href="/department/assigned" />
        <StatCard index={1} label="In progress" value={d?.counts.inProgress} loading={q.isLoading} icon={<Wrench size={17} />} tone="warning" />
        <StatCard index={2} label="Reopened" value={d?.counts.reopened} loading={q.isLoading} icon={<ArrowCounterClockwise size={17} />} tone="danger" />
        <StatCard index={3} label="Resolved this month" value={d?.counts.resolvedThisMonth} loading={q.isLoading} icon={<CheckCircle size={17} />} tone="success" href="/department/history" />
        <StatCard
          index={4}
          label="Avg. resolution"
          value={d ? (formatHours(d.averageResolutionHours) ?? 'Not enough data') : undefined}
          loading={q.isLoading}
          icon={<Clock size={17} />}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader title="Urgent work" description="Open complaints with high or critical priority." />
          <div className="p-4 sm:p-5">
            {q.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : d && d.urgent.length > 0 ? (
              <ComplaintCards items={d.urgent} hrefFor={(c) => `/department/assigned/${c.id}`} />
            ) : (
              <EmptyState icon={<Warning size={22} />} title="No urgent work" description="High and critical complaints appear here first." />
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader
            title="Recently updated"
            action={
              <Link href="/department/assigned" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
                All assigned <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="p-4 sm:p-5">
            {q.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : d && d.recent.length > 0 ? (
              <ComplaintCards items={d.recent} hrefFor={(c) => `/department/assigned/${c.id}`} />
            ) : (
              <EmptyState title="Nothing assigned yet" description="New assignments from administrators appear here, and you are notified as they arrive." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
