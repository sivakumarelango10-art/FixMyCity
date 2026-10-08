import Link from 'next/link';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';

const POINTS = [
  'Report civic issues with a photo and a map pin',
  'Follow every status change on one timeline',
  'See utility bills and city notices in one place',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,0.9fr)]">
      <div className="flex flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Logo />
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
        <footer className="px-5 pb-6 text-[12.5px] text-fg-subtle sm:px-8">
          Hackathon prototype by team Kalvi Coder. Not an official municipal service.{' '}
          <Link href="/about" className="font-semibold text-fg-muted hover:text-fg">
            About
          </Link>
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="hairline-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="relative grid gap-6">
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-accent">One City. One Platform. Every Service.</p>
          <p className="max-w-md text-3xl font-extrabold leading-tight tracking-[-0.03em] text-fg">
            One account for the services your city already offers.
          </p>
        </div>
        <ul className="relative grid gap-4">
          {POINTS.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] text-fg-muted">
              <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-accent" />
              {p}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
