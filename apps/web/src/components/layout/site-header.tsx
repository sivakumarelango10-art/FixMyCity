'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { List, X } from '@phosphor-icons/react';
import { homePathForRole, type SessionUser } from '@fixmycity/shared';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { useOnChange } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/services', label: 'Services' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/city-updates', label: 'City updates' },
  { href: '/help', label: 'Help' },
  { href: '/about', label: 'About' },
];

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  useOnChange(pathname, () => setOpen(false));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-elevated backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-[10px] px-3 py-2 text-sm font-semibold transition-colors',
                  active ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href={homePathForRole(user.role)}>Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/report-issue">Report an Issue</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <List size={20} />}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-line bg-bg lg:hidden"
          >
            <nav aria-label="Mobile" className="container-page grid gap-1 py-4">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-[10px] px-3 py-3 text-[15px] font-semibold text-fg hover:bg-surface-2">
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {user ? (
                  <Button asChild className="col-span-2">
                    <Link href={homePathForRole(user.role)}>Open workspace</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="secondary">
                      <Link href="/login">Sign in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/report-issue">Report an Issue</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
