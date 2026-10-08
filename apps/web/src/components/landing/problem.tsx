'use client';

import { motion } from 'motion/react';
import {
  ArrowRight,
  Barricade,
  Bell,
  ChatsCircle,
  Drop,
  House,
  Lightning,
  Lightbulb,
  LockSimple,
  Megaphone,
  Trash,
  type Icon,
} from '@phosphor-icons/react';
import { LogoMark } from '@/components/brand/logo';
import { Reveal, staggerChild, staggerParent } from '@/components/motion/reveal';

const PORTALS: { icon: Icon; label: string }[] = [
  { icon: Lightning, label: 'Electricity bill portal' },
  { icon: Drop, label: 'Water board website' },
  { icon: House, label: 'Property tax office' },
  { icon: Barricade, label: 'Pothole helpline' },
  { icon: Trash, label: 'Garbage complaint app' },
  { icon: Lightbulb, label: 'Streetlight register' },
  { icon: Megaphone, label: 'Notice boards' },
  { icon: ChatsCircle, label: 'Complaint follow-ups' },
];

const UNIFIED = ['Unified dashboard', 'Complaint management', 'Utility hub', 'City information', 'Connected administration'];

export function Problem() {
  return (
    <section className="border-y border-line bg-surface/40 py-20 lg:py-28">
      <div className="container-page grid gap-12">
        <Reveal className="grid max-w-3xl gap-4">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">
            One city. Too many disconnected systems.
          </h2>
          <p className="max-w-[60ch] text-lg leading-relaxed text-fg-muted">
            City services exist. A connected citizen experience is missing. Every task below means another website, another login and
            another way to follow up.
          </p>
        </Reveal>

        <div className="grid items-center gap-6 lg:grid-cols-[1.5fr_auto_1fr]">
          <motion.ul
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Separate services residents juggle today"
          >
            {PORTALS.map(({ icon: Icon, label }, i) => (
              <motion.li
                key={label}
                variants={staggerChild}
                className="grid gap-3 rounded-[14px] border border-dashed border-line-strong bg-bg p-4"
                style={{ rotate: `${(i % 3) - 1}deg` }}
              >
                <div className="flex items-center justify-between text-fg-subtle">
                  <Icon size={20} />
                  <LockSimple size={14} aria-label="separate login" />
                </div>
                <p className="text-[13px] font-semibold leading-snug text-fg-muted">{label}</p>
              </motion.li>
            ))}
          </motion.ul>

          <div className="flex justify-center text-fg-subtle" aria-hidden>
            <ArrowRight size={28} className="rotate-90 lg:rotate-0" />
          </div>

          <Reveal delay={0.25} className="panel grid gap-5 p-6">
            <div className="flex items-center gap-3">
              <LogoMark size={36} />
              <div>
                <p className="font-extrabold text-fg">FixMyCity</p>
                <p className="text-[13px] text-fg-subtle">One sign-in for every service</p>
              </div>
            </div>
            <p className="text-[15px] font-semibold leading-snug text-fg">FixMyCity makes the city feel like one service.</p>
            <ul className="grid gap-2.5">
              {UNIFIED.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-fg-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 rounded-[12px] bg-accent-soft px-3 py-2 text-[13px] font-semibold text-accent">
              <Bell size={16} weight="bold" /> Status updates arrive as they happen
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
