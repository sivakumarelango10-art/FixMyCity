import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { homePathForRole, type Role } from '@fixmycity/shared';
import { ApiError } from './api';

/**
 * Copies field-level validation messages from an API error onto the form.
 * Returns the message to show at form level (or null when fields covered it).
 */
export function applyServerErrors<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>, known: readonly string[]): string | null {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  let mapped = false;
  for (const [field, message] of Object.entries(err.fields ?? {})) {
    if (known.includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
      mapped = true;
    }
  }
  return mapped ? null : err.message;
}

/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

/** Keeps users inside the workspace their role is allowed to open. */
export function destinationFor(role: Role, next: string | null | undefined): string {
  const home = homePathForRole(role);
  const target = safeNext(next, home);
  const area = target.split('/')[1] ?? '';
  const allowed = role === 'CITIZEN' ? ['dashboard'] : role === 'DEPARTMENT_OFFICER' ? ['department'] : ['admin'];
  return allowed.includes(area) ? target : home;
}

