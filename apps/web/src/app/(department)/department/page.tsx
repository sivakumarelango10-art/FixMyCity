'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowCounterClockwise, ArrowRight, CheckCircle, Clock, Signpost, Warning, Wrench } from '@phosphor-icons/react';
import type { DepartmentOverview } from '@fixmycity/shared';
import { MetricStrip, PageHeader } from '@/components/common/page';
import { ComplaintCards, ComplaintListSkeleton } from '@/components/complaints/complaint-list';
import { EmptyState, ErrorState, Notice, Panel, PanelHeader } from '@/components/ui/primitives';
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
      {q.isError && <ErrorState className="panel" title="Your workload could not be loaded" message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      {user.departments.length === 0 && (
        <Notice tone="warning" title="Your account is not linked to a department yet.">
          Ask an administrator to add you to one. Until then there is no work to show here.
        </Notice>
      )}

      <MetricStrip
        label="Workload"
        loading={q.isLoading}
        metrics={[
          { label: 'New assignments', value: d?.counts.assigned, icon: <Signpost size={15} weight="bold" />, tone: 'accent', href: '/department/assigned' },
          { label: 'In progress', value: d?.counts.inProgress, icon: <Wrench size={15} weight="bold" />, tone: 'warning' },
          { label: 'Reopened', value: d?.counts.reopened, icon: <ArrowCounterClockwise size={15} weight="bold" />, tone: 'danger' },
          { label: 'Resolved this month', value: d?.counts.resolvedThisMonth, icon: <CheckCircle size={15} weight="bold" />, tone: 'success', href: '/department/history' },
          { label: 'Avg. resolution', value: d ? (formatHours(d.averageResolutionHours) ?? 'Not enough data') : undefined, icon: <Clock size={15} weight="bold" /> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <PanelHeader title="Urgent work" description="Open complaints with high or critical priority." />
          <div className="mt-4 border-t border-line">
            {q.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : d && d.urgent.length > 0 ? (
              <ComplaintCards items={d.urgent} hrefFor={(c) => `/department/assigned/${c.id}`} />
            ) : (
              <EmptyState icon={<Warning size={22} />} title="No urgent work" description="Nothing open is high or critical priority. When one arrives it is listed here first." />
            )}
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Recently updated"
            action={
              <Link href="/department/assigned" className="link inline-flex items-center gap-1 text-[13px]">
                All assigned <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="mt-4 border-t border-line">
            {q.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : d && d.recent.length > 0 ? (
              <ComplaintCards items={d.recent} hrefFor={(c) => `/department/assigned/${c.id}`} />
            ) : (
              <EmptyState icon={<Signpost size={22} />} title="Nothing assigned yet" description="New assignments from administrators appear here, and you are notified as they arrive." />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
