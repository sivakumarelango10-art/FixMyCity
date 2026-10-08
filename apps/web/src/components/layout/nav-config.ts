import {
  Bell,
  Buildings,
  ChartLineUp,
  ClipboardText,
  ClockCounterClockwise,
  CreditCard,
  GearSix,
  House,
  Lifebuoy,
  ListChecks,
  MapTrifold,
  Megaphone,
  PlusCircle,
  Receipt,
  Scroll,
  SquaresFour,
  UserCircle,
  Users,
  type Icon,
} from '@phosphor-icons/react';
import type { Role } from '@fixmycity/shared';

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Match only the exact path (for section roots). */
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const CITIZEN_NAV: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: House, exact: true },
      { href: '/dashboard/complaints/new', label: 'Report an Issue', icon: PlusCircle, exact: true },
      { href: '/dashboard/complaints', label: 'My Complaints', icon: ClipboardText },
      { href: '/dashboard/utilities', label: 'Utilities', icon: CreditCard },
      { href: '/dashboard/city-map', label: 'City Map', icon: MapTrifold },
    ],
  },
  {
    label: 'Stay informed',
    items: [
      { href: '/dashboard/announcements', label: 'City Updates', icon: Megaphone },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { href: '/dashboard/help', label: 'Services & Help', icon: Lifebuoy },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
      { href: '/dashboard/settings', label: 'Settings', icon: GearSix },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { href: '/admin', label: 'Overview', icon: SquaresFour, exact: true },
      { href: '/admin/complaints', label: 'Complaints', icon: ListChecks },
      { href: '/admin/analytics', label: 'Analytics', icon: ChartLineUp },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/admin/departments', label: 'Departments', icon: Buildings },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/admin/utilities', label: 'Utilities', icon: Receipt },
    ],
  },
  {
    label: 'Oversight',
    items: [
      { href: '/admin/audit-logs', label: 'Audit log', icon: Scroll },
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/settings', label: 'Settings', icon: GearSix },
    ],
  },
];

export const DEPARTMENT_NAV: NavGroup[] = [
  {
    items: [
      { href: '/department', label: 'Overview', icon: SquaresFour, exact: true },
      { href: '/department/assigned', label: 'Assigned work', icon: ClipboardText },
      { href: '/department/history', label: 'Work history', icon: ClockCounterClockwise },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/department/notifications', label: 'Notifications', icon: Bell },
      { href: '/department/settings', label: 'Settings', icon: GearSix },
    ],
  },
];

/** Items shown inline in the citizen top bar on wide screens; the rest live in the menu. */
export const CITIZEN_TOP_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: House, exact: true },
  { href: '/dashboard/complaints', label: 'My Complaints', icon: ClipboardText },
  { href: '/dashboard/city-map', label: 'City Map', icon: MapTrifold },
  { href: '/dashboard/announcements', label: 'City Updates', icon: Megaphone },
  { href: '/dashboard/utilities', label: 'Utilities', icon: CreditCard },
  { href: '/dashboard/help', label: 'Services & Help', icon: Lifebuoy },
];

export function navForRole(role: Role): NavGroup[] {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return ADMIN_NAV;
  if (role === 'DEPARTMENT_OFFICER') return DEPARTMENT_NAV;
  return CITIZEN_NAV;
}

export function notificationsPathForRole(role: Role): string {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return '/admin/notifications';
  if (role === 'DEPARTMENT_OFFICER') return '/department/notifications';
  return '/dashboard/notifications';
}

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
