'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { ArrowRight, Bell, ClipboardText, Desktop, GearSix, Monitor, Moon, SignOut, Sun, type Icon } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  changePasswordSchema,
  ROLE_LABELS,
  updateProfileSchema,
  type ChangePasswordInput,
  type SessionInfo,
  type SessionUser,
  type UpdateProfileInput,
} from '@fixmycity/shared';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/dialog';
import { Field, FormError, Input } from '@/components/ui/field';
import { Badge, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { useSessionUser, useSignOut } from '@/providers/session-provider';
import { ApiError, api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { qk } from '@/lib/query-keys';
import { useIsClient } from '@/lib/hooks';
import { cn, formatDate, initials, timeAgo } from '@/lib/utils';

export function ProfileForm() {
  const user = useSessionUser();
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? '', ward: user.ward ?? '' },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await api.patch<SessionUser>('/api/users/me', values);
      qc.setQueryData(qk.me, updated);
      form.reset({ name: updated.name, phone: updated.phone ?? '', ward: updated.ward ?? '' });
      toast.success('Profile updated');
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['name', 'phone', 'ward']));
    }
  });
  return (
    <Panel>
      <PanelHeader title="Profile" description="Your name and phone are visible to staff working on your complaints." />
      <form onSubmit={onSubmit} noValidate className="grid gap-5 p-5 sm:p-6">
        <FormError message={formError} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Full name" error={form.formState.errors.name?.message}>
            <Input autoComplete="name" {...form.register('name')} />
          </Field>
          <Field id="email" label="Email" hint="Contact an administrator to change your email.">
            <Input value={user.email} disabled readOnly />
          </Field>
          <Field id="phone" label="Phone" optional error={form.formState.errors.phone?.message}>
            <Input type="tel" autoComplete="tel" {...form.register('phone')} />
          </Field>
          <Field id="ward" label="Locality or ward" optional error={form.formState.errors.ward?.message}>
            <Input {...form.register('ward')} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12.5px] text-fg-subtle">
            {ROLE_LABELS[user.role]} account since {formatDate(user.createdAt)}
            {user.departments.length ? `. ${user.departments.map((d) => d.name).join(', ')}` : ''}
          </p>
          <Button type="submit" loading={form.formState.isSubmitting} disabled={!form.formState.isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ThemePanel() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();
  const options = [
    { value: 'system', label: 'Match device', icon: Desktop },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];
  return (
    <Panel>
      <PanelHeader title="Appearance" description="Saved on this device." />
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 p-5 sm:p-6">
        {options.map(({ value, label, icon: Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                'grid min-h-20 content-center justify-items-center gap-2 rounded-control border px-3 py-4 text-sm font-semibold transition-colors',
                active ? 'border-accent bg-accent-soft text-fg ring-1 ring-accent' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} />
              {label}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function PasswordPanel() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '' } });
  const qc = useQueryClient();
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/api/users/me/password', values);
      form.reset();
      qc.invalidateQueries({ queryKey: qk.sessions });
      toast.success('Password updated', { description: 'Other devices have been signed out.' });
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['currentPassword', 'newPassword']));
    }
  });
  return (
    <Panel>
      <PanelHeader title="Password" description="Changing it signs out your other devices." />
      <form onSubmit={onSubmit} noValidate className="grid gap-5 p-5 sm:p-6">
        <FormError message={formError} />
        <Field id="currentPassword" label="Current password" error={form.formState.errors.currentPassword?.message}>
          <PasswordInput autoComplete="current-password" {...form.register('currentPassword')} />
        </Field>
        <Field id="newPassword" label="New password" error={form.formState.errors.newPassword?.message} hint="At least 8 characters with a letter and a number.">
          <PasswordInput autoComplete="new-password" {...form.register('newPassword')} />
        </Field>
        <Button type="submit" variant="secondary" loading={form.formState.isSubmitting} className="w-fit">
          Update password
        </Button>
      </form>
    </Panel>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /curl|node|undici/i.test(ua) ? 'Script or API client' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

function SessionsPanel() {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [confirm, setConfirm] = React.useState(false);
  const sessions = useQuery({ queryKey: qk.sessions, queryFn: () => api.get<SessionInfo[]>('/api/users/me/sessions') });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/me/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.sessions });
      toast.success('Session signed out');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not sign out that session'),
  });
  return (
    <Panel>
      <PanelHeader title="Signed-in devices" description="Sessions expire automatically after a week of inactivity." />
      <div className="grid gap-3 p-5 sm:p-6">
        {sessions.isLoading ? (
          <Skeleton className="h-20" />
        ) : sessions.isError ? (
          <p className="text-sm text-fg-subtle">Signed-in devices could not be loaded. Reload the page to try again.</p>
        ) : (
          <ul className="grid gap-2">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3">
                <span className="flex items-center gap-3">
                  <Monitor size={20} className="shrink-0 text-fg-subtle" aria-hidden />
                  <span className="grid">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                      {describeAgent(s.userAgent)} {s.current && <Badge tone="accent">This device</Badge>}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      Active {timeAgo(s.lastSeenAt)}, signed in {formatDate(s.createdAt)}
                    </span>
                  </span>
                </span>
                {!s.current && (
                  <Button variant="ghost" size="sm" loading={revoke.isPending && revoke.variables === s.id} onClick={() => revoke.mutate(s.id)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <Button variant="danger-quiet" className="w-fit" onClick={() => setConfirm(true)}>
          <SignOut size={16} /> Sign out of this device
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Sign out?"
        description="You will need to sign in again to use FixMyCity on this device."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={() => void signOut()}
      />
    </Panel>
  );
}

export function SettingsPanels({ includeProfile = false }: { includeProfile?: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {includeProfile && (
        <div className="xl:col-span-2">
          <ProfileForm />
        </div>
      )}
      <div className="grid content-start gap-6">
        <ThemePanel />
        <PasswordPanel />
      </div>
      <SessionsPanel />
    </div>
  );
}

const PROFILE_LINKS: { href: string; label: string; detail: string; icon: Icon }[] = [
  { href: '/dashboard/complaints', label: 'My complaints', detail: 'Everything you have reported', icon: ClipboardText },
  { href: '/dashboard/notifications', label: 'Notifications', detail: 'Status changes and notices', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings and security', detail: 'Theme, password and devices', icon: GearSix },
];

/** Identity summary and the places a citizen manages their account from. */
export function ProfileOverview() {
  const user = useSessionUser();
  const signOut = useSignOut();
  return (
    <Panel className="overflow-hidden">
      <div className="grid justify-items-start gap-4 p-5 sm:p-6">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#13234a] text-xl font-bold text-[#e9eef7]" aria-hidden>
          {initials(user.name)}
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate text-lg font-semibold tracking-[-0.015em] text-fg">{user.name}</p>
          <p className="truncate text-sm text-fg-muted">{user.email}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {ROLE_LABELS[user.role]} account since {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {PROFILE_LINKS.map(({ href, label, detail, icon: LinkIcon }) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2 sm:px-6">
              <LinkIcon size={19} className="shrink-0 text-fg-subtle" aria-hidden />
              <span className="grid min-w-0 flex-1">
                <span className="text-sm font-semibold text-fg">{label}</span>
                <span className="text-xs text-fg-subtle">{detail}</span>
              </span>
              <ArrowRight size={14} weight="bold" className="text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-line p-4 sm:px-6">
        <Button variant="danger-quiet" size="sm" onClick={() => void signOut()}>
          <SignOut size={16} aria-hidden /> Sign out
        </Button>
      </div>
    </Panel>
  );
}
