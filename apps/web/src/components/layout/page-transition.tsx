'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { useReducedMotionSafe } from '@/lib/hooks';

// Becomes true after the first client render. The server-rendered page is never
// hidden; only client-side route changes get the fade-up.
let hasHydrated = false;

/** Short fade-up on each route change inside a workspace (used from template.tsx). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotionSafe();
  const [animateIn] = React.useState(() => hasHydrated);
  React.useEffect(() => {
    hasHydrated = true;
  }, []);
  return (
    <motion.div
      initial={reduce || !animateIn ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
