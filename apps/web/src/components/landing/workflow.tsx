'use client';

import { motion, useReducedMotion } from 'motion/react';
import { REOPEN_WINDOW_DAYS, STATUS_LABELS, STATUS_PROGRESSION, type ComplaintStatus } from '@fixmycity/shared';
import { STATUS_ICONS } from '@/components/common/complaint-meta';
import { Reveal } from '@/components/motion/reveal';

/* What actually happens at each station, and who acts. Mirrors the API workflow. */
const STOPS: Partial<Record<ComplaintStatus, { who: string; body: string }>> = {
  SUBMITTED: { who: 'You', body: 'Describe the problem, add a photo and pin it. You get a tracking ID and a suggested category straight away.' },
  ASSIGNED: { who: 'Municipal administrator', body: 'Reviews the report, accepts or overrides the suggestion and routes it to the responsible department.' },
  IN_PROGRESS: { who: 'Department officer', body: 'Starts work on site and posts progress updates that appear on your timeline.' },
  RESOLVED: { who: 'Department, then you', body: `Records what was fixed, with photos. You rate the result or reopen it within ${REOPEN_WINDOW_DAYS} days.` },
};

export function Workflow() {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface py-16 md:py-24">
      <div className="container-page grid gap-12 md:gap-16">
        <Reveal className="grid max-w-2xl gap-4">
          <h2 className="type-section text-fg">From report to resolution, on one visible route.</h2>
          <p className="type-lead">Every report travels the same four stops. You see each one the moment it happens.</p>
        </Reveal>

        <ol className="relative grid gap-10 md:grid-cols-4 md:gap-6" aria-label="How a report moves">
          {/* The route line draws in as the section enters: the order of the stops is the story. */}
          <span aria-hidden className="absolute bottom-6 left-[19px] top-5 w-1 rounded-full bg-surface-3 md:bottom-auto md:left-5 md:right-[calc(25%-38px)] md:top-[18px] md:h-1 md:w-auto" />
          <motion.span
            aria-hidden
            className="absolute bottom-6 left-[19px] top-5 w-1 origin-top rounded-full bg-accent md:bottom-auto md:left-5 md:right-[calc(25%-38px)] md:top-[18px] md:h-1 md:w-auto md:origin-left"
            initial={reduce ? false : { scaleX: 0, scaleY: 0 }}
            whileInView={{ scaleX: 1, scaleY: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          {STATUS_PROGRESSION.map((s: ComplaintStatus, i) => {
            const Icon = STATUS_ICONS[s];
            const stop = STOPS[s]!;
            return (
              <motion.li
                key={s}
                className="relative grid grid-cols-[40px_1fr] gap-4 md:grid-cols-1 md:gap-5"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border-4 border-surface bg-accent text-accent-fg">
                  <Icon size={17} weight="bold" aria-hidden />
                </span>
                <div className="grid gap-1.5 md:pr-4">
                  <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg">{STATUS_LABELS[s]}</h3>
                  <p className="text-[13px] font-semibold text-accent-text">{stop.who}</p>
                  <p className="text-[15px] leading-relaxed text-fg-muted">{stop.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
