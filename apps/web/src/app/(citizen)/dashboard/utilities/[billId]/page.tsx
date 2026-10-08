'use client';

import * as React from 'react';
import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { CheckCircle, Printer, ShieldCheck } from '@phosphor-icons/react';
import { DEMO_PAYMENT_NOTICE, type BillDto, type DemoPaymentResult } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { BillStatusBadge, DemoNotice, SERVICE_ICONS } from '@/components/utilities/bill-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormError } from '@/components/ui/field';
import { ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { ApiError, api, newIdempotencyKey } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';

function Receipt({ bill }: { bill: BillDto }) {
  const p = bill.payment;
  if (!p) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Panel className="print:border-0 print:shadow-none">
        <PanelHeader
          title="Demo payment receipt"
          description={DEMO_PAYMENT_NOTICE}
          action={
            <Button variant="secondary" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer size={15} /> Print
            </Button>
          }
        />
        <dl className="grid gap-x-8 gap-y-4 p-5 text-[13.5px] sm:grid-cols-2 sm:p-6" data-testid="receipt">
          {[
            ['Reference', <span key="r" className="font-mono">{p.referenceNumber}</span>],
            ['Amount', <span key="a" className="font-bold tabular">{formatMoney(p.amount)}</span>],
            ['Service', bill.serviceLabel],
            ['Billing period', bill.billingPeriod],
            ['Demo account', <span key="d" className="font-mono">{bill.demoAccountNumber}</span>],
            ['Recorded', formatDateTime(p.createdAt)],
            ['Status', 'Succeeded (simulated)'],
            ['Payee', bill.provider],
          ].map(([k, v]) => (
            <div key={String(k)} className="grid gap-0.5">
              <dt className="text-fg-subtle">{k}</dt>
              <dd className="text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line px-5 py-4 text-[12.5px] text-fg-subtle sm:px-6">
          This receipt records a demonstration transaction in FixMyCity. It is not proof of payment to any real biller.
        </p>
      </Panel>
    </motion.div>
  );
}

export default function BillPage({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = use(params);
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // One key per checkout attempt: repeated clicks or retries replay the same payment.
  const keyRef = React.useRef<string>('');

  const bill = useQuery({ queryKey: qk.bill(billId), queryFn: () => api.get<BillDto>(`/api/utilities/bills/${billId}`) });

  const pay = useMutation({
    mutationFn: () => api.post<DemoPaymentResult>(`/api/utilities/bills/${billId}/demo-pay`, undefined, { 'Idempotency-Key': keyRef.current }),
    onSuccess: (result) => {
      qc.setQueryData(qk.bill(billId), result.bill);
      qc.invalidateQueries({ queryKey: qk.bills });
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      setOpen(false);
      toast.success('Demo payment recorded', { description: `Receipt ${result.payment.referenceNumber}. No real money was transferred.` });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'ALREADY_PAID') qc.invalidateQueries({ queryKey: qk.bill(billId) });
      setError(err instanceof ApiError ? err.message : 'The demo payment could not be completed.');
    },
  });

  const startCheckout = () => {
    keyRef.current = newIdempotencyKey();
    setError(null);
    setOpen(true);
  };

  if (bill.isLoading) return <Skeleton className="h-96 rounded-[var(--radius-panel)]" />;
  if (bill.isError || !bill.data) {
    return <ErrorState className="panel" message={bill.error instanceof ApiError && bill.error.status === 404 ? 'This bill was not found on your account.' : 'Could not load this bill.'} />;
  }
  const b = bill.data;
  const Icon = SERVICE_ICONS[b.serviceType];

  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Utilities', href: '/dashboard/utilities' },
          { label: b.serviceLabel },
        ]}
        title={`${b.serviceLabel} bill, ${b.billingPeriod}`}
        description={b.provider}
        className="mb-0 print:hidden"
      />
      <DemoNotice className="print:hidden" />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel className="print:hidden">
          <div className="grid gap-6 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-accent-soft text-accent">
                <Icon size={24} />
              </span>
              <BillStatusBadge bill={b} />
            </div>
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-fg-muted">Amount</p>
              <p className="text-4xl font-extrabold tracking-tight text-fg tabular">{formatMoney(b.amount)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13.5px]">
              <div className="grid gap-0.5">
                <dt className="text-fg-subtle">Due date</dt>
                <dd className={b.isOverdue ? 'font-semibold text-danger' : 'text-fg'}>{formatDate(b.dueDate)}</dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-fg-subtle">Billing period</dt>
                <dd className="text-fg">
                  {formatDate(b.periodStart)} to {formatDate(b.periodEnd)}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-fg-subtle">Demo account</dt>
                <dd className="font-mono text-[12.5px] text-fg">{b.demoAccountNumber}</dd>
              </div>
              {b.unitsConsumed && (
                <div className="grid gap-0.5">
                  <dt className="text-fg-subtle">Consumption</dt>
                  <dd className="text-fg">
                    {Number(b.unitsConsumed).toFixed(0)} {b.unitLabel}
                  </dd>
                </div>
              )}
            </dl>
            {b.status === 'UNPAID' ? (
              <Button size="lg" onClick={startCheckout} data-testid="pay-now">
                Pay {formatMoney(b.amount)} (demo)
              </Button>
            ) : (
              <p className="flex items-center gap-2 rounded-[var(--radius-control)] bg-success-soft px-4 py-3 text-sm font-semibold text-success" role="status">
                <CheckCircle size={18} weight="fill" /> Paid {formatDate(b.paidAt)}. Another payment for this bill is blocked.
              </p>
            )}
          </div>
        </Panel>
        {b.status === 'PAID' ? (
          <Receipt bill={b} />
        ) : (
          <Panel className="grid content-start gap-4 p-6 sm:p-7 print:hidden">
            <ShieldCheck size={26} className="text-success" />
            <p className="text-[15px] font-bold text-fg">How the demo checkout works</p>
            <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-fg-muted">
              <li>You confirm the amount. No payment details are asked for.</li>
              <li>The server records a simulated transaction and marks the bill paid in one database transaction.</li>
              <li>A demo receipt appears here and in your payment history.</li>
              <li>Repeating the request cannot create a second successful payment.</li>
            </ol>
          </Panel>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => !pay.isPending && setOpen(o)}>
        <DialogContent title="Confirm demo payment" description="This simulates a payment. Nothing is charged.">
          <DemoNotice compact />
          <dl className="grid gap-3 rounded-[var(--radius-control)] border border-line p-4 text-[13.5px]">
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Bill</dt>
              <dd className="text-right text-fg">
                {b.serviceLabel}, {b.billingPeriod}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-fg-subtle">Demo account</dt>
              <dd className="font-mono text-[12.5px] text-fg">{b.demoAccountNumber}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold text-fg">Amount</dt>
              <dd className="text-lg font-extrabold text-fg tabular">{formatMoney(b.amount)}</dd>
            </div>
          </dl>
          <FormError message={error} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pay.isPending}>
              Cancel
            </Button>
            <Button onClick={() => pay.mutate()} loading={pay.isPending} loadingText="Recording" data-testid="confirm-payment">
              Confirm demo payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
