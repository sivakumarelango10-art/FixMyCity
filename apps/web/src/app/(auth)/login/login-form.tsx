'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Lightning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { loginSchema, ROLE_LABELS, type LoginInput, type Role, type SessionUser } from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { Notice } from '@/components/ui/primitives';
import { GoogleAuthButton } from '@/components/auth/google-button';
import { api } from '@/lib/api';

import { applyServerErrors, destinationFor } from '@/lib/forms';

/** Demo accounts available for instant one-click login */
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
  const [demoLoggingInEmail, setDemoLoggingInEmail] = React.useState<string | null>(null);
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

  const handleOneClickLogin = async (email: string, pass: string, roleLabel?: string) => {
    setFormError(null);
    setDemoLoggingInEmail(email);
    try {
      const user = await api.post<SessionUser>('/api/auth/login', {
        email,
        password: pass,
      });
      qc.clear();
      toast.success(`Signed in as ${roleLabel || ROLE_LABELS[user.role] || 'Demo User'}`);
      const target = destinationFor(user.role, params.get('next'));
      router.replace(target);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed. Please try again.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setDemoLoggingInEmail(null);
    }
  };

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

      <div className="grid gap-3">
        {/* Prominent One-Click Demo Login Button */}
        <Button
          type="button"
          size="lg"
          variant="secondary"
          loading={demoLoggingInEmail === 'citizen@demo.fixmycity.local'}
          loadingText="Signing in as Demo Citizen..."
          onClick={() => handleOneClickLogin('citizen@demo.fixmycity.local', 'Citizen@2026', 'Citizen')}
          className="w-full relative group border-brand-teal/40 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal font-semibold transition-all shadow-sm"
        >
          <Lightning weight="fill" className="h-4 w-4 mr-2 text-brand-teal shrink-0 group-hover:scale-110 transition-transform" />
          <span>⚡ One-Click Demo Login (Citizen)</span>
        </Button>

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

      {/* Demo Accounts Panel with direct 1-Click login buttons */}
      <section aria-labelledby="demo-accounts" className="grid gap-3 rounded-panel border border-dashed border-line-strong p-4 bg-surface-1/40">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 id="demo-accounts" className="text-[13px] font-semibold text-fg flex items-center gap-1.5">
              <Lightning weight="fill" className="h-3.5 w-3.5 text-brand-teal" />
              Demo accounts & quick login
            </h2>
            <p className="text-xs text-fg-subtle">Click &ldquo;1-Click&rdquo; to sign in instantly, or click a row to fill the form.</p>
          </div>
        </div>
        <ul className="grid gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email} className="flex items-center justify-between gap-2 rounded-control p-2 bg-surface hover:bg-surface-2 transition-colors border border-line/60">
              <button
                type="button"
                className="flex-1 text-left min-w-0 group"
                title="Autofill form credentials"
                onClick={() => {
                  setValue('email', a.email, { shouldValidate: false });
                  setValue('password', a.password, { shouldValidate: false });
                }}
              >
                <div className="text-[13px] font-semibold text-fg group-hover:text-brand-teal transition-colors">
                  {ROLE_LABELS[a.role]}
                  {a.note && <span className="font-normal text-fg-subtle"> ({a.note})</span>}
                </div>
                <div className="truncate font-mono text-[11px] text-fg-subtle">{a.email}</div>
              </button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={demoLoggingInEmail === a.email}
                loadingText="Logging in..."
                onClick={() => handleOneClickLogin(a.email, a.password, ROLE_LABELS[a.role])}
                className="shrink-0 h-8 text-xs font-medium px-2.5 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal border border-brand-teal/30"
              >
                <Lightning weight="fill" className="h-3 w-3 mr-1 text-brand-teal" />
                1-Click
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </motion.div>
  );
}
