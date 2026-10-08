'use client';

import * as React from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  mode = 'signin',
  next,
  onError,
}: {
  mode?: 'signin' | 'signup';
  next?: string | null;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const targetNext = next || (mode === 'signup' ? '/dashboard?welcome=1' : '/dashboard');
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetNext)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Could not initiate Google sign in. Please try again.';
      toast.error(msg);
      onError?.(msg);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={loading}
      className="relative flex h-12 w-full items-center justify-center gap-3 rounded-[10px] border border-line bg-surface px-4 text-sm font-semibold text-fg shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 cursor-pointer"
    >
      <GoogleIcon className="shrink-0" />
      <span>{loading ? 'Connecting to Google…' : mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
    </button>
  );
}
