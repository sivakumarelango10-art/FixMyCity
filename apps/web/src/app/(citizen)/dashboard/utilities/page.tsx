'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Lightning, Receipt, WarningCircle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { UTILITY_LABELS, UTILITY_SERVICE_TYPES, type BillDto, type PaymentDto } from '@fixmycity/shared';
import { MetricStrip, PageHeader } from '@/components/common/page';
import { BillRow, DemoNotice, SERVICE_ICONS } from '@/components/utilities/bill-ui';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { api, newIdempotencyKey } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDateTime, formatMoney } from '@/lib/utils';

export default function UtilitiesPage() {
  const qc = useQueryClient();
  const [isPayingAll, setIsPayingAll] = React.useState(false);

  const bills = useQuery({ queryKey: qk.bills, queryFn: () => api.get<BillDto[]>('/api/utilities/bills') });
  const payments = useQuery({ queryKey: qk.payments, queryFn: () => api.get<PaymentDto[]>('/api/utilities/payment-history') });

  const all = bills.data ?? [];
  const unpaid = all.filter((b) => b.status === 'UNPAID');
  const paid = all.filter((b) => b.status === 'PAID');
  const outstanding = unpaid.reduce((s, b) => s + Number(b.amount), 0);
  const accounts = UTILITY_SERVICE_TYPES.map((t) => ({ type: t, bill: all.find((b) => b.serviceType === t) })).filter((a) => a.bill);

  const handlePayAll = async () => {
    setIsPayingAll(true);
    try {
      for (const bill of unpaid) {
        await api.post(`/api/utilities/bills/${bill.id}/demo-pay`, undefined, {
          'Idempotency-Key': newIdempotencyKey(),
        });
      }
      qc.invalidateQueries({ queryKey: qk.bills });
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      toast.success(`All ${unpaid.length} bills paid successfully in demo mode!`);
    } catch {
      toast.error('Could not complete all payments.');
    } finally {
      setIsPayingAll(false);
    }
  };

  return (
    <div className="grid gap-7">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Utilities' }]}
        title="Utility hub"
        description="Electricity, water, property tax and waste management bills in one place."
        className="mb-0"
      />
      <DemoNotice />

      <MetricStrip
        label="Bill summary"
        loading={bills.isLoading}
        metrics={[
          { label: 'Bills due', value: unpaid.length, icon: <CreditCard size={15} weight="bold" />, tone: 'warning' },
          { label: 'Outstanding', value: bills.isLoading ? undefined : formatMoney(outstanding) },
          { label: 'Overdue', value: unpaid.filter((b) => b.isOverdue).length, tone: 'danger', icon: <WarningCircle size={15} weight="bold" /> },
          { label: 'Demo payments', value: payments.data?.length, icon: <Receipt size={15} weight="bold" />, tone: 'success' },
        ]}
      />

      {bills.isError && <ErrorState className="panel" title="Your bills could not be loaded" message={(bills.error as Error).message} onRetry={() => bills.refetch()} />}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeader
              title="Due now"
              description="Pay in one click or select a bill to review itemized details."
              action={
                unpaid.length > 1 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={isPayingAll}
                    onClick={handlePayAll}
                    className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Lightning size={14} weight="fill" className="text-amber-500" />
                    1-Click Pay All ({formatMoney(outstanding)})
                  </Button>
                ) : undefined
              }
            />
            <div className="p-3 sm:p-4">
              {bills.isLoading ? (
                <div className="grid gap-2 p-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : unpaid.length ? (
                <ul className="grid gap-1">
                  {unpaid.map((b) => (
                    <li key={b.id}>
                      <BillRow bill={b} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={<CreditCard size={22} />} title="Nothing due" description="Every demo bill on your account is paid. New bills appear here when they are issued." />
              )}
            </div>
          </Panel>
          {paid.length > 0 && (
            <Panel>
              <PanelHeader title="Paid bills" />
              <ul className="grid gap-1 p-3 sm:p-4">
                {paid.map((b) => (
                  <li key={b.id}>
                    <BillRow bill={b} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeader title="Linked demo accounts" />
            <ul className="grid gap-3 p-5 sm:p-6">
              {accounts.map(({ type, bill }) => {
                const Icon = SERVICE_ICONS[type];
                return (
                  <li key={type} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-control border border-line bg-surface-2 text-fg-muted" aria-hidden>
                      <Icon size={17} />
                    </span>
                    <span className="grid min-w-0">
                      <span className="text-[13.5px] font-semibold text-fg">{UTILITY_LABELS[type].label}</span>
                      <span className="truncate font-mono text-[11.5px] text-fg-subtle">{bill!.demoAccountNumber}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel>
            <PanelHeader title="Payment history" description="Simulated transactions only." />
            <div className="p-5 sm:p-6">
              {payments.isLoading ? (
                <Skeleton className="h-28" />
              ) : payments.data && payments.data.length > 0 ? (
                <ul className="grid gap-3">
                  {payments.data.map((p) => (
                    <li key={p.id}>
                      <Link href={`/dashboard/utilities/${p.billId}`} className="flex items-center justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-surface-2">
                        <span className="grid min-w-0">
                          <span className="text-[13.5px] font-semibold text-fg">
                            {UTILITY_LABELS[p.serviceType].label}, {p.billingPeriod}
                          </span>
                          <span className="truncate font-mono text-[11.5px] text-fg-subtle">{p.referenceNumber}</span>
                          <span className="text-[11.5px] text-fg-subtle">{formatDateTime(p.createdAt)}</span>
                        </span>
                        <span className="text-sm font-bold text-fg tabular">{formatMoney(p.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-subtle">No demo payments yet. Paying a bill above adds a receipt here.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
