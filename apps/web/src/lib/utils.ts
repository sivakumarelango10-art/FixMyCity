import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const toDate = (v: string | Date) => (typeof v === 'string' ? parseISO(v) : v);

export function formatDate(value: string | Date | null | undefined, pattern = 'd MMM yyyy') {
  if (!value) return '';
  const d = toDate(value);
  return isValid(d) ? format(d, pattern) : '';
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, 'd MMM yyyy, h:mm a');
}

export function timeAgo(value: string | Date | null | undefined) {
  if (!value) return '';
  const d = toDate(value);
  if (!isValid(d)) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 45_000 && diff > -45_000) return 'just now';
  return `${formatDistanceToNowStrict(d)} ago`;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 });
export function formatMoney(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value;
  return inr.format(Number.isFinite(n) ? n : 0);
}

export function formatHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined) return null;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
