'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { FAQ_ITEMS } from '@fixmycity/shared';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem } from '@/components/ui/primitives';

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line py-16 md:py-24">
      <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <Reveal className="grid content-start gap-3">
          <h2 className="type-section text-fg">Questions, answered.</h2>
          <p className="text-[15px] leading-relaxed text-fg-muted">
            More in{' '}
            <Link href="/help" className="link">
              Help and contacts
            </Link>
            .
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <Accordion type="single" collapsible className="border-t border-line">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`} question={item.q}>
                {item.a}
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="pb-16 md:pb-24">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-panel border border-accent-line bg-accent-soft px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
            <p className="max-w-3xl text-2xl font-semibold leading-snug tracking-[-0.02em] text-fg [font-variation-settings:'wdth'_106] md:text-[2rem] md:leading-[1.2]">
              A smarter city isn&apos;t just a city with more technology. It&apos;s a city where essential services work together for everyone.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/report-issue">
                  Report an Issue <ArrowRight size={18} weight="bold" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
