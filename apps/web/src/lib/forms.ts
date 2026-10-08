import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
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
