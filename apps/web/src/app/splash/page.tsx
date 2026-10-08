'use client';

import * as React from 'react';
import Link from 'next/link';
import { CinematicSplash } from '@/components/brand/cinematic-splash';
import { Button } from '@/components/ui/button';

export default function SplashPreviewPage() {
  const [playKey, setPlayKey] = React.useState(1);

  return (
    <div className="relative min-h-screen bg-bg text-fg">
      {/* Cinematic Splash Animation Instance */}
      <CinematicSplash
        key={playKey}
        canSkip={true}
        onComplete={() => {
          console.log('Cinematic startup splash completed!');
        }}
      />

      {/* Control panel shown underneath when splash completes or is dismissed */}
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-fg">
            FixMy<span className="text-accent">City</span> Intro
          </h1>
          <p className="text-sm text-fg-muted">
            5-second cinematic startup animation preview. Runs smooth 60fps vector transitions on a pure civic canvas.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={() => setPlayKey((k) => k + 1)}
            >
              Replay Animation ↺
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/">Go to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
