'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CaretDown, CheckCircle, ShieldCheck } from '@phosphor-icons/react';
import type { PublicMapComplaint } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { IssuesMap } from '@/components/maps';
import { MapLegend } from '@/components/maps/city-map-view';
import { useReducedMotionSafe } from '@/lib/hooks';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

export function Hero() {
  const prefersReducedMotion = useReducedMotionSafe();
  const [videoLoaded, setVideoLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: qk.publicMap({}),
    queryFn: () => api.get<PublicMapComplaint[]>('/api/public/map'),
    refetchInterval: 60_000,
  });

  // Attempt autoplay safely across mobile and desktop browsers
  React.useEffect(() => {
    if (!prefersReducedMotion && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Safe fallback if browser policy temporarily suspends autoplay
      });
    }
  }, [prefersReducedMotion]);

  // Staggered entrance timing
  const delay = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as React.CSSProperties;

  return (
    <section className="relative flex min-h-[92vh] sm:min-h-screen items-center justify-center overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Cinematic Background Video Layer (strictly pointer-events-none)   */}
      {/* ------------------------------------------------------------------ */}
      <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden" aria-hidden="true">
        {/* High-resolution poster fallback for zero blank flicker & reduced-motion */}
        <Image
          src="/videos/landing-poster.webp"
          alt="FixMyCity Civic Operations"
          fill
          priority
          sizes="100vw"
          className={cn(
            'object-cover object-center transition-opacity duration-1000',
            videoLoaded && !prefersReducedMotion ? 'opacity-0' : 'opacity-100',
          )}
        />

        {/* Cinematic WebM/MP4 Video Element */}
        {!prefersReducedMotion && (
          <video
            ref={videoRef}
            src="/videos/landing-video.mp4"
            poster="/videos/landing-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            className={cn(
              'h-full w-full object-cover object-center transition-opacity duration-1000',
              videoLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}

        {/* Subtle Dark Civic Gradient Overlays for maximum text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#172322]/95 via-[#172322]/85 to-[#172322]/70 lg:from-[#172322]/95 lg:via-[#172322]/80 lg:to-[#172322]/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#172322]/60 via-transparent to-[#172322]/90" />

        {/* Smooth bottom grounding transition into page content */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[var(--background)] to-transparent" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Foreground Hero Content Grid                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="container-page relative z-10 grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-24">
        {/* Left Column: Heading, Value Proposition, Action Buttons */}
        <div className="grid max-w-[620px] gap-6 sm:gap-7">
          {/* Overline Status Badge */}
          <div className="enter-up flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-chip border border-[#54B4B0]/40 bg-[#176B68]/30 px-3.5 py-1 text-xs font-semibold text-[#7FE2DE] shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#54B4B0] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#54B4B0]" />
              </span>
              One City. One Platform. Every Service.
            </span>
          </div>

          {/* Main Display Headline */}
          <h1 style={delay(60)} className="enter-up type-display text-white">
            <span className="block">Your City.</span>{' '}
            <span className="block text-[#54B4B0]">Your Voice.</span>
          </h1>

          {/* Lead Description */}
          <p style={delay(120)} className="enter-up type-lead max-w-[46ch] text-[#DCE4E2]">
            Report civic problems, track live repair progress, pay utility bills, and stay connected with municipal services around you.
          </p>

          {/* Action CTAs */}
          <div style={delay(180)} className="enter-up flex flex-wrap items-center gap-3.5 pt-1">
            <Button asChild size="lg" className="h-12 px-6 font-semibold text-white shadow-md">
              <Link href="/report-issue">
                Report an Issue <ArrowRight size={18} weight="bold" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 border-white/25 bg-white/10 px-6 font-semibold text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>

          {/* Civic Trust Signals */}
          <div style={delay(240)} className="enter-up flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#A3C2BF]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={15} weight="fill" className="text-[#54B4B0]" />
              Instant tracking ID
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={15} weight="fill" className="text-[#54B4B0]" />
              Citizen privacy protected
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Live Issues Map Card */}
        <figure style={delay(160)} className="enter-up grid min-w-0 gap-3">
          <div className="panel relative overflow-hidden border-white/20 bg-[#172322]/85 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
            <IssuesMap
              complaints={complaints}
              scrollZoom={false}
              className="h-[340px] sm:h-[420px] lg:h-[480px]"
              ariaLabel="Map of civic issue reports across the demo city"
            />
            {/* Desktop Map Legend Float */}
            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden w-[260px] sm:block">
              <div className="pointer-events-auto rounded-panel border border-white/15 bg-[#172322]/95 p-3.5 text-white shadow-card">
                <p className="mb-2.5 text-xs font-semibold text-[#F7F9F8]">
                  {isLoading ? 'Loading reports…' : `On the map now (${complaints.length})`}
                </p>
                <MapLegend items={complaints} className="[&>p]:hidden text-[#DCE4E2]" />
              </div>
            </div>
          </div>

          {/* Mobile Map Legend */}
          <MapLegend
            items={complaints}
            className="rounded-panel border border-line bg-surface p-3.5 sm:hidden [&>p]:hidden"
          />

          <figcaption className="px-1 text-caption text-[#A3C2BF]">
            Live municipal reports from OpenStreetMap. Personal citizen details never appear on the public map.
          </figcaption>
        </figure>
      </div>

      {/* Subtle Scroll Indicator */}
      <a
        href="#how-it-works"
        aria-label="Scroll down to learn how it works"
        className="pointer-events-auto absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1 text-xs font-medium text-[#A3C2BF] transition-colors hover:text-white sm:flex"
      >
        <span>Explore workflow</span>
        <CaretDown size={14} className="animate-bounce" />
      </a>
    </section>
  );
}
