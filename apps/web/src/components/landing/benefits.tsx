import { Bell, ChartBar, ClockCounterClockwise, Eye, Path, ShieldCheck, Signpost, UserFocus } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Reveal } from '@/components/motion/reveal';

const CITIZENS: { icon: Icon; title: string; body: string }[] = [
  { icon: Path, title: 'Fewer journeys', body: 'One account for complaints, bills and city notices.' },
  { icon: Eye, title: 'Visible progress', body: 'See who has your complaint and what was done.' },
  { icon: Bell, title: 'Timely alerts', body: 'Get notified when work starts and when it is resolved.' },
  { icon: ShieldCheck, title: 'Private by default', body: 'Your contact details never appear on the public map.' },
];

const ADMINS: { icon: Icon; title: string; body: string }[] = [
  { icon: Signpost, title: 'Structured routing', body: 'Assign to departments with suggestions you can accept or override.' },
  { icon: UserFocus, title: 'Clear accountability', body: 'Every change is attributed to a person and kept in history.' },
  { icon: ClockCounterClockwise, title: 'Complete audit trail', body: 'Sensitive actions are logged for later review.' },
  { icon: ChartBar, title: 'Operational insight', body: 'Workloads, trends and resolution times from live records.' },
];

function Column({ title, items, delay }: { title: string; items: typeof CITIZENS; delay: number }) {
  return (
    <Reveal delay={delay} className="grid content-start gap-6 border-t-2 border-fg pt-6">
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-fg">{title}</h3>
      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {items.map(({ icon: Icon, title: t, body }) => (
          <li key={t} className="grid content-start gap-2">
            <Icon size={22} className="text-accent-text" aria-hidden />
            <p className="font-semibold text-fg">{t}</p>
            <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function Benefits() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-page grid gap-12">
        <Reveal className="grid max-w-2xl gap-4">
          <h2 className="type-section text-fg">Built for residents and the people who serve them.</h2>
        </Reveal>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Column title="For citizens" items={CITIZENS} delay={0} />
          <Column title="For municipal teams" items={ADMINS} delay={0.1} />
        </div>
      </div>
    </section>
  );
}
