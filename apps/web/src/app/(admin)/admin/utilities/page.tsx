'use client';

import { useQuery } from '@tanstack/react-query';
import { UTILITY_LABELS, type AdminUtilityOverview } from '@fixmycity/shared';
import { PageHeader, StatCard } from '@/components/common/page';
import { DemoNotice, SERVICE_ICONS } from '@/components/utilities/bill-ui';
import { ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDateTime, formatMoney } from '@/lib/utils';

export default function AdminUtilitiesPage() {
  const q = useQuery({ queryKey: qk.adminUtilities, queryFn: () => api.get<AdminUtilityOverview>('/api/admin/utilities') });
  const d = q.data;
  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Utilities' }]}
        title="Utility demo overview"
        description="Aggregate view of simulated bills and demo payments. Citizens' individual bill details stay in their own accounts."
        className="mb-0"
      />
      <DemoNotice />
      {q.isError && <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Totals">
        <StatCard index={0} label="Bills" value={d?.totals.bills} loading={q.isLoading} />
        <StatCard index={1} label="Unpaid" value={d?.totals.unpaid} loading={q.isLoading} tone="warning" hint={d ? `${d.totals.overdue} overdue` : undefined} />
        <StatCard index={2} label="Demo collected" value={d ? formatMoney(d.totals.collected) : undefined} loading={q.isLoading} tone="success" />
        <StatCard index={3} label="Outstanding" value={d ? formatMoney(d.totals.outstanding) : undefined} loading={q.isLoading} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Panel>
          <PanelHeader title="By service" />
          <div className="p-5 sm:p-6">
            {q.isLoading ? (
              <Skeleton className="h-40" />
            ) : (
              <ul className="grid gap-3">
                {(d?.byService ?? []).map((s) => {
                  const Icon = SERVICE_ICONS[s.serviceType];
                  return (
                    <li key={s.serviceType} className="grid grid-cols-[36px_1fr_auto] items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-control bg-surface-2 text-fg-muted">
                        <Icon size={17} />
                      </span>
                      <span className="grid">
                        <span className="text-[13.5px] font-semibold text-fg">{UTILITY_LABELS[s.serviceType].label}</span>
                        <span className="text-xs text-fg-subtle">
                          {s.paid} paid, {s.unpaid} unpaid
                        </span>
                      </span>
                      <span className="text-sm font-bold text-fg tabular">{formatMoney(s.collected)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent demo payments" />
          <div className="relative overflow-x-auto">
            {q.isLoading ? (
              <Skeleton className="m-5 h-40" />
            ) : (
              <table className="w-full min-w-[560px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-line text-[12px] text-fg-subtle">
                    <th scope="col" className="py-3 pl-5 pr-3 font-semibold">Reference</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Citizen</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Service</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Amount</th>
                    <th scope="col" className="py-3 pl-3 pr-5 font-semibold">Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.recentPayments ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-line/70 last:border-0">
                      <td className="py-3 pl-5 pr-3 font-mono text-[12px] text-fg-muted">{p.referenceNumber}</td>
                      <td className="px-3 py-3 text-fg">{p.citizen.name}</td>
                      <td className="px-3 py-3 text-fg-muted">{UTILITY_LABELS[p.serviceType].label}</td>
                      <td className="px-3 py-3 font-semibold text-fg tabular">{formatMoney(p.amount)}</td>
                      <td className="whitespace-nowrap py-3 pl-3 pr-5 text-fg-subtle">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
