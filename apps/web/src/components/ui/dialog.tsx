'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from './button';

const overlay =
  'fixed inset-0 z-50 bg-[#050817]/60 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_180ms_ease-out] data-[state=closed]:animate-[fade-out_140ms_ease-in]';
const content =
  'fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[var(--radius-panel)] border border-line bg-surface p-6 shadow-[var(--shadow-pop)] max-h-[calc(100dvh-2rem)] overflow-y-auto data-[state=open]:animate-[dialog-in_220ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[dialog-out_140ms_ease-in]';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: string; description?: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content className={cn(content, className)} {...props} aria-describedby={description ? undefined : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <DialogPrimitive.Title className="text-lg font-bold tracking-tight text-fg">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm leading-relaxed text-fg-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close dialog">
              <X size={16} />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  children?: React.ReactNode;
}

/** Confirmation prompt for consequential actions. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = 'primary', loading, onConfirm, children }: ConfirmDialogProps) {
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className={overlay} />
        <AlertPrimitive.Content className={content}>
          <div className="grid gap-1.5">
            <AlertPrimitive.Title className="text-lg font-bold tracking-tight text-fg">{title}</AlertPrimitive.Title>
            <AlertPrimitive.Description className="text-sm leading-relaxed text-fg-muted">{description}</AlertPrimitive.Description>
          </div>
          {children}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertPrimitive.Cancel>
            <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
