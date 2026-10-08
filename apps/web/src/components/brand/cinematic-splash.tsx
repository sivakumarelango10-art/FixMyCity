'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Wordmark } from '@/components/brand/logo';

interface CinematicSplashProps {
  onComplete?: () => void;
  autoDismiss?: boolean;
  canSkip?: boolean;
}

/**
 * 5-second cinematic startup splash animation refactored for the Civic Teal Design System (UI.md & Design.md).
 * Uses restrained Civic Teal (#176B68, #125452), crisp surfaces (#F7F9F8, #FFFFFF), and functional motion.
 * Anti-AI compliance: No neon glows, no purple/blue gradients, no holographic effects.
 */
export function CinematicSplash({ onComplete, autoDismiss = true, canSkip = false }: CinematicSplashProps) {
  const [phase, setPhase] = React.useState<number>(1);
  const [visible, setVisible] = React.useState<boolean>(true);

  const handleSkip = () => {
    setVisible(false);
    onComplete?.();
  };

  React.useEffect(() => {
    // 0.0s -> 0.8s: Phase 1 (Pulse & Discovery)
    const t1 = setTimeout(() => setPhase(2), 800);
    // 0.8s -> 2.0s: Phase 2 (Infrastructure & Roadways)
    const t2 = setTimeout(() => setPhase(3), 2000);
    // 2.0s -> 3.2s: Phase 3 (City Skyline)
    const t3 = setTimeout(() => setPhase(4), 3200);
    // 3.2s -> 4.5s: Phase 4 (Convergence & Wordmark Reveal)
    const t4 = setTimeout(() => setPhase(5), 4400);
    // 4.5s -> 5.0s: Phase 5 (Seamless Exit)
    const t5 = setTimeout(() => {
      setPhase(6);
      if (autoDismiss) {
        setVisible(false);
        onComplete?.();
      }
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [autoDismiss, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cinematic-splash-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#F7F9F8] text-[#172322] select-none"
        >
          {/* Subtle civic background surface */}
          <div className="pointer-events-none absolute inset-0 bg-[#F7F9F8]" />

          {canSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="absolute right-6 top-6 z-50 rounded-chip border border-[#DCE4E2] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#172322] shadow-xs transition-colors hover:bg-[#F7F9F8] focus-visible:outline-2 focus-visible:outline-[#176B68]"
            >
              Skip
            </button>
          )}

          {/* Central 16:9 cinematic container */}
          <div className="relative flex aspect-[16/9] w-full max-w-4xl flex-col items-center justify-center px-4">
            {/* SVG Vector Canvas for Phases 1-4 */}
            <div className="relative flex h-[340px] w-[340px] items-center justify-center sm:h-[400px] sm:w-[400px]">
              {/* PHASE 1: Discovery Point & Civic Pulse */}
              <AnimatePresence>
                {phase < 3 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.9] }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="relative h-4 w-4 rounded-full bg-[#176B68]"
                    />

                    <motion.div
                      initial={{ scale: 0.1, opacity: 0.6 }}
                      animate={{ scale: 2.6, opacity: 0 }}
                      transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                      className="absolute h-16 w-16 rounded-full border border-[#176B68]/40"
                    />

                    <motion.div
                      initial={{ scale: 0.2, opacity: 0.5 }}
                      animate={{ scale: 3.8, opacity: 0 }}
                      transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
                      className="absolute h-20 w-20 rounded-full border border-dashed border-[#125452]/30"
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
                {/* PHASE 2: Road path drawing stroke */}
                {phase >= 2 && phase < 4 && (
                  <motion.path
                    d="M 180 320 C 210 300, 290 320, 320 380 L 250 420 Z"
                    fill="none"
                    stroke="#176B68"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.9 }}
                    transition={{ duration: 1.0, ease: 'easeInOut' }}
                  />
                )}

                {/* Road dashed center dividing marker */}
                {phase >= 2 && phase < 4 && (
                  <motion.path
                    d="M 230 350 Q 245 375 260 405"
                    fill="none"
                    stroke="#DCE4E2"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                )}

                {/* PHASE 3: Municipal Skyline silhouette vectors */}
                {phase >= 3 && phase < 4 && (
                  <motion.g
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 0.95 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  >
                    {/* Tower 1 */}
                    <rect x="180" y="210" width="24" height="110" rx="3" fill="#125452" opacity="0.8" />
                    {/* Tower 2 - Tall central spire */}
                    <rect x="210" y="160" width="30" height="160" rx="3" fill="#176B68" />
                    <line x1="225" y1="135" x2="225" y2="160" stroke="#176B68" strokeWidth="3" strokeLinecap="round" />
                    {/* Building 3 */}
                    <rect x="246" y="190" width="32" height="130" rx="3" fill="#125452" opacity="0.85" />
                    {/* Building 4 */}
                    <rect x="284" y="230" width="28" height="90" rx="3" fill="#176B68" opacity="0.75" />
                  </motion.g>
                )}

                {/* Surrounding Civic Pin Outer Ring */}
                {phase >= 2 && phase < 4 && (
                  <motion.circle
                    cx="250"
                    cy="250"
                    r="190"
                    stroke="#176B68"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="1200"
                    initial={{ strokeDashoffset: 1200 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                  />
                )}
              </svg>

              {/* PHASE 4 & 5: Complete Lockup Reveal with official Logo */}
              <AnimatePresence>
                {phase >= 4 && (
                  <motion.div
                    key="final-logo-lockup"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="relative flex flex-col items-center justify-center text-center"
                  >
                    {/* Official FixMyCity Logo Mark */}
                    <div className="relative mb-5 flex h-28 w-28 items-center justify-center rounded-2xl border border-[#DCE4E2] bg-white p-3 shadow-[0_4px_12px_rgba(15,35,32,0.08)]">
                      <Image
                        src="/brand/logo-mark.png"
                        alt="FixMyCity Official Logo"
                        width={96}
                        height={96}
                        className="object-contain"
                        priority
                      />
                    </div>

                    {/* Typography: Official Wordmark */}
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.15 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <h1 className="text-3xl font-extrabold tracking-tight text-[#172322] sm:text-4xl">
                        <Wordmark className="text-3xl sm:text-4xl" />
                      </h1>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-xs font-semibold uppercase tracking-widest text-[#687674] sm:text-sm"
                      >
                        One City &bull; One Platform &bull; Every Service
                      </motion.p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Restrained progress indicator */}
            <div className="mt-6 flex w-48 items-center gap-1.5 opacity-60">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-[#DCE4E2]">
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
                  className="h-full rounded-full bg-[#176B68]"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
