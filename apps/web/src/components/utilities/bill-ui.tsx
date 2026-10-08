'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CaretRight, CheckCircle, Drop, House, Lightning, Recycle, Warning, type Icon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { DEMO_PAYMENT_NOTICE, type BillDto, type DemoPaymentResult, type UtilityServiceType } from '@fixmycity/shared';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { api, ApiError, newIdempotencyKey } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, formatDate, formatMoney } from '@/lib/utils';

export const SERVICE_ICONS: Record<UtilityServiceType, Icon> = {
  ELECTRICITY: Lightning,
  WATER: Drop,
  PROPERTY_TAX: House,
  WASTE_MANAGEMENT: Recycle,
};

export function DemoNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-control border border-warning/35 bg-warning-soft px-4 py-3 text-warning',
        compact && 'px-3 py-2',
        className,
      )}
    >
      <Warning size={18} weight="bold" className="mt-0.5 shrink-0" />
      <div className="grid gap-0.5">
        <p className="text-[13px] font-bold tracking-wide">{DEMO_PAYMENT_NOTICE}</p>
        {!compact && <p className="text-[12.5px] font-medium text-fg-muted">These bills are simulated records. No biller, bank or payment network is connected, and no card or UPI details are ever requested.</p>}
      </div>
    </div>
  );
}

export function BillStatusBadge({ bill }: { bill: BillDto }) {
  if (bill.status === 'PAID')
    return (
      <Badge tone="success">
        <CheckCircle size={12} weight="bold" /> Paid
      </Badge>
    );
  if (bill.isOverdue)
    return (
      <Badge tone="danger">
        <Warning size={12} weight="bold" /> Overdue
      </Badge>
    );
  return <Badge tone="warning">Due</Badge>;
}

export function OneClickDemoPayButton({
  bill,
  size = 'sm',
  className,
  onSuccess,
}: {
  bill: BillDto;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSuccess?: (result: DemoPaymentResult) => void;
}) {
  const qc = useQueryClient();

  const pay = useMutation({
    mutationFn: () => {
      const key = newIdempotencyKey();
      return api.post<DemoPaymentResult>(`/api/utilities/bills/${bill.id}/demo-pay`, undefined, {
        'Idempotency-Key': key,
      });
    },
    onSuccess: (result) => {
      qc.setQueryData(qk.bill(bill.id), result.bill);
      qc.invalidateQueries({ queryKey: qk.bills });
      qc.invalidateQueries({ queryKey: qk.payments });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      toast.success(`Demo payment of ${formatMoney(bill.amount)} recorded!`, {
        description: `Receipt #${result.payment.referenceNumber}. No real money was transferred.`,
      });
      onSuccess?.(result);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'ALREADY_PAID') {
        qc.invalidateQueries({ queryKey: qk.bills });
        qc.invalidateQueries({ queryKey: qk.bill(bill.id) });
        toast.info('This bill was already paid.');
        return;
      }
      const msg = err instanceof ApiError ? err.message : 'Demo payment could not be processed.';
      toast.error(msg);
    },
  });

  if (bill.status === 'PAID') {
    return null;
  }

  return (
    <Button
      type="button"
      size={size}
      loading={pay.isPending}
      loadingText="Paying…"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        pay.mutate();
      }}
      className={cn(
        'inline-flex items-center gap-1.5 shadow-2xs cursor-pointer',
        size === 'sm' && 'h-7.5 px-2.5 text-xs font-semibold',
        className,
      )}
      title={`Pay ${formatMoney(bill.amount)} instantly (demo)`}
    >
      <Lightning size={size === 'sm' ? 13 : 16} weight="fill" className="text-amber-300 shrink-0" />
      <span>{size === 'sm' ? '1-Click Pay' : `One-Click Demo Pay (${formatMoney(bill.amount)})`}</span>
    </Button>
  );
}

export function BillRow({
  bill,
  showQuickPay = true,
}: {
  bill: BillDto;
  showQuickPay?: boolean;
}) {
  const Icon = SERVICE_ICONS[bill.serviceType];
  return (
    <div className="group relative flex items-center justify-between gap-3 rounded-control px-3 py-3 transition-colors hover:bg-surface-2 sm:grid sm:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:gap-4">
      <Link href={`/dashboard/utilities/${bill.id}`} className="absolute inset-0 z-0" aria-label={`View ${bill.serviceLabel} bill`} />
      <span className="pointer-events-none relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-control border border-line bg-surface-2 text-fg-muted" aria-hidden>
        <Icon size={19} />
      </span>
      <span className="pointer-events-none relative z-10 grid min-w-0">
        <span className="truncate text-sm font-semibold text-fg">{bill.serviceLabel}</span>
        <span className="truncate text-xs text-fg-subtle">{bill.billingPeriod}</span>
      </span>
      <span className="pointer-events-none relative z-10 hidden text-[13px] text-fg-muted sm:block">
        {bill.status === 'PAID' ? `Paid ${formatDate(bill.paidAt)}` : `Due ${formatDate(bill.dueDate)}`}
      </span>
      <span className="pointer-events-none relative z-10 grid justify-items-end gap-1">
        <span className="text-[15px] font-semibold text-fg tabular">{formatMoney(bill.amount)}</span>
        <BillStatusBadge bill={bill} />
      </span>
      <div className="relative z-10 flex items-center gap-2">
        {bill.status === 'UNPAID' && showQuickPay && (
          <OneClickDemoPayButton bill={bill} size="sm" />
        )}
        <CaretRight size={15} className="hidden text-fg-subtle sm:block transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}
