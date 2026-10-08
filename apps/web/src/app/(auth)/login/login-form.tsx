'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Info } from '@phosphor-icons/react';
import { homePathForRole, loginSchema, ROLE_LABELS, type LoginInput, type Role, type SessionUser } from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { api } from '@/lib/api';
import { applyServerErrors, safeNext } from '@/lib/forms';

/** Development / demo-mode helper. Never enabled in a production build unless explicitly opted in. */
const SHOW_DEMO = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_ACCOUNTS: { role: Role; email: string; password: string; note?: string }[] = [
  { role: 'CITIZEN', email: 'citizen@demo.fixmycity.local', password: 'Citizen@2026' },
  { role: 'ADMIN', email: 'admin@demo.fixmycity.local', password: 'Admin@2026' },
  { role: 'DEPARTMENT_OFFICER', email: 'roads.officer@demo.fixmycity.local', password: 'Officer@2026', note: 'Road Maintenance' },
  { role: 'DEPARTMENT_OFFICER', email: 'water.officer@demo.fixmycity.local', password: 'Officer@2026', note: 'Water Supply' },
];

/** Keeps users inside the workspace their role is allowed to open. */
function destinationFor(role: Role, next: string | null) {
  const home = homePathForRole(role);
  const target = safeNext(next, home);
  const area = target.split('/')[1] ?? '';
  const allowed = role === 'CITIZEN' ? ['dashboard'] : role === 'DEPARTMENT_OFFICER' ? ['department'] : ['admin'];
  return allowed.includes(area) ? target : home;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const { register, handleSubmit, setValue, formState } = form;

  const notice = params.get('expired') ? 'Your session has ended. Please sign in again.' : params.get('signedOut') ? 'You have been signed out.' : params.get('reset') ? 'Password updated. Sign in with your new password.' : null;

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
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.025em] text-fg">Sign in to FixMyCity</h1>
        <p className="text-[15px] text-fg-muted">Citizens, administrators and department officers all sign in here.</p>
      </div>

      {notice && (
        <div role="status" className="flex items-start gap-2.5 rounded-[var(--radius-control)] border border-accent-line bg-accent-soft px-4 py-3 text-sm font-medium text-fg">
          <Info size={18} className="mt-0.5 shrink-0 text-accent" /> {notice}
        </div>
      )}

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
            <Link href="/forgot-password" className="text-[13px] font-semibold text-accent hover:underline">
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
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Create a citizen account
        </Link>
      </p>

      {SHOW_DEMO && (
        <div className="grid gap-3 rounded-[var(--radius-panel)] border border-dashed border-line-strong p-4">
          <p className="text-[13px] font-bold text-fg">Demo accounts (development data only)</p>
          <ul className="grid gap-1.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-surface-2"
                  onClick={() => {
                    setValue('email', a.email, { shouldValidate: false });
                    setValue('password', a.password, { shouldValidate: false });
                  }}
                >
                  <span className="font-semibold text-fg">
                    {ROLE_LABELS[a.role]}
                    {a.note && <span className="font-normal text-fg-subtle"> ({a.note})</span>}
                  </span>
                  <span className="truncate font-mono text-[11.5px] text-fg-subtle">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-subtle">Select an account to fill the form, then sign in.</p>
        </div>
      )}
    </motion.div>
  );
}
