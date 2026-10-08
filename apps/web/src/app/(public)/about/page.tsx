import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'About' };

const TEAM = ['Karmjit', 'Elango', 'Prajith', 'Yashas'];

const FACTS = [
  { title: 'The problem', body: 'Residents juggle separate portals, logins and offices for bills, complaints and notices, and rarely see what happened to a complaint.' },
  { title: 'The approach', body: 'One platform where every request has an owner, a status and a history that the citizen and the city both see.' },
  { title: 'What is real here', body: 'Accounts, complaints, photos, assignments, status history, notifications and payments are stored in a PostgreSQL database and enforced by the API.' },
  { title: 'What is simulated', body: 'Utility bills and payments are demonstration records. No government system, biller or bank is connected.' },
];

export default function AboutPage() {
  return (
    <div className="container-page grid gap-16 py-14 lg:py-20">
      <header className="grid max-w-3xl gap-4">
        <h1 className="text-4xl font-extrabold tracking-[-0.035em] text-fg md:text-5xl">About FixMyCity</h1>
        <p className="text-lg leading-relaxed text-fg-muted">
          FixMyCity is an intelligent unified platform for urban services, built for a hackathon by team Kalvi Coder. It is a working prototype, not an official
          municipal service.
        </p>
      </header>

      <section className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {FACTS.map((f) => (
          <div key={f.title} className="grid content-start gap-2 border-t border-line pt-5">
            <h2 className="text-lg font-extrabold text-fg">{f.title}</h2>
            <p className="text-[15px] leading-relaxed text-fg-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5">
        <h2 className="text-2xl font-extrabold tracking-tight text-fg">Team Kalvi Coder</h2>
        <ul className="flex flex-wrap gap-3">
          {TEAM.map((name) => (
            <li key={name} className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-fg">
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-7">
        <p className="max-w-3xl text-xl font-bold leading-snug text-fg">
          A smarter city isn&apos;t just a city with more technology. It&apos;s a city where essential services work together for everyone.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/report-issue">Report an Issue</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/services">Explore Services</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
