'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passwordSchema } from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';

const schema = z
  .object({ password: passwordSchema, confirmPassword: z.string().min(1, 'Confirm your password.') })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
type Values = z.infer<typeof schema>;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [formError, setFormError] = React.useState<string | null>(token ? null : 'This reset link is incomplete. Request a new one.');
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      router.replace('/login?reset=1');
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['password']));
    }
  });

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.025em] text-fg">Choose a new password</h1>
        <p className="text-[15px] text-fg-muted">For your security, every other signed-in device will be signed out.</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormError message={formError} />
        <Field id="password" label="New password" error={form.formState.errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <PasswordInput autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field id="confirmPassword" label="Confirm new password" error={form.formState.errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...form.register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" disabled={!token} loading={form.formState.isSubmitting} loadingText="Updating">
          Update password
        </Button>
      </form>
      <Link href="/forgot-password" className="text-sm font-semibold text-accent hover:underline">
        Request a new link
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense>
      <ResetForm />
    </React.Suspense>
  );
}
