'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ArrowClockwise, CaretDown, CaretLeft, CaretRight, CheckCircle, Info, Warning, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel', className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
  as: Heading = 'h2',
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6', className)}>
      <div className="grid min-w-0 gap-1">
        <Heading className="type-title text-fg">{title}</Heading>
        {description && <p className="text-caption text-fg-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge and notices                                                   */
/* ------------------------------------------------------------------ */

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-fg-muted border-line',
  accent: 'bg-accent-soft text-accent-text border-accent-line',
  success: 'bg-success-soft text-success border-success/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
};

export function Badge({ className, tone = 'neutral', ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-chip border px-2 py-0.5 text-xs font-semibold', BADGE_TONES[tone], className)}
      {...props}
    />
  );
}

const NOTICE_ICONS = { info: Info, success: CheckCircle, warning: Warning, danger: WarningCircle } as const;
const NOTICE_TONES = {
  info: 'border-accent-line bg-accent-soft [&_svg]:text-accent-text',
  success: 'border-success/30 bg-success-soft [&_svg]:text-success',
  warning: 'border-warning/35 bg-warning-soft [&_svg]:text-warning',
  danger: 'border-danger/30 bg-danger-soft [&_svg]:text-danger',
} as const;

/** Inline message block for context that matters on this screen (not transient feedback; that is a toast). */
export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className,
  role,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: 'status' | 'alert' | 'note';
}) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div role={role ?? (tone === 'danger' ? 'alert' : 'status')} className={cn('flex items-start gap-3 rounded-control border px-4 py-3', NOTICE_TONES[tone], className)}>
      <Icon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
      <div className="grid min-w-0 flex-1 gap-0.5 text-sm">
        {title && <p className="font-semibold text-fg">{title}</p>}
        {children && <div className="text-fg-muted">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton, empty and error states                                    */
/* ------------------------------------------------------------------ */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton', className)} {...props} />;
}

/** Explains what is empty, why, and what to do next. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 px-6 py-12 text-center', className)}>
      {icon && (
        <div className="grid h-12 w-12 place-items-center rounded-panel border border-line bg-surface-2 text-fg-subtle" aria-hidden>
          {icon}
        </div>
      )}
      <div className="grid max-w-sm gap-1.5">
        <p className="type-title text-fg">{title}</p>
        {description && <p className="text-sm leading-relaxed text-fg-subtle">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Failure state: what failed, the reason, and a way forward. */
export function ErrorState({
  message,
  onRetry,
  className,
  title = 'This section could not be loaded',
  action,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-4 px-6 py-10 text-center', className)}>
      <div className="grid h-12 w-12 place-items-center rounded-panel border border-danger/25 bg-danger-soft text-danger" aria-hidden>
        <WarningCircle size={22} weight="bold" />
      </div>
      <div className="grid max-w-md gap-1.5">
        <p className="type-title text-fg">{title}</p>
        <p className="text-sm leading-relaxed text-fg-subtle">{message}</p>
      </div>
      {(onRetry || action) && (
        <div className="flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <ArrowClockwise size={15} weight="bold" /> Try again
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs (segmented control)                                            */
/* ------------------------------------------------------------------ */

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex flex-wrap gap-0.5 rounded-control border border-line bg-surface-2 p-0.5', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-chip px-3.5 text-[13px] font-semibold text-fg-muted transition-colors hover:text-fg data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-[0_1px_2px_hsl(var(--shadow-tint)/0.12)]',
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children, side = 'top' }: { content: React.ReactNode; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 max-w-xs rounded-chip bg-fg px-2.5 py-1.5 text-xs font-medium text-bg shadow-[var(--shadow-pop)] data-[state=delayed-open]:animate-[pop-in_140ms_ease-out]"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown menu                                                       */
/* ------------------------------------------------------------------ */

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;

export function DropdownMenuContent({ className, align = 'end', ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        align={align}
        sideOffset={8}
        className={cn(
          'z-50 min-w-56 rounded-panel border border-line bg-surface-elevated p-1 shadow-[var(--shadow-pop)] data-[state=open]:animate-[pop-in_160ms_cubic-bezier(0.16,1,0.3,1)]',
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-chip px-2.5 py-2 text-sm text-fg outline-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50 [&_svg]:text-fg-subtle',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn('px-2.5 py-2 text-xs text-fg-subtle', className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <DropdownPrimitive.Separator className="-mx-1 my-1 h-px bg-line" />;
}

export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export function DropdownMenuRadioItem({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.RadioItem>) {
  return (
    <DropdownPrimitive.RadioItem
      className={cn(
        'relative flex min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-chip py-2 pl-2.5 pr-8 text-sm text-fg outline-none data-[highlighted]:bg-surface-2 [&_svg]:text-fg-subtle',
        className,
      )}
      {...props}
    >
      {children}
      <DropdownPrimitive.ItemIndicator className="absolute right-2.5">
        <span className="block h-2 w-2 rounded-full bg-accent" />
      </DropdownPrimitive.ItemIndicator>
    </DropdownPrimitive.RadioItem>
  );
}

/* ------------------------------------------------------------------ */
/* Popover                                                             */
/* ------------------------------------------------------------------ */

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({ className, align = 'end', ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={10}
        className={cn(
          'z-50 w-[min(400px,calc(100vw-1.5rem))] rounded-panel border border-line bg-surface-elevated shadow-[var(--shadow-pop)] outline-none data-[state=open]:animate-[pop-in_180ms_cubic-bezier(0.16,1,0.3,1)]',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                              */
/* ------------------------------------------------------------------ */

export function Switch({ className, ...props }: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line-strong bg-surface-3 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-4.5 w-4.5 translate-x-0.5 rounded-full bg-surface shadow-[0_1px_3px_hsl(var(--shadow-tint)/0.35)] transition-transform duration-200 data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-accent-fg" />
    </SwitchPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ value, question, children }: { value: string; question: string; children: React.ReactNode }) {
  return (
    <AccordionPrimitive.Item value={value} className="border-b border-line last:border-b-0">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex min-h-14 w-full items-center justify-between gap-6 py-4 text-left text-base font-semibold text-fg transition-colors hover:text-accent-text">
          {question}
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip border border-line text-fg-subtle transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden>
            <CaretDown size={14} weight="bold" />
          </span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-[accordion-up_220ms_ease-out] data-[state=open]:animate-[accordion-down_260ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="max-w-[65ch] pb-5 text-[15px] leading-relaxed text-fg-muted">{children}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  label = 'results',
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-caption text-fg-subtle sm:px-6">
      <span className="tabular">
        Page <span className="font-semibold text-fg-muted">{page}</span> of {totalPages}
        <span className="hidden sm:inline">, {total} {label}</span>
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <CaretLeft size={14} weight="bold" /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          Next <CaretRight size={14} weight="bold" />
        </Button>
      </div>
    </nav>
  );
}
