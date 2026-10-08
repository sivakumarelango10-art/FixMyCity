'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowClockwise, ArrowLeft, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grid min-h-[70dvh] place-items-center px-4 py-16">
      <div className="grid max-w-md justify-items-center gap-5 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-panel border border-danger/25 bg-danger-soft text-danger" aria-hidden>
          <WarningCircle size={26} weight="bold" />
        </span>
        <div className="grid gap-2">
          <h1 className="type-page text-fg">Something went wrong</h1>
          <p className="text-fg-muted">This page failed to load. Nothing you submitted was lost. Try again, or go back to where you were.</p>
          {error.digest && <p className="font-mono text-xs text-fg-subtle">Reference {error.digest}</p>}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <ArrowClockwise size={16} weight="bold" /> Try again
          </Button>
          <Button variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft size={16} weight="bold" /> Go back
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
