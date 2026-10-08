'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { registerSchema } from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';

const formSchema = registerSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirm your password.') })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
type FormValues = z.input<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', confirmPassword: '' },
  });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...values }) => {
    setFormError(null);
    try {
      await api.post('/api/auth/register', values);
      qc.clear();
      router.replace('/dashboard?welcome=1');
      router.refresh();
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['name', 'email', 'phone', 'password']));
    }
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid gap-7">
      <div className="grid gap-2">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.025em] text-fg">Create your citizen account</h1>
        <p className="text-[15px] text-fg-muted">Report issues, track their progress and see your demo utility bills.</p>
      </div>
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormError message={formError} />
        <Field id="name" label="Full name" error={formState.errors.name?.message}>
          <Input autoComplete="name" {...register('name')} />
        </Field>
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" {...register('email')} />
        </Field>
        <Field id="phone" label="Phone" optional error={formState.errors.phone?.message} hint="Used only by municipal staff working on your complaints.">
          <Input type="tel" autoComplete="tel" inputMode="tel" {...register('phone')} />
        </Field>
        <Field id="password" label="Password" error={formState.errors.password?.message} hint="At least 8 characters with a letter and a number.">
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>
        <Field id="confirmPassword" label="Confirm password" error={formState.errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </Field>
        <Button type="submit" size="lg" loading={formState.isSubmitting} loadingText="Creating account">
          Create account
        </Button>
        <p className="text-[12.5px] leading-relaxed text-fg-subtle">
          Accounts created here are citizen accounts. Staff accounts are issued by municipal administrators.
        </p>
      </form>
      <p className="text-sm text-fg-muted">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
