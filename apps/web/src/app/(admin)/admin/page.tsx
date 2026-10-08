'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Buildings, CheckCircle, ClipboardText, Clock, MagnifyingGlass, PaperPlaneTilt, Signpost, Wrench } from '@phosphor-icons/react';
import type { AdminAnalytics, ComplaintListItem } from '@fixmycity/shared';
import { CategoryChart, StatusChart, TrendChart, WorkloadChart } from '@/components/admin/analytics-charts';
import { AuditList } from '@/components/admin/audit-list';
import { PageHeader, StatCard } from '@/components/common/page';
import { ComplaintCards, ComplaintListSkeleton } from '@/components/complaints/complaint-list';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Panel, PanelHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatHours } from '@/lib/utils';

export default function AdminOverviewPage() {
  const q = useQuery({ queryKey: qk.adminAnalytics(30), queryFn: () => api.get<AdminAnalytics>('/api/admin/analytics?days=30'), refetchInterval: 60_000 });
  const queue = useQuery({
    queryKey: qk.complaintList({ endpoint: 'admin-queue' }),
    queryFn: () => api.getPage<ComplaintListItem>('/api/admin/complaints?departmentId=unassigned&pageSize=5&sort=createdAt&order=desc'),
    refetchInterval: 45_000,
  });
  const a = q.data;
  const t = a?.totals;
  const avg = a ? formatHours(a.averageResolutionHours) : null;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Municipal operations"
        description="Every complaint in the city, routed and tracked in one place."
        actions={
          <Button asChild>
            <Link href="/admin/complaints">
              <ClipboardText size={18} /> Manage complaints
            </Link>
          </Button>
        }
        className="mb-0"
      />
      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <section aria-label="Totals" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard index={0} label="Total complaints" value={t?.total} loading={q.isLoading} icon={<ClipboardText size={17} />} href="/admin/complaints" />
        <StatCard index={1} label="New" value={t?.SUBMITTED} loading={q.isLoading} icon={<PaperPlaneTilt size={17} />} tone="accent" hint="Waiting for review" />
        <StatCard index={2} label="Under review" value={t?.UNDER_REVIEW} loading={q.isLoading} icon={<MagnifyingGlass size={17} />} tone="review" />
        <StatCard index={3} label="Assigned" value={t ? t.ASSIGNED + t.REOPENED : undefined} loading={q.isLoading} icon={<Signpost size={17} />} tone="accent" hint={t?.REOPENED ? `${t.REOPENED} reopened` : undefined} />
        <StatCard index={4} label="In progress" value={t?.IN_PROGRESS} loading={q.isLoading} icon={<Wrench size={17} />} tone="warning" />
        <StatCard index={5} label="Resolved" value={t?.RESOLVED} loading={q.isLoading} icon={<CheckCircle size={17} />} tone="success" />
        <StatCard
          index={6}
          label="Avg. resolution time"
          value={a ? (avg ?? 'Not enough data') : undefined}
          loading={q.isLoading}
          icon={<Clock size={17} />}
          hint={a ? `Based on ${a.resolvedSampleSize} resolved complaints` : undefined}
        />
        <StatCard index={7} label="Active departments" value={a?.activeDepartments} loading={q.isLoading} icon={<Buildings size={17} />} href="/admin/departments" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Panel>
          <PanelHeader
            title="Needs assignment"
            description="Newest reports without a department."
            action={
              <Link href="/admin/complaints" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
                All complaints <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="p-4 sm:p-5">
            {queue.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : queue.data && queue.data.data.length > 0 ? (
              <ComplaintCards items={queue.data.data} hrefFor={(c) => `/admin/complaints/${c.id}`} />
            ) : (
              <EmptyState icon={<CheckCircle size={22} />} title="Queue is clear" description="Every complaint has a department." />
            )}
          </div>
        </Panel>
        <WorkloadChart a={a} loading={q.isLoading} />
      </div>

      <TrendChart a={a} loading={q.isLoading} />

      <div className="grid gap-6 xl:grid-cols-2">
        <StatusChart a={a} loading={q.isLoading} />
        <CategoryChart a={a} loading={q.isLoading} />
      </div>

      <Panel>
        <PanelHeader
          title="Recent activity"
          description="Latest actions from the audit log."
          action={
            <Link href="/admin/audit-logs" className="text-[13px] font-semibold text-accent hover:underline">
              Full audit log
            </Link>
          }
        />
        <div className="p-3 sm:p-4">
          <AuditList entries={a?.recentActivity ?? []} loading={q.isLoading} />
        </div>
      </Panel>
    </div>
  );
}
