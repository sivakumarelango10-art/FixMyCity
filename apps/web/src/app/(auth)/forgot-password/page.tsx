'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { EnvelopeSimple } from '@phosphor-icons/react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input } from '@/components/ui/field';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/api/auth/forgot-password', values);
      setSent(true);
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['email']));
    }
  });

  return (
    <div className="grid gap-7">
      <div className="grid gap-2">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.025em] text-fg">Reset your password</h1>
        <p className="text-[15px] text-fg-muted">Enter your account email and we will send a link that is valid for 30 minutes.</p>
      </div>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5" role="status">
            <EnvelopeSimple size={28} className="text-accent" />
            <p className="font-bold text-fg">Check your inbox</p>
            <p className="text-sm leading-relaxed text-fg-muted">If an account exists for that email, a reset link is on its way.</p>
            <p className="text-[12.5px] leading-relaxed text-fg-subtle">
              Running locally without an email provider? The API prints the reset link in its terminal output instead.
            </p>
          </motion.div>
        ) : (
          <motion.form key="form" exit={{ opacity: 0 }} onSubmit={onSubmit} noValidate className="grid gap-5">
            <FormError message={formError} />
            <Field id="email" label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
            <Button type="submit" size="lg" loading={form.formState.isSubmitting} loadingText="Sending link">
              Send reset link
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
      <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
