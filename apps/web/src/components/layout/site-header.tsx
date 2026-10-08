'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowRight, List, X } from '@phosphor-icons/react';
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
        <nav aria-label="Main" className="hidden h-full items-stretch lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex items-center px-3 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-1.5 lg:flex">
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="h-10">
              <Link href={homePathForRole(user.role)}>
                Open workspace <ArrowRight size={15} weight="bold" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="h-10">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="h-10">
                <Link href="/report-issue">Report an Issue</Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-expanded={open} aria-label="Open menu" onClick={() => setOpen(true)} className="-mr-2">
            <List size={22} />
          </Button>
        </div>
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div className="fixed inset-0 z-50 bg-[#060b17]/55 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount>
                <motion.div
                  className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,92vw)] flex-col border-l border-line bg-bg shadow-[var(--shadow-pop)] lg:hidden"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 42 }}
                >
                  <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">Site navigation</DialogPrimitive.Description>
                  <div className="flex h-16 items-center justify-between border-b border-line px-4">
                    <Logo />
                    <DialogPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="Close menu" className="-mr-2">
                        <X size={20} />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>
                  <nav aria-label="Mobile" className="grid content-start gap-0.5 overflow-y-auto px-3 py-4">
                    {NAV.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-12 items-center rounded-control px-3 text-base font-semibold transition-colors',
                            active ? 'bg-accent-soft text-accent-text' : 'text-fg hover:bg-surface-2',
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="mt-auto grid gap-2 border-t border-line p-4">
                    {user ? (
                      <Button asChild>
                        <Link href={homePathForRole(user.role)}>Open workspace</Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild>
                          <Link href="/report-issue">Report an Issue</Link>
                        </Button>
                        <Button asChild variant="secondary">
                          <Link href="/login">Sign in</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>
    </header>
  );
}
