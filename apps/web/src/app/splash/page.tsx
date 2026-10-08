'use client';

import * as React from 'react';
import Link from 'next/link';
import { CinematicSplash } from '@/components/brand/cinematic-splash';
import { Button } from '@/components/ui/button';

export default function SplashPreviewPage() {
  const [playKey, setPlayKey] = React.useState(1);

  return (
    <div className="relative min-h-screen bg-[#FFFFFF] text-slate-900">
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
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111d4a]">
            FixMy<span className="text-[#00A3FF]">City</span> Intro
          </h1>
          <p className="text-sm text-slate-600">
            5-second cinematic startup animation preview. Runs smooth 60fps vector transitions on a pure white canvas.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <Button
              size="lg"
              onClick={() => setPlayKey((k) => k + 1)}
              className="bg-[#00A3FF] text-white hover:bg-[#008fe0]"
            >
              Replay Animation ↺
            </Button>
            <Link href="/" className="inline-flex items-center justify-center rounded-control border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
