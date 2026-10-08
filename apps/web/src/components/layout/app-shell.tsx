'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CaretDoubleLeft, List, SignOut, UserCircle, X } from '@phosphor-icons/react';
import { ROLE_LABELS } from '@fixmycity/shared';
import { Logo, LogoMark } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/primitives';
import { useRealtimeStatus } from '@/providers/realtime-provider';
import { useSessionUser, useSignOut } from '@/providers/session-provider';
import { useOnChange, useStoredFlag } from '@/lib/hooks';
import { cn, initials } from '@/lib/utils';
import { isActive, navForRole, type NavGroup, type NavItem } from './nav-config';

const COLLAPSE_KEY = 'fmc.sidebar.collapsed';

/** Picks the most specific nav item for the current path, so only one item is highlighted. */
function useActiveHref(groups: NavGroup[]) {
  const pathname = usePathname();
  return React.useMemo(() => {
    const matches = groups.flatMap((g) => g.items).filter((i) => isActive(pathname, i));
    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  }, [groups, pathname]);
}

function NavLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-semibold transition-colors duration-150',
        active ? 'text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 rounded-[10px] border border-accent-line bg-accent-soft"
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}
      <Icon size={19} weight={active ? 'fill' : 'regular'} className={cn('relative shrink-0', active && 'text-accent')} />
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

function NavGroups({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const activeHref = useActiveHref(groups);
  return (
    <nav aria-label="Workspace" className="grid gap-5">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="grid gap-1">
          {group.label && !collapsed && <p className="px-3 pb-1 text-[11.5px] font-semibold text-fg-subtle">{group.label}</p>}
          {group.label && collapsed && <span className="mx-auto mb-1 h-px w-6 bg-line" aria-hidden />}
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} active={activeHref === item.href} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function LiveIndicator() {
  const status = useRealtimeStatus();
  const label = status === 'live' ? 'Live updates on' : status === 'connecting' ? 'Connecting' : 'Offline, refreshing periodically';
  return (
    <Tooltip content={label}>
      <span className="hidden items-center gap-2 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-fg-muted sm:inline-flex" role="status" aria-live="polite">
        <span className="relative flex h-2 w-2" aria-hidden>
          {status === 'live' && <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-50" />}
          <span className={cn('relative h-2 w-2 rounded-full', status === 'live' ? 'bg-success' : status === 'connecting' ? 'bg-warning' : 'bg-fg-subtle')} />
        </span>
        {status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
      </span>
    </Tooltip>
  );
}

function UserMenu() {
  const user = useSessionUser();
  const signOut = useSignOut();
  const profileHref = user.role === 'CITIZEN' ? '/dashboard/profile' : user.role === 'DEPARTMENT_OFFICER' ? '/department/settings' : '/admin/settings';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-[12px] py-1 pl-1 pr-2 text-left transition-colors hover:bg-surface-2"
          aria-label="Account menu"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{initials(user.name)}</span>
          <span className="hidden min-w-0 md:block">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold text-fg">{user.name}</span>
            <span className="block text-[11.5px] text-fg-subtle">{ROLE_LABELS[user.role]}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block text-[13px] font-semibold text-fg">{user.name}</span>
          <span className="block truncate">{user.email}</span>
          {user.departments.length > 0 && <span className="mt-1 block text-fg-muted">{user.departments.map((d) => d.name).join(', ')}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <UserCircle size={17} /> Account settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()} className="text-danger data-[highlighted]:text-danger">
          <SignOut size={17} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useSessionUser();
  const groups = navForRole(user.role);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSE_KEY);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Close the mobile drawer whenever the route changes.
  useOnChange(pathname, () => setMobileOpen(false));

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const home = groups[0]?.items[0]?.href ?? '/';
  const workspaceLabel = user.role === 'CITIZEN' ? 'Citizen portal' : user.role === 'DEPARTMENT_OFFICER' ? 'Department workspace' : 'Municipal admin';

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-bg lg:flex"
      >
        <div className={cn('flex h-16 items-center border-b border-line px-4', collapsed ? 'justify-center' : 'justify-between')}>
          {collapsed ? (
            <Link href={home} aria-label="FixMyCity home">
              <LogoMark />
            </Link>
          ) : (
            <Logo href={home} />
          )}
        </div>
        {!collapsed && <p className="px-7 pt-5 text-[11.5px] font-semibold text-fg-subtle">{workspaceLabel}</p>}
        <div className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-3' : 'px-4')}>
          <NavGroups groups={groups} collapsed={collapsed} />
        </div>
        <div className={cn('border-t border-line p-3', collapsed && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(!collapsed && 'w-full justify-start')}
          >
            <CaretDoubleLeft size={16} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </motion.aside>

      {/* Mobile drawer */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <AnimatePresence>
          {mobileOpen && (
            <DialogPrimitive.Portal forceMount>
              <DialogPrimitive.Overlay asChild forceMount>
                <motion.div className="fixed inset-0 z-50 bg-[#050817]/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
              </DialogPrimitive.Overlay>
              <DialogPrimitive.Content asChild forceMount>
                <motion.div
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col border-r border-line bg-bg lg:hidden"
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                >
                  <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">Workspace navigation menu</DialogPrimitive.Description>
                  <div className="flex h-16 items-center justify-between border-b border-line px-4">
                    <Logo href={home} />
                    <DialogPrimitive.Close asChild>
                      <Button variant="ghost" size="icon" aria-label="Close menu">
                        <X size={20} />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>
                  <p className="px-7 pt-5 text-[11.5px] font-semibold text-fg-subtle">{workspaceLabel}</p>
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    <NavGroups groups={groups} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                  </div>
                </motion.div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          )}
        </AnimatePresence>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg-elevated px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <List size={20} />
            </Button>
            <span className="lg:hidden">
              <LogoMark />
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LiveIndicator />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
