'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useIsClient } from '@/lib/hooks';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is unknown on the server; render the dark-mode icon until hydrated.
  const mounted = useIsClient();
  const dark = !mounted || resolvedTheme !== 'light';
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
