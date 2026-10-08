'use client';

import * as React from 'react';
import { useReducedMotionSafe } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/**
 * Fades content up as it scrolls into view, using CSS scroll-driven animation
 * (see .reveal in globals.css). Nothing is hidden in the server HTML: browsers
 * without scroll timelines, and readers who prefer reduced motion, simply see
 * the content. `delay` offsets the start of the animation range for stagger.
 */
export function Reveal({ delay = 0, className, style, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { delay?: number }) {
  return (
    <div className={cn('reveal', className)} style={delay ? ({ '--reveal-offset': `${Math.round(delay * 60)}%`, ...style } as React.CSSProperties) : style} {...props}>
      {children}
    </div>
  );
}

/** Animated integer that counts up when it changes. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotionSafe();
  const [display, setDisplay] = React.useState(reduce ? value : 0);
  const from = React.useRef(0);
  React.useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    const initial = from.current;
    const duration = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(initial + (value - initial) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  // Under reduced motion the value is shown directly, with no animation state involved.
  return <span className={className}>{reduce ? value : display}</span>;
}
