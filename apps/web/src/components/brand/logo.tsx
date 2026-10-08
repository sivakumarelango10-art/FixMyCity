import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Geometric mark: four city blocks on a grid, one lit in the accent color. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--surface-3)" stroke="var(--line-strong)" />
      <rect x="7" y="7" width="8" height="8" rx="2.5" fill="var(--fg-muted)" opacity="0.55" />
      <rect x="17" y="7" width="8" height="8" rx="2.5" fill="var(--accent)" />
      <rect x="7" y="17" width="8" height="8" rx="2.5" fill="var(--fg-muted)" opacity="0.55" />
      <rect x="17" y="17" width="8" height="8" rx="2.5" fill="var(--fg-muted)" opacity="0.55" />
    </svg>
  );
}

export function Logo({ href = '/', className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="FixMyCity home">
      <LogoMark />
      {!compact && (
        <span className="text-[17px] font-extrabold tracking-tight text-fg">
          FixMy<span className="text-accent">City</span>
        </span>
      )}
    </Link>
  );
}
