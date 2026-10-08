'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { homePathForRole, loginSchema, ROLE_LABELS, type LoginInput, type Role, type SessionUser } from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/primitives';
import { GoogleAuthButton } from '@/components/auth/google-button';
import { api } from '@/lib/api';

import { applyServerErrors, destinationFor, safeNext } from '@/lib/forms';

/** Development / demo-mode helper. Never enabled in a production build unless explicitly opted in. */
const SHOW_DEMO = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_ACCOUNTS: { role: Role; email: string; password: string; note?: string }[] = [
  { role: 'CITIZEN', email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  { role: 'ADMIN', email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  { role: 'DEPARTMENT_OFFICER', email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026', note: 'Road Maintenance' },
  { role: 'DEPARTMENT_OFFICER', email: 'water.officer@demo.fixmycity.local', password: 'Officer@2026', note: 'Water Supply' },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { register, handleSubmit, setValue, formState } = form;

  const oauthError = params.get('error');
  const notice = params.get('expired')
    ? 'Your session has ended. Please sign in again.'
    : params.get('signedOut')
      ? 'You have been signed out.'
      : params.get('reset')
        ? 'Password updated. Sign in with your new password.'
        : oauthError
          ? oauthError === 'oauth_failed'
            ? 'Google sign-in could not be completed. Please try again or sign in with your password.'
            : decodeURIComponent(oauthError)
          : null;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await api.post<SessionUser>('/api/auth/login', values);
      qc.clear();
      router.replace(destinationFor(user.role, params.get('next')));
      router.refresh();
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['email', 'password']));
    }
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid gap-7">
      <div className="grid gap-2">
        <h1 className="type-page text-fg">Sign in to FixMyCity</h1>
        <p className="text-[15px] text-fg-muted">Citizens, administrators and department officers all sign in here.</p>
      </div>

      {notice && <Notice title={notice} />}

      <div className="grid gap-4">
        <GoogleAuthButton mode="signin" next={params.get('next')} onError={setFormError} />
        <div className="relative flex items-center justify-center my-1">
          <div className="w-full border-t border-line"></div>
          <span className="bg-bg px-3 text-xs uppercase tracking-wider text-fg-subtle">or continue with email</span>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-5">

        <FormError message={formError} />
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field
          id="password"
          label="Password"
          error={formState.errors.password?.message}
          action={
            <Link href="/forgot-password" className="link text-[13px]">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting} loadingText="Signing in">
          Sign in
        </Button>
      </form>

      <p className="text-sm text-fg-muted">
        New to FixMyCity?{' '}
        <Link href="/register" className="link">
          Create a citizen account
        </Link>
      </p>

      {SHOW_DEMO && (
        <section aria-labelledby="demo-accounts" className="grid gap-3 rounded-panel border border-dashed border-line-strong p-4">
          <div className="grid gap-0.5">
            <h2 id="demo-accounts" className="text-[13px] font-semibold text-fg">
              Demo accounts
            </h2>
            <p className="text-xs text-fg-subtle">Development data only. Select one to fill the form, then sign in.</p>
          </div>
          <ul className="grid gap-0.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="min-w-0">
                <button
                  type="button"
                  className="grid w-full min-w-0 gap-0.5 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-3"
                  onClick={() => {
                    setValue('email', a.email, { shouldValidate: false });
                    setValue('password', a.password, { shouldValidate: false });
                  }}
                >
                  <span className="text-[13px] font-semibold text-fg">
                    {ROLE_LABELS[a.role]}
                    {a.note && <span className="font-normal text-fg-subtle"> ({a.note})</span>}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[11.5px] text-fg-subtle sm:text-right">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
}
