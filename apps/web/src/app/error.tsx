'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="grid min-h-[60dvh] place-items-center px-6">
      <div className="grid max-w-md justify-items-center gap-4 text-center">
        <h1 className="type-page text-fg">Something went wrong</h1>
        <p className="text-fg-muted">This part of FixMyCity failed to load. Your data is safe. Try again, or reload the page.</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
