'use client';

import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';
import { FAQ_ITEMS } from '@fixmycity/shared';
import { Reveal } from '@/components/motion/reveal';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem } from '@/components/ui/primitives';

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line py-20 lg:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">Questions, answered.</h2>
        </Reveal>
        <Reveal delay={0.08}>
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
    <section className="pb-24">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-[24px] border border-accent-line bg-[radial-gradient(120%_140%_at_0%_0%,var(--accent-soft),transparent_60%)] px-6 py-14 sm:px-12 lg:px-16 lg:py-20">
          <div className="grid max-w-3xl gap-6">
            <p className="text-2xl font-extrabold leading-snug tracking-[-0.02em] text-fg md:text-[2.1rem] md:leading-[1.2]">
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
