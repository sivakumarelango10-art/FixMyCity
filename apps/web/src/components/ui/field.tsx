'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

export const inputBase =
  'w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-[15px] text-fg transition-[border-color,box-shadow] duration-150 hover:border-fg-subtle focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent-soft disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger-soft';

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
  hint?: string;
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
        <p id={hintId} className="text-[13px] text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-[var(--radius-control)] border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
      {message}
    </div>
  );
}
