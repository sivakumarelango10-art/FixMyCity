import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/*
 * One button, five intents:
 * - primary: the single most important action in a view (civic blue)
 * - secondary: every other action (bordered surface)
 * - ghost: low-emphasis actions inside toolbars and menus
 * - danger: destructive confirmation; danger-quiet: entry point to one
 * - link: inline text action
 * md is 44px tall to meet touch-target guidance; sm is for dense toolbars.
 */
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold select-none transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-[0_1px_2px_hsl(var(--shadow-tint)/0.18)]',
        secondary: 'border border-line-strong bg-surface text-fg hover:border-fg-subtle hover:bg-surface-2',
        ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        danger: 'bg-danger text-white hover:brightness-110 dark:text-[#1a0606]',
        'danger-quiet': 'border border-danger/35 bg-surface text-danger hover:bg-danger-soft',
        link: 'h-auto px-0 text-accent-text underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        sm: 'h-9 rounded-control px-3.5 text-[13px]',
        md: 'h-11 rounded-control px-4.5 text-sm',
        lg: 'h-12 rounded-control px-5.5 text-[15px]',
        icon: 'h-11 w-11 rounded-control',
        'icon-sm': 'h-9 w-9 rounded-control',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

/** Small inline spinner for pending actions; static under reduced motion. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none', className)} />
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : loading ? (
          <>
            <Spinner />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
