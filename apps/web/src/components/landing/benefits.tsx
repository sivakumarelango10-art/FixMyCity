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
    <Reveal delay={delay} className="grid content-start gap-6">
      <h3 className="text-xl font-extrabold text-fg">{title}</h3>
      <ul className="grid gap-5">
        {items.map(({ icon: Icon, title: t, body }) => (
          <li key={t} className="grid grid-cols-[40px_1fr] gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-surface-2 text-fg-muted">
              <Icon size={20} />
            </span>
            <div>
              <p className="font-bold text-fg">{t}</p>
              <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function Benefits() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-page grid gap-14">
        <Reveal className="grid max-w-2xl gap-4">
          <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-fg md:text-[2.75rem] md:leading-[1.08]">
            Built for residents and the people who serve them.
          </h2>
        </Reveal>
        <div className="grid gap-14 md:grid-cols-2 md:gap-10 lg:gap-20">
          <Column title="For citizens" items={CITIZENS} delay={0} />
          <Column title="For municipal teams" items={ADMINS} delay={0.1} />
        </div>
      </div>
    </section>
  );
}
