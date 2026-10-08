'use client';

import * as React from 'react';
import { useReducedMotion } from 'motion/react';

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. Avoids setState-in-effect "mounted" flags. */
export function useIsClient(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Reduced-motion preference that is false during SSR and hydration.
 * Motion's own hook reads the media query on the first client render, so using
 * it to pick an `initial` state makes server and client HTML disagree for
 * users who prefer reduced motion. MotionConfig (reducedMotion="user") still
 * removes transform animations for them after hydration.
 */
export function useReducedMotionSafe(): boolean {
  const reduce = useReducedMotion();
  const client = useIsClient();
  return client ? !!reduce : false;
}

/**
 * Page state that snaps back to 1 whenever any dependency changes.
 * Uses React's "adjust state while rendering" pattern instead of an effect,
 * so the list never renders once with a stale page.
 */
export function usePageReset(deps: readonly unknown[]): [number, (page: number) => void] {
  const [page, setPage] = React.useState(1);
  const key = JSON.stringify(deps);
  const [prevKey, setPrevKey] = React.useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setPage(1);
  }
  return [page, setPage];
}

/** Runs `onChange` during render when `value` changes (for example: close a drawer on navigation). */
export function useOnChange<T>(value: T, onChange: (next: T, prev: T) => void) {
  const [prev, setPrev] = React.useState(value);
  if (!Object.is(prev, value)) {
    setPrev(value);
    onChange(value, prev);
  }
}

const STORAGE_EVENT = 'fmc-storage';
// Fallback when localStorage is blocked (private mode): the preference lasts for this page session.
const memory = new Map<string, boolean>();

/** A boolean persisted in localStorage, read as an external store (hydration-safe, synced across tabs). */
export function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const subscribe = React.useCallback((notify: () => void) => {
    const onStorage = (e: Event) => {
      if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent<string>).detail === key) notify();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(STORAGE_EVENT, onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(STORAGE_EVENT, onStorage);
    };
  }, [key]);
  const value = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        const stored = window.localStorage.getItem(key);
        return stored === null ? (memory.get(key) ?? false) : stored === '1';
      } catch {
        return memory.get(key) ?? false;
      }
    },
    () => false,
  );
  const set = React.useCallback(
    (next: boolean) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* storage unavailable: preference simply is not remembered */
      }
      window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: key }));
    },
    [key],
  );
  return [value, set];
}
