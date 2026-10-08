'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { MotionConfig } from 'motion/react';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';
import { TooltipProvider } from '@/components/ui/primitives';

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      position="bottom-right"
      closeButton
      gap={10}
      toastOptions={{
        classNames: {
          toast: '!rounded-panel !border !border-line !bg-surface-elevated !text-fg !shadow-[var(--shadow-pop)] !font-sans !gap-3 !px-4 !py-3.5',
          title: '!text-sm !font-semibold',
          description: '!text-caption !text-fg-muted',
          actionButton: '!rounded-control !bg-accent !text-accent-fg !font-semibold',
          closeButton: '!border-line !bg-surface-elevated !text-fg-muted',
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-danger',
          info: '[&_[data-icon]]:!text-accent-text',
        },
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            refetchOnWindowFocus: true,
            retry: (count, err) => !(err instanceof ApiError && err.status > 0 && err.status < 500) && count < 2,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            {children}
            <ThemedToaster />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
