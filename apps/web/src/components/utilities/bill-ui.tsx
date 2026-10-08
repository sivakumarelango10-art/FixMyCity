'use client';

import Link from 'next/link';
import { CaretRight, CheckCircle, Drop, House, Lightning, Recycle, Warning, type Icon } from '@phosphor-icons/react';
import { DEMO_PAYMENT_NOTICE, type BillDto, type UtilityServiceType } from '@fixmycity/shared';
import { Badge } from '@/components/ui/primitives';
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

export function BillRow({ bill }: { bill: BillDto }) {
  const Icon = SERVICE_ICONS[bill.serviceType];
  return (
    <Link
      href={`/dashboard/utilities/${bill.id}`}
      className="group grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 rounded-control px-3 py-3 transition-colors hover:bg-surface-2 sm:grid-cols-[40px_minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-control border border-line bg-surface-2 text-fg-muted" aria-hidden>
        <Icon size={19} />
      </span>
      <span className="grid min-w-0">
        <span className="truncate text-sm font-semibold text-fg">{bill.serviceLabel}</span>
        <span className="truncate text-xs text-fg-subtle">{bill.billingPeriod}</span>
      </span>
      <span className="hidden text-[13px] text-fg-muted sm:block">{bill.status === 'PAID' ? `Paid ${formatDate(bill.paidAt)}` : `Due ${formatDate(bill.dueDate)}`}</span>
      <span className="grid justify-items-end gap-1">
        <span className="text-[15px] font-semibold text-fg tabular">{formatMoney(bill.amount)}</span>
        <BillStatusBadge bill={bill} />
      </span>
      <CaretRight size={15} className="hidden text-fg-subtle sm:block" />
    </Link>
  );
}
