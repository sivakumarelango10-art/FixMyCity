'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Buildings, CheckCircle, ClipboardText, Clock, MagnifyingGlass, PaperPlaneTilt, Signpost, Wrench } from '@phosphor-icons/react';
import type { AdminAnalytics, ComplaintListItem } from '@fixmycity/shared';
import { CategoryChart, StatusChart, TrendChart, WorkloadChart } from '@/components/admin/analytics-charts';
import { AuditList } from '@/components/admin/audit-list';
import { MetricStrip, PageHeader } from '@/components/common/page';
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
  // Closed reports never need a department, even when they were closed before assignment.
  const waiting = (queue.data?.data ?? []).filter((c) => c.status !== 'REJECTED' && c.status !== 'RESOLVED');
  const avg = a ? formatHours(a.averageResolutionHours) : null;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Operations overview"
        description="What is waiting for review, who is working on what, and how fast it gets resolved. Last 30 days."
        actions={
          <Button asChild>
            <Link href="/admin/complaints">
              <ClipboardText size={18} /> Manage complaints
            </Link>
          </Button>
        }
        className="mb-0"
      />
      {q.isError && <ErrorState className="panel" title="Operations data could not be loaded" message={(q.error as Error).message} onRetry={() => q.refetch()} />}

      <MetricStrip
        label="Complaint pipeline"
        loading={q.isLoading}
        metrics={[
          { label: 'New', value: t?.SUBMITTED, icon: <PaperPlaneTilt size={15} weight="bold" />, tone: 'accent', hint: 'Waiting for review', href: '/admin/complaints?status=SUBMITTED' },
          { label: 'Under review', value: t?.UNDER_REVIEW, icon: <MagnifyingGlass size={15} weight="bold" />, tone: 'review', href: '/admin/complaints?status=UNDER_REVIEW' },
          { label: 'Assigned', value: t ? t.ASSIGNED + t.REOPENED : undefined, icon: <Signpost size={15} weight="bold" />, hint: t?.REOPENED ? `${t.REOPENED} reopened` : undefined, href: '/admin/complaints?status=ASSIGNED' },
          { label: 'In progress', value: t?.IN_PROGRESS, icon: <Wrench size={15} weight="bold" />, tone: 'warning', href: '/admin/complaints?status=IN_PROGRESS' },
          { label: 'Resolved', value: t?.RESOLVED, icon: <CheckCircle size={15} weight="bold" />, tone: 'success', href: '/admin/complaints?status=RESOLVED' },
        ]}
      />
      <MetricStrip
        label="Service figures"
        loading={q.isLoading}
        metrics={[
          { label: 'Total complaints', value: t?.total, icon: <ClipboardText size={15} weight="bold" />, href: '/admin/complaints' },
          { label: 'Avg. resolution time', value: a ? (avg ?? 'Not enough data') : undefined, icon: <Clock size={15} weight="bold" />, hint: a ? `Based on ${a.resolvedSampleSize} resolved complaints` : undefined },
          { label: 'Active departments', value: a?.activeDepartments, icon: <Buildings size={15} weight="bold" />, href: '/admin/departments' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Needs assignment"
            description="Newest reports without a department."
            action={
              <Link href="/admin/complaints?department=unassigned" className="link inline-flex items-center gap-1 text-[13px]">
                All complaints <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="mt-4 border-t border-line">
            {queue.isLoading ? (
              <ComplaintListSkeleton rows={3} />
            ) : waiting.length > 0 ? (
              <ComplaintCards items={waiting} hrefFor={(c) => `/admin/complaints/${c.id}`} />
            ) : (
              <EmptyState icon={<CheckCircle size={22} />} title="The queue is clear" description="Every complaint has a department. New reports appear here as they arrive." />
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
            <Link href="/admin/audit-logs" className="link text-[13px]">
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
