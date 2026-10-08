'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Camera, CheckCircle, ListMagnifyingGlass, Signpost, Sparkle, type Icon } from '@phosphor-icons/react';
import { Reveal } from '@/components/motion/reveal';

const STEPS: { icon: Icon; title: string; body: string }[] = [
  { icon: Camera, title: 'Report', body: 'Describe the issue, add a photo and drop a pin on the map.' },
  { icon: Sparkle, title: 'Analyze', body: 'A classifier suggests category, department and priority, clearly labeled as a suggestion.' },
  { icon: Signpost, title: 'Assign', body: 'An administrator reviews the report and routes it to the right department.' },
  { icon: CheckCircle, title: 'Resolve', body: 'Officers record progress notes and the resolution on the record.' },
  { icon: ListMagnifyingGlass, title: 'Track', body: 'You follow every status change on a timeline, with alerts as it moves.' },
];

export function Workflow() {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface/40 py-20 lg:py-28">
      <div className="container-page grid gap-14">
        <Reveal className="grid max-w-2xl gap-4">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-accent">How it works</p>
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">From report to resolution in five steps.</h2>
        </Reveal>

        <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-6">
          {/* Connecting rail draws in as the section enters, mirroring the order of the steps. */}
          <motion.span
            aria-hidden
            className="absolute left-[22px] top-0 h-full w-px origin-top bg-gradient-to-b from-accent via-accent/50 to-transparent lg:left-0 lg:top-[22px] lg:h-px lg:w-full lg:origin-left lg:bg-gradient-to-r"
            initial={reduce ? false : { scaleX: 0, scaleY: 0 }}
            whileInView={{ scaleX: 1, scaleY: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              className="relative grid grid-cols-[44px_1fr] gap-4 lg:grid-cols-1"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="relative z-10 grid h-11 w-11 place-items-center rounded-[14px] border border-accent-line bg-bg text-accent">
                <Icon size={22} weight="bold" />
              </span>
              <div className="grid gap-1.5">
                <h3 className="text-lg font-extrabold text-fg">{title}</h3>
                <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
