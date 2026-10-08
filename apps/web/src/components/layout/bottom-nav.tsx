'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardText, House, Plus, SquaresFour, UserCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface NavTab {
  href: string;
  label: string;
  icon: typeof House;
  badge?: number;
  highlight?: boolean;
}

const CITIZEN_BOTTOM_TABS: NavTab[] = [
  { href: '/dashboard', label: 'Home', icon: House },
  { href: '/dashboard/utilities', label: 'Services', icon: SquaresFour },
  { href: '/dashboard/complaints/new', label: 'Report', icon: Plus, highlight: true },
  { href: '/dashboard/complaints', label: 'Requests', icon: ClipboardText },
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
];

/**
 * Mobile Bottom Navigation (UI.md Section 13 & Section 5).
 * Lightweight, accessible, 44px+ touch targets, active state #176B68, inactive #687674.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-1px_3px_rgba(15,35,32,0.04)] xl:hidden"
    >
      {CITIZEN_BOTTOM_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href);

        if (tab.highlight) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="group -mt-4 flex flex-col items-center justify-center focus:outline-none"
              aria-label="Report an Issue"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-[0_2px_8px_rgba(23,107,104,0.35)] transition-transform duration-150 active:scale-95 group-hover:bg-accent-hover">
                <Plus size={22} weight="bold" />
              </span>
              <span className="mt-1 text-[11px] font-semibold text-accent-text">{tab.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-control px-2 py-1 transition-colors duration-150 active:scale-95',
              isActive ? 'text-accent font-semibold' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
            <span className="text-[11px] leading-none tracking-tight">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
