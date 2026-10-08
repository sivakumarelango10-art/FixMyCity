'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from '@phosphor-icons/react';
import type { PublicMapComplaint } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { IssuesMap } from '@/components/maps';
import { MapLegend } from '@/components/maps/city-map-view';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export function Hero() {
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: qk.publicMap({}),
    queryFn: () => api.get<PublicMapComplaint[]>('/api/public/map'),
    refetchInterval: 60_000,
  });

  // Entrance runs in CSS (.enter-up) so the hero is never hidden while JS loads.
  const delay = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as React.CSSProperties;

  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:pb-24 lg:pt-16">
        <div className="grid max-w-[600px] gap-6 sm:gap-7">
          <p className="enter-up type-overline text-accent-text">One City. One Platform. Every Service.</p>
          <h1 style={delay(60)} className="enter-up type-display text-fg">
            <span className="block">Your City.</span> <span className="block text-accent-text">Your Voice.</span>
          </h1>
          <p style={delay(120)} className="enter-up type-lead max-w-[44ch]">
            Report problems, track progress, discover city services, and stay connected with what&apos;s happening around you.
          </p>
          <div style={delay(180)} className="enter-up flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/report-issue">
                Report an Issue <ArrowRight size={18} weight="bold" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/services">Explore Services</Link>
            </Button>
          </div>
        </div>

        <figure style={delay(140)} className="enter-up grid min-w-0 gap-3">
          <div className="panel relative overflow-hidden">
            <IssuesMap
              complaints={complaints}
              scrollZoom={false}
              className="h-[340px] sm:h-[440px] lg:h-[520px]"
              ariaLabel="Map of civic issue reports across the demo city"
            />
            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden w-[250px] sm:block">
              <div className="pointer-events-auto rounded-panel border border-line bg-surface p-3.5 shadow-card">
                <p className="mb-2.5 text-xs font-semibold text-fg">{isLoading ? 'Loading reports' : 'On the map now'}</p>
                <MapLegend items={complaints} className="[&>p]:hidden" />
              </div>
            </div>
          </div>
          <MapLegend items={complaints} className="rounded-panel border border-line bg-surface p-3.5 sm:hidden [&>p]:hidden" />
          <figcaption className="px-1 text-caption text-fg-subtle">
            Live from the demo database. The public map never shows who reported an issue.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
