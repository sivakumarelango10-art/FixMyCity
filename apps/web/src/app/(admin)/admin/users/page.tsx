'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MagnifyingGlass, PencilSimple, UserPlus } from '@phosphor-icons/react';
import { z } from 'zod';
import { createStaffSchema, ROLE_LABELS, type DepartmentSummary, type Role, type UserListItem } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { useDebouncedValue } from '@/components/complaints/complaint-filters';
import { PasswordInput } from '@/components/forms/password-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, FormError, Input } from '@/components/ui/field';
import { Badge, ErrorState, Pagination, Panel, Skeleton, Switch } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { useSessionUser } from '@/providers/session-provider';
import { ApiError, api, toQuery } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { formatDate, initials } from '@/lib/utils';

type StaffValues = z.input<typeof createStaffSchema>;

function useDepartments() {
  return useQuery({ queryKey: qk.departments, queryFn: () => api.get<DepartmentSummary[]>('/api/departments') });
}

function CreateStaffForm({ onDone }: { onDone: () => void }) {
  const me = useSessionUser();
  const qc = useQueryClient();
  const departments = useDepartments();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<StaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { name: '', email: '', password: '', role: 'DEPARTMENT_OFFICER', departmentId: undefined },
  });
  const role = useWatch({ control: form.control, name: 'role' });
  const selectedDepartment = useWatch({ control: form.control, name: 'departmentId' });
  const roleOptions = [
    { value: 'DEPARTMENT_OFFICER', label: 'Department officer' },
    ...(me.role === 'SUPER_ADMIN' ? [{ value: 'ADMIN', label: 'Administrator' }] : []),
  ];
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/api/admin/users', { ...values, departmentId: values.role === 'DEPARTMENT_OFFICER' ? values.departmentId : undefined });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: qk.adminDepartments });
      toast.success('Staff account created', { description: 'Share the temporary password securely and ask them to change it.' });
      onDone();
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['name', 'email', 'password', 'role', 'departmentId']));
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="staff-name" label="Full name" error={form.formState.errors.name?.message}>
        <Input {...form.register('name')} />
      </Field>
      <Field id="staff-email" label="Work email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register('email')} />
      </Field>
      <Field id="staff-password" label="Temporary password" error={form.formState.errors.password?.message} hint="At least 8 characters with a letter and a number.">
        <PasswordInput autoComplete="new-password" {...form.register('password')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="staff-role" label="Role" hint={me.role !== 'SUPER_ADMIN' ? 'Only a super admin can create administrators.' : undefined}>
          <Select value={role} onValueChange={(v) => form.setValue('role', v as StaffValues['role'])} options={roleOptions} />
        </Field>
        {role === 'DEPARTMENT_OFFICER' && (
          <Field id="staff-dept" label="Department" error={form.formState.errors.departmentId?.message}>
            <Select
              value={selectedDepartment ?? ''}
              onValueChange={(v) => form.setValue('departmentId', v || undefined, { shouldValidate: true })}
              placeholder="Choose a department"
              options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Field>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          Create account
        </Button>
      </div>
    </form>
  );
}

function EditUserForm({ user, onDone }: { user: UserListItem; onDone: () => void }) {
  const me = useSessionUser();
  const qc = useQueryClient();
  const departments = useDepartments();
  const [role, setRole] = React.useState<Role>(user.role);
  const [active, setActive] = React.useState(user.isActive);
  const [deptIds, setDeptIds] = React.useState<string[]>(user.departments.map((d) => d.id));
  const [error, setError] = React.useState<string | null>(null);
  const self = me.id === user.id;
  const protectedAccount = (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && me.role !== 'SUPER_ADMIN';

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/users/${user.id}`, {
        ...(role !== user.role ? { role } : {}),
        ...(active !== user.isActive ? { isActive: active } : {}),
        ...(role === 'DEPARTMENT_OFFICER' ? { departmentIds: deptIds } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: qk.adminDepartments });
      toast.success('Account updated');
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update the account.'),
  });

  const roleOptions = [
    { value: 'CITIZEN', label: 'Citizen' },
    { value: 'DEPARTMENT_OFFICER', label: 'Department officer' },
    ...(me.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? [{ value: 'ADMIN', label: 'Administrator' }] : []),
  ];

  if (self || protectedAccount || user.role === 'SUPER_ADMIN') {
    return (
      <p className="text-sm leading-relaxed text-fg-muted">
        {self ? 'You cannot change your own role or deactivate your own account.' : 'Only a super admin can change administrator accounts.'}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <FormError message={error} />
      <Field id="edit-role" label="Role" hint="Changing the role signs the user out everywhere.">
        <Select value={role} onValueChange={(v) => setRole(v as Role)} options={roleOptions} />
      </Field>
      {role === 'DEPARTMENT_OFFICER' && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold text-fg">Departments</legend>
          {(departments.data ?? []).map((d) => (
            <label key={d.id} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-sm text-fg hover:bg-surface-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={deptIds.includes(d.id)}
                onChange={(e) => setDeptIds((ids) => (e.target.checked ? [...ids, d.id] : ids.filter((x) => x !== d.id)))}
              />
              {d.name}
            </label>
          ))}
        </fieldset>
      )}
      <label className="flex items-center justify-between gap-4 rounded-[12px] border border-line px-4 py-3">
        <span className="grid">
          <span className="text-sm font-semibold text-fg">Account active</span>
          <span className="text-xs text-fg-subtle">Deactivated users cannot sign in.</span>
        </span>
        <Switch checked={active} onCheckedChange={setActive} aria-label="Account active" />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<UserListItem | null>(null);
  const debounced = useDebouncedValue(search, 350);
  const [page, setPage] = usePageReset([debounced, role]);
  const params = { page, pageSize: 15, search: debounced || undefined, role: role || undefined };
  const q = useQuery({
    queryKey: qk.adminUsers(params),
    queryFn: () => api.getPage<UserListItem>(`/api/admin/users${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Users' }]}
        title="Users and roles"
        description="Citizens register themselves. Officer and administrator accounts are created here."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus size={17} /> Add staff account
          </Button>
        }
      />
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <MagnifyingGlass size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" aria-label="Search users" className="pl-10" />
          </div>
          <Select
            value={role}
            onValueChange={setRole}
            options={[{ value: '', label: 'All roles' }, ...(['CITIZEN', 'DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'] as const).map((r) => ({ value: r, label: ROLE_LABELS[r] }))]}
            aria-label="Filter by role"
            className="md:w-48"
          />
        </div>
        <Panel>
          {q.isError ? (
            <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : q.isLoading ? (
            <Skeleton className="m-5 h-60" />
          ) : (
            <ul className="divide-y divide-line">
              {(q.data?.data ?? []).map((u) => (
                <li key={u.id} className="grid grid-cols-[40px_1fr_auto] items-center gap-4 px-5 py-3.5 sm:grid-cols-[40px_1.4fr_1fr_auto_auto]">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xs font-bold text-fg-muted">{initials(u.name)}</span>
                  <span className="grid min-w-0">
                    <span className="truncate text-[14px] font-bold text-fg">{u.name}</span>
                    <span className="truncate text-xs text-fg-subtle">{u.email}</span>
                  </span>
                  <span className="hidden min-w-0 sm:grid">
                    <span className="text-[13px] font-semibold text-fg-muted">{ROLE_LABELS[u.role]}</span>
                    <span className="truncate text-xs text-fg-subtle">
                      {u.departments.length ? u.departments.map((d) => d.name).join(', ') : u.role === 'CITIZEN' ? `${u.complaintCount} complaints` : `Since ${formatDate(u.createdAt)}`}
                    </span>
                  </span>
                  <span className="hidden sm:block">{u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                    <PencilSimple size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {q.data && q.data.meta.total > 0 && (
            <div className="border-t border-line">
              <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onPageChange={setPage} label="users" />
            </div>
          )}
        </Panel>
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        {creating && (
          <DialogContent title="Add a staff account" description="The account can sign in immediately with the temporary password.">
            <CreateStaffForm onDone={() => setCreating(false)} />
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing.name} description={`${ROLE_LABELS[editing.role]}, ${editing.email}`}>
            <EditUserForm user={editing} onDone={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
