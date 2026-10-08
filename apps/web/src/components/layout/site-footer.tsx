import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { href: '/report-issue', label: 'Report an Issue' },
      { href: '/services', label: 'Services' },
      { href: '/city-updates', label: 'City updates' },
      { href: '/help', label: 'Help and contacts' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/register', label: 'Create account' },
      { href: '/forgot-password', label: 'Reset password' },
    ],
  },
  {
    title: 'Project',
    links: [
      { href: '/about', label: 'About FixMyCity' },
      { href: '/#faq', label: 'FAQ' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(3,1fr)] md:gap-8">
        <div className="grid max-w-sm content-start gap-4">
          <Logo />
          <p className="text-[15px] font-medium text-fg">One City. One Platform. Every Service.</p>
          <p className="text-caption leading-relaxed text-fg-subtle">
            A hackathon prototype by team Kalvi Coder: Karmjit, Elango, Prajith and Yashas. Not an official municipal service. Complaints, bills and
            notices shown here are demonstration data.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title} className="grid content-start gap-3">
            <p className="text-sm font-semibold text-fg">{col.title}</p>
            <ul className="grid gap-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-8 items-center rounded-chip text-sm text-fg-muted transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-caption text-fg-subtle">
          <p>Map data from OpenStreetMap contributors.</p>
          <p>Payments in this prototype are simulated. No real money is transferred.</p>
        </div>
      </div>
    </footer>
  );
}
