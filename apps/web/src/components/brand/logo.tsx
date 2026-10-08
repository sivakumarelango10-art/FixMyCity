import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Brand mark: circular pin with urban skyline and roadway.
 */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt="FixMyCity"
      width={size}
      height={size}
      className={cn('shrink-0 object-contain', className)}
      priority
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[17px] font-bold tracking-[-0.02em] text-fg [font-variation-settings:"wdth"_108]', className)}>
      Fix<span className="text-accent">My</span>
      <span className="text-accent hover:text-[#125452]">City</span>
    </span>
  );
}

export function Logo({ href = '/', className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5 rounded-control group', className)} aria-label="FixMyCity home">
      <LogoMark size={32} />
      {!compact && <Wordmark />}
    </Link>
  );
}

export function FullLogo({ className, height = 36, href = '/' }: { className?: string; height?: number; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center', className)} aria-label="FixMyCity home">
      <Image
        src="/brand/logo.png"
        alt="FixMyCity"
        width={Math.round(height * (783 / 644))}
        height={height}
        className={cn('object-contain', className)}
        priority
      />
    </Link>
  );
}
