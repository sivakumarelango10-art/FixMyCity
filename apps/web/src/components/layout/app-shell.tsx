'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CaretDoubleLeft, Desktop, List, Moon, Plus, SignOut, Sun, UserCircle, X } from '@phosphor-icons/react';
import { ROLE_LABELS } from '@fixmycity/shared';
import { Logo, LogoMark, Wordmark } from '@/components/brand/logo';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/primitives';
import { useRealtimeStatus } from '@/providers/realtime-provider';
import { useSessionUser, useSignOut } from '@/providers/session-provider';
import { useIsClient, useOnChange, useStoredFlag } from '@/lib/hooks';
import { cn, initials } from '@/lib/utils';
import { CITIZEN_TOP_NAV, isActive, navForRole, type NavGroup, type NavItem } from './nav-config';

const COLLAPSE_KEY = 'fmc.sidebar.collapsed';

/** Picks the most specific nav item for the current path, so only one item is highlighted. */
function useActiveHref(groups: NavGroup[]) {
  const pathname = usePathname();
  return React.useMemo(() => {
    const matches = groups.flatMap((g) => g.items).filter((i) => isActive(pathname, i));
    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  }, [groups, pathname]);
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function LiveIndicator({ tone = 'default' }: { tone?: 'default' | 'console' }) {
  const status = useRealtimeStatus();
  const label = status === 'live' ? 'Live updates on' : status === 'connecting' ? 'Connecting to live updates' : 'Offline, refreshing periodically';
  return (
    <Tooltip content={label}>
      <span
        className={cn(
          'hidden h-8 items-center gap-2 rounded-chip border px-2.5 text-xs font-semibold sm:inline-flex',
          tone === 'console' ? 'border-line text-fg-muted' : 'border-line text-fg-muted',
        )}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          {status === 'live' && <span className="absolute inset-0 rounded-full bg-success opacity-60 motion-safe:animate-ping" />}
          <span className={cn('relative h-2 w-2 rounded-full', status === 'live' ? 'bg-success' : status === 'connecting' ? 'bg-warning' : 'bg-fg-subtle')} />
        </span>
        {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
      </span>
    </Tooltip>
  );
}

function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();
  return (
    <DropdownMenuRadioGroup value={mounted ? (theme ?? 'system') : 'system'} onValueChange={setTheme} aria-label="Theme">
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioItem value="system">
        <Desktop size={17} /> Match device
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="light">
        <Sun size={17} /> Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon size={17} /> Dark
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  );
}

function UserMenu() {
  const user = useSessionUser();
  const signOut = useSignOut();
  const profileHref = user.role === 'CITIZEN' ? '/dashboard/profile' : user.role === 'DEPARTMENT_OFFICER' ? '/department/settings' : '/admin/settings';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-11 items-center gap-2.5 rounded-control pl-1 pr-1.5 text-left transition-colors hover:bg-surface-2 md:pr-2.5" aria-label="Account menu">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#13234a] text-xs font-bold text-[#e9eef7]">{initials(user.name)}</span>
          <span className="hidden min-w-0 md:block">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-fg">{user.name}</span>
            <span className="block text-xs leading-tight text-fg-subtle">{ROLE_LABELS[user.role]}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold text-fg">{user.name}</span>
          <span className="block truncate">{user.email}</span>
          {user.departments.length > 0 && <span className="mt-1 block text-fg-muted">{user.departments.map((d) => d.name).join(', ')}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <UserCircle size={17} /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <ThemeChoice />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="text-danger data-[highlighted]:text-danger [&_svg]:text-danger">
          <SignOut size={17} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DrawerLink({ item, active, onNavigate, console: inConsole }: { item: NavItem; active: boolean; onNavigate?: () => void; console?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-semibold transition-colors',
        inConsole
          ? active
            ? 'bg-console-active text-console-fg'
            : 'text-console-muted hover:bg-console-hover hover:text-console-fg'
          : active
            ? 'bg-accent-soft text-accent-text'
            : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" />
      {item.label}
    </Link>
  );
}

/** Slide-in navigation for small screens (Radix dialog: focus trap, Escape, scroll lock). */
function MobileDrawer({ open, onOpenChange, groups, home, label, console: inConsole }: { open: boolean; onOpenChange: (o: boolean) => void; groups: NavGroup[]; home: string; label: string; console?: boolean }) {
  const activeHref = useActiveHref(groups);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-[#060b17]/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn('fixed inset-y-0 left-0 z-50 flex w-[min(320px,88vw)] flex-col border-r shadow-[var(--shadow-pop)]', inConsole ? 'border-console-line bg-console' : 'border-line bg-bg')}
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              >
                <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                <DialogPrimitive.Description className="sr-only">{label} navigation menu</DialogPrimitive.Description>
                <div className={cn('flex h-16 items-center justify-between border-b px-4', inConsole ? 'border-console-line' : 'border-line')}>
                  <Link href={home} className="inline-flex items-center gap-2.5 rounded-control" aria-label="FixMyCity home">
                    <LogoMark />
                    <Wordmark className={inConsole ? 'text-console-fg [&>span]:text-console-accent' : undefined} />
                  </Link>
                  <DialogPrimitive.Close asChild>
                    <Button variant="ghost" size="icon" aria-label="Close menu" className={inConsole ? 'text-console-muted hover:bg-console-hover hover:text-console-fg' : undefined}>
                      <X size={20} />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
                <nav aria-label={label} className="flex-1 overflow-y-auto px-3 py-4">
                  <div className="grid gap-5">
                    {groups.map((group, i) => (
                      <div key={group.label ?? i} className="grid gap-0.5">
                        {group.label && <p className={cn('type-overline px-3 pb-1.5 text-[11px]', inConsole ? 'text-console-muted' : 'text-fg-subtle')}>{group.label}</p>}
                        {group.items.map((item) => (
                          <DrawerLink key={item.href} item={item} active={activeHref === item.href} onNavigate={() => onOpenChange(false)} console={inConsole} />
                        ))}
                      </div>
                    ))}
                  </div>
                </nav>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ */
/* Citizen portal: top navigation, generous reading width               */
/* ------------------------------------------------------------------ */

function CitizenShell({ children }: { children: React.ReactNode }) {
  const groups = navForRole('CITIZEN');
  const pathname = usePathname();
  const activeHref = useActiveHref(groups);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  useOnChange(pathname, () => setMobileOpen(false));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg-elevated backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="-ml-2 xl:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <List size={22} />
            </Button>
            <Logo href="/dashboard" className="[&>span]:hidden sm:[&>span]:inline" />
          </div>
          <nav aria-label="Citizen portal" className="hidden h-full items-stretch xl:flex">
            {CITIZEN_TOP_NAV.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('relative flex items-center px-2.5 text-sm font-medium transition-colors', active ? 'text-fg' : 'text-fg-muted hover:text-fg')}
                >
                  {item.label}
                  {active && <motion.span layoutId="citizen-nav" className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 480, damping: 40 }} />}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <LiveIndicator />
            <Button asChild size="sm" className="h-10 px-3 sm:px-3.5">
              <Link href="/dashboard/complaints/new">
                <Plus size={16} weight="bold" />
                <span className="sr-only sm:not-sr-only">Report an Issue</span>
              </Link>
            </Button>
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>
      <MobileDrawer open={mobileOpen} onOpenChange={setMobileOpen} groups={groups} home="/dashboard" label="Citizen portal" />
      <main id="main" className="flex-1">
        <div className="container-page py-8 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Operations console: navy rail, dense content                         */
/* ------------------------------------------------------------------ */

function ConsoleLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-control px-2.5 text-[13.5px] font-medium transition-colors duration-150',
        active ? 'text-console-fg' : 'text-console-muted hover:bg-console-hover hover:text-console-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && (
        <motion.span layoutId="console-nav" className="absolute inset-0 rounded-control bg-console-active" transition={{ type: 'spring', stiffness: 460, damping: 40 }}>
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-console-accent" />
        </motion.span>
      )}
      <Icon size={18} weight={active ? 'fill' : 'regular'} className={cn('relative shrink-0', active && 'text-console-accent')} />
      {!collapsed && <span className="relative truncate">{item.label}</span>}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function ConsoleShell({ children }: { children: React.ReactNode }) {
  const user = useSessionUser();
  const groups = navForRole(user.role);
  const pathname = usePathname();
  const activeHref = useActiveHref(groups);
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  useOnChange(pathname, () => setMobileOpen(false));

  const home = groups[0]?.items[0]?.href ?? '/';
  const workspace = user.role === 'DEPARTMENT_OFFICER' ? 'Department workspace' : 'Municipal operations';
  const context = user.role === 'DEPARTMENT_OFFICER' ? user.departments.map((d) => d.name).join(', ') || 'No department' : ROLE_LABELS[user.role];

  return (
    <div className="flex min-h-dvh">
      <motion.aside
        animate={{ width: collapsed ? 68 : 248 }}
        transition={{ type: 'spring', stiffness: 380, damping: 40 }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-console-line bg-console lg:flex"
        aria-label="Workspace navigation"
      >
        <div className={cn('flex h-14 items-center border-b border-console-line', collapsed ? 'justify-center px-2' : 'px-4')}>
          <Link href={home} className="inline-flex items-center gap-2.5 rounded-control" aria-label="FixMyCity home">
            <LogoMark />
            {!collapsed && <Wordmark className="text-[16px] text-console-fg [&>span]:text-console-accent" />}
          </Link>
        </div>
        {!collapsed && (
          <div className="border-b border-console-line px-4 py-3">
            <p className="type-overline text-[10.5px] text-console-muted">{workspace}</p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-console-fg">{context}</p>
          </div>
        )}
        <nav aria-label={workspace} className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2.5' : 'px-3')}>
          <div className="grid gap-5">
            {groups.map((group, i) => (
              <div key={group.label ?? i} className="grid gap-0.5">
                {group.label && !collapsed && <p className="type-overline px-2.5 pb-1.5 text-[10.5px] text-console-muted">{group.label}</p>}
                {group.label && collapsed && <span className="mx-auto mb-1.5 h-px w-6 bg-console-line" aria-hidden />}
                {group.items.map((item) => (
                  <ConsoleLink key={item.href} item={item} active={activeHref === item.href} collapsed={collapsed} />
                ))}
              </div>
            ))}
          </div>
        </nav>
        <div className={cn('border-t border-console-line p-2.5', collapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-9 items-center gap-2.5 rounded-control px-2.5 text-[13px] font-medium text-console-muted transition-colors hover:bg-console-hover hover:text-console-fg',
              collapsed ? 'w-9 justify-center px-0' : 'w-full',
            )}
          >
            <CaretDoubleLeft size={16} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </motion.aside>

      <MobileDrawer open={mobileOpen} onOpenChange={setMobileOpen} groups={groups} home={home} label={workspace} console />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-bg-elevated px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <List size={22} />
            </Button>
            <span className="lg:hidden">
              <LogoMark />
            </span>
            <p className="hidden truncate text-[13px] font-medium text-fg-subtle sm:block lg:pl-0">
              {workspace}
              <span className="text-fg-muted"> / {context}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <LiveIndicator tone="console" />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 font-narrow sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useSessionUser();
  return user.role === 'CITIZEN' ? <CitizenShell>{children}</CitizenShell> : <ConsoleShell>{children}</ConsoleShell>;
}
