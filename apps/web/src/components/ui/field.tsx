'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

/* 16px text on small screens prevents iOS from zooming into focused fields. */
export const inputBase =
  'w-full rounded-control border border-line-strong bg-surface px-3.5 text-base text-fg transition-[border-color,box-shadow,background-color] duration-150 hover:border-fg-subtle focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger-soft sm:text-[15px]';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputBase, 'h-11', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputBase, 'min-h-28 resize-y py-3 leading-relaxed', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => <LabelPrimitive.Root ref={ref} className={cn('text-sm font-semibold text-fg', className)} {...props} />);
Label.displayName = 'Label';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
  action?: React.ReactNode;
}

/** Label above, control, then hint or error below. Wires up aria attributes automatically. */
export function Field({ id, label, error, hint, optional, className, children, action }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {optional && <span className="ml-1.5 font-normal text-fg-subtle">(optional)</span>}
        </Label>
        {action}
      </div>
      {React.cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-caption text-fg-subtle">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}

/** Inline error under a control: icon plus text, never color alone. */
export function FieldError({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <p id={id} role="alert" className={cn('flex items-start gap-1.5 text-caption font-medium text-danger', className)}>
      <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function FormError({ message, title }: { message?: string | null; title?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-control border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
      <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
      <div className="grid gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'text-fg-muted' : 'font-medium'}>{message}</p>
      </div>
    </div>
  );
}
