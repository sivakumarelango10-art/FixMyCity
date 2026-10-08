'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from '@phosphor-icons/react';
import type { PublicMapComplaint, PublicStats } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { IssuesMap } from '@/components/maps';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export function Hero() {
  const { data: complaints = [] } = useQuery({
    queryKey: qk.publicMap({}),
    queryFn: () => api.get<PublicMapComplaint[]>('/api/public/map'),
    refetchInterval: 60_000,
  });
  const { data: stats } = useQuery({ queryKey: qk.publicStats, queryFn: () => api.get<PublicStats>('/api/public/stats') });

  // Entrance runs in CSS (.enter-up / .enter-scale) so the hero is never hidden while JS loads.
  const delay = (ms: number) => ({ '--enter-delay': `${ms}ms` }) as React.CSSProperties;

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="hairline-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]" />
      <div className="container-page relative grid items-center gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-[1.12fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
        <div className="grid max-w-[640px] gap-7">
          <p className="enter-up text-[13px] font-bold uppercase tracking-[0.16em] text-accent">
            One City. One Platform. Every Service.
          </p>
          <h1 style={delay(60)} className="enter-up text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl lg:text-[2.8rem] xl:text-[3.6rem]">
            Your City. Your Voice.
            <br />
            <span className="text-accent">One Platform.</span>
          </h1>
          <p style={delay(120)} className="enter-up max-w-[46ch] text-lg leading-relaxed text-fg-muted">
            Report civic issues, track resolutions, access urban services, and stay connected with your city, all from one intelligent
            platform.
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

        <figure style={delay(150)} className="enter-scale grid gap-3">
          <div className="panel overflow-hidden p-1.5">
            <IssuesMap
              complaints={complaints}
              className="h-[340px] rounded-[14px] sm:h-[420px] lg:h-[480px]"
              ariaLabel="Live map of demo civic issue reports across Bengaluru"
            />
          </div>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 px-1 text-[13px] text-fg-subtle">
            <span>
              {stats ? (
                <>
                  <span className="font-semibold text-fg-muted tabular">{stats.total}</span> reports on the map,{' '}
                  <span className="font-semibold text-fg-muted tabular">{stats.resolved}</span> resolved
                </>
              ) : (
                'Loading live reports'
              )}
            </span>
            <span>Live demo data. Public view shows no personal details.</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
