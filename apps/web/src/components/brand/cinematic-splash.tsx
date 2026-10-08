'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface CinematicSplashProps {
  onComplete?: () => void;
  canSkip?: boolean;
  className?: string;
}

export function CinematicSplash({ onComplete, canSkip = true, className }: CinematicSplashProps) {
  const [phase, setPhase] = React.useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isDismissed, setIsDismissed] = React.useState(false);

  React.useEffect(() => {
    // 5-Second Timeline Choreography:
    // Phase 1: 0.0s - 0.8s (Discovery Point & Ripple)
    // Phase 2: 0.8s - 1.8s (The Path & Civic Grid)
    // Phase 3: 1.8s - 2.8s (Skyline & Outer Ring Elevation)
    // Phase 4: 2.8s - 3.6s (Network Activation Light Beam)
    // Phase 5: 3.6s - 4.5s (Wordmark Reveal "FixMyCity")
    // Phase 6: 4.5s - 5.0s (Final Pulse & Ready State)

    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => setPhase(4), 2800);
    const t5 = setTimeout(() => setPhase(5), 3600);
    const t6 = setTimeout(() => setPhase(6), 4500);
    const end = setTimeout(() => {
      setIsDismissed(true);
      onComplete?.();
    }, 5200);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(end);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsDismissed(true);
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          key="cinematic-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
          className={cn(
            'fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#FFFFFF] select-none',
            className,
          )}
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {/* Skip button for seamless UX */}
          {canSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="absolute right-6 top-6 z-50 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-slate-500 backdrop-blur-md transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
            >
              Skip intro ✕
            </button>
          )}

          {/* Abstract civic tech background grid (Phase 2) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase >= 2 && phase < 4 ? 0.35 : 0,
            }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,#00A3FF18_1px,transparent_1px),linear-gradient(to_bottom,#00A3FF18_1px,transparent_1px)] [background-size:48px_48px]"
          />

          {/* Central 16:9 cinematic container */}
          <div className="relative flex aspect-[16/9] w-full max-w-4xl flex-col items-center justify-center px-4">
            {/* SVG Vector Canvas for Phases 1-4 */}
            <div className="relative flex h-[340px] w-[340px] items-center justify-center sm:h-[400px] sm:w-[400px]">
              {/* PHASE 1: The Discovery Point & Expanding Ripple Pulse */}
              <AnimatePresence>
                {phase < 3 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* Glowing center point */}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="relative h-4 w-4 rounded-full bg-[#00A3FF] shadow-[0_0_24px_8px_rgba(0,163,255,0.7)]"
                    />

                    {/* Concentric ripple 1 */}
                    <motion.div
                      initial={{ scale: 0.1, opacity: 0.8 }}
                      animate={{ scale: 2.8, opacity: 0 }}
                      transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                      className="absolute h-16 w-16 rounded-full border border-[#00A3FF] shadow-[0_0_16px_rgba(0,210,196,0.5)]"
                    />

                    {/* Concentric ripple 2 (Civic tracking pulse) */}
                    <motion.div
                      initial={{ scale: 0.2, opacity: 0.7 }}
                      animate={{ scale: 4.2, opacity: 0 }}
                      transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
                      className="absolute h-20 w-20 rounded-full border border-dashed border-[#00D2C4]"
                    />
                  </div>
                )}
              </AnimatePresence>

              {/* Vector SVG Animation Layer */}
              <svg
                viewBox="0 0 500 500"
                className="absolute inset-0 h-full w-full overflow-visible"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Gradients matching exact logo color scheme */}
                  <linearGradient id="ringGrad" x1="50" y1="50" x2="450" y2="450" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00D2C4" />
                    <stop offset="50%" stopColor="#00A3FF" />
                    <stop offset="100%" stopColor="#0f4c81" />
                  </linearGradient>

                  <linearGradient id="roadGrad" x1="160" y1="280" x2="340" y2="400" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00D2C4" />
                    <stop offset="100%" stopColor="#0077B6" />
                  </linearGradient>

                  <linearGradient id="skylineGrad1" x1="200" y1="120" x2="300" y2="300" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00A3FF" />
                    <stop offset="100%" stopColor="#0f4c81" />
                  </linearGradient>

                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* PHASE 2: Road path drawing stroke */}
                {phase >= 2 && phase < 4 && (
                  <motion.path
                    d="M 180 320 C 210 300, 290 320, 320 380 L 250 420 Z"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.9, ease: 'easeInOut' }}
                    fill="url(#roadGrad)"
                    stroke="#00D2C4"
                    strokeWidth="3"
                  />
                )}

                {/* PHASE 3: Outer pin/magnifying glass circular ring drawing */}
                {phase >= 3 && phase < 4 && (
                  <motion.circle
                    cx="250"
                    cy="210"
                    r="150"
                    stroke="url(#ringGrad)"
                    strokeWidth="34"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, rotate: -90 }}
                    animate={{ pathLength: 1, rotate: 0 }}
                    transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                    filter="url(#glow)"
                  />
                )}

                {/* PHASE 4: Network Activation (light beam traveling around perimeter) */}
                {phase === 4 && (
                  <motion.circle
                    cx="250"
                    cy="210"
                    r="150"
                    stroke="#FFFFFF"
                    strokeWidth="6"
                    strokeDasharray="40 900"
                    initial={{ strokeDashoffset: 940 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 0.8, ease: 'linear' }}
                    filter="url(#glow)"
                  />
                )}
              </svg>

              {/* Exact High-Resolution Logo Mark Lock-In (Phase 3+) */}
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{
                    opacity: 1,
                    scale: phase === 6 ? [1, 1.035, 1] : 1,
                    y: 0,
                  }}
                  transition={{
                    opacity: { duration: 0.6, ease: 'easeOut' },
                    scale: phase === 6 ? { duration: 0.55, ease: 'easeInOut' } : { duration: 0.5 },
                  }}
                  className="relative z-10 flex h-full w-full items-center justify-center"
                >
                  <Image
                    src="/brand/logo-mark.png"
                    alt="FixMyCity Vector Mark"
                    width={380}
                    height={380}
                    priority
                    className="h-auto w-[280px] object-contain sm:w-[320px]"
                  />
                </motion.div>
              )}
            </div>

            {/* PHASE 5 & 6: Wordmark Reveal ("FixMyCity") */}
            <div className="relative mt-2 flex h-20 items-center justify-center overflow-hidden">
              <AnimatePresence>
                {phase >= 5 && (
                  <motion.div
                    initial={{ opacity: 0, y: 22, clipPath: 'inset(0 100% 0 0)' }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      clipPath: 'inset(0 0% 0 0)',
                      scale: phase === 6 ? [1, 1.03, 1] : 1,
                    }}
                    transition={{
                      duration: 0.75,
                      ease: [0.16, 1, 0.3, 1],
                      scale: phase === 6 ? { duration: 0.55, ease: 'easeInOut' } : {},
                    }}
                    className="flex items-center tracking-tight"
                  >
                    <span className="text-4xl font-extrabold tracking-[-0.035em] text-[#111d4a] sm:text-5xl lg:text-6xl">
                      FixMy<span className="text-[#00A3FF]">City</span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Phase status indicator (discrete 60fps telemetry bar) */}
            <div className="mt-6 flex w-48 items-center gap-1.5 opacity-60">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{
                    width:
                      phase === 1
                        ? '16%'
                        : phase === 2
                          ? '36%'
                          : phase === 3
                            ? '56%'
                            : phase === 4
                              ? '72%'
                              : phase === 5
                                ? '90%'
                                : '100%',
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-[#00A3FF] to-[#00D2C4]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
