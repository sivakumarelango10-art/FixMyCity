'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretDown, Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { inputBase } from './field';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  id?: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
  size?: 'md' | 'sm';
}

const ALL = '__all__';

/** Accessible select. Use value "" with an option of value "" to represent "all". */
export function Select({ id, value, onValueChange, options, placeholder, disabled, className, size = 'md', ...aria }: SelectProps) {
  const mapped = options.map((o) => ({ ...o, value: o.value === '' ? ALL : o.value }));
  const current = value === '' ? ALL : value;
  return (
    <SelectPrimitive.Root value={current} onValueChange={(v) => onValueChange(v === ALL ? '' : v)} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          inputBase,
          'flex items-center justify-between gap-2 text-left data-[placeholder]:text-fg-subtle',
          size === 'sm' ? 'h-9 px-3 text-[13px] sm:text-[13px]' : 'h-11',
          className,
        )}
        {...aria}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon>
          <CaretDown size={14} weight="bold" className="text-fg-subtle" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-[min(380px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-panel border border-line bg-surface-elevated shadow-[var(--shadow-pop)] data-[state=open]:animate-[pop-in_160ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          <SelectPrimitive.Viewport className="p-1">
            {mapped.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="relative flex min-h-10 cursor-pointer select-none items-center gap-2 rounded-chip py-2 pl-8 pr-3 text-sm text-fg outline-none data-[highlighted]:bg-surface-2 data-[state=checked]:font-semibold"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5 top-1/2 -translate-y-1/2">
                  <Check size={14} weight="bold" className="text-accent-text" />
                </SelectPrimitive.ItemIndicator>
                <div>
                  <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                  {o.description && <p className="mt-0.5 text-xs font-normal text-fg-subtle">{o.description}</p>}
                </div>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
