'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Buildings, PencilSimple, Plus, UsersThree } from '@phosphor-icons/react';
import { z } from 'zod';
import { createDepartmentSchema, type DepartmentDto } from '@fixmycity/shared';
import { PageHeader } from '@/components/common/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, FormError, Input, Textarea } from '@/components/ui/field';
import { Badge, EmptyState, ErrorState, Panel, Skeleton, Switch } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { qk } from '@/lib/query-keys';

type FormValues = z.input<typeof createDepartmentSchema>;

function DepartmentForm({ dept, onDone }: { dept?: DepartmentDto; onDone: () => void }) {
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: dept
      ? { name: dept.name, code: dept.code, description: dept.description, contactEmail: dept.contactEmail ?? '', active: dept.active }
      : { name: '', code: '', description: '', contactEmail: '', active: true },
  });
  const active = useWatch({ control: form.control, name: 'active' });
  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (dept) await api.patch(`/api/admin/departments/${dept.id}`, values);
      else await api.post('/api/admin/departments', values);
      qc.invalidateQueries({ queryKey: qk.adminDepartments });
      qc.invalidateQueries({ queryKey: qk.departments });
      toast.success(dept ? 'Department updated' : 'Department created');
      onDone();
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['name', 'code', 'description', 'contactEmail']));
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="dept-name" label="Name" error={form.formState.errors.name?.message}>
        <Input {...form.register('name')} />
      </Field>
      <Field id="dept-code" label="Code" error={form.formState.errors.code?.message} hint="Short identifier, for example PARKS">
        <Input {...form.register('code')} className="font-mono uppercase" />
      </Field>
      <Field id="dept-description" label="Responsibilities" error={form.formState.errors.description?.message}>
        <Textarea rows={3} {...form.register('description')} />
      </Field>
      <Field id="dept-email" label="Contact email" optional error={form.formState.errors.contactEmail?.message}>
        <Input type="email" {...form.register('contactEmail')} />
      </Field>
      <label className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3">
        <span className="grid">
          <span className="text-sm font-semibold text-fg">Accepting assignments</span>
          <span className="text-xs text-fg-subtle">Inactive departments cannot receive new complaints.</span>
        </span>
        <Switch checked={!!active} onCheckedChange={(v) => form.setValue('active', v, { shouldDirty: true })} aria-label="Department active" />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {dept ? 'Save changes' : 'Create department'}
        </Button>
      </div>
    </form>
  );
}

export default function DepartmentsPage() {
  const q = useQuery({ queryKey: qk.adminDepartments, queryFn: () => api.get<DepartmentDto[]>('/api/admin/departments') });
  const [editing, setEditing] = React.useState<DepartmentDto | 'new' | null>(null);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Departments' }]}
        title="Departments"
        description="Who handles what, how many officers they have, and their current workload."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} weight="bold" /> New department
          </Button>
        }
      />
      {q.isError ? (
        <ErrorState className="panel" message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-panel" />
          ))}
        </div>
      ) : (q.data ?? []).length === 0 ? (
        <EmptyState className="panel" icon={<Buildings size={22} />} title="No departments yet" />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data!.map((d) => (
            <li key={d.id}>
              <Panel className="grid h-full content-start gap-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="font-mono text-[11.5px] text-fg-subtle">{d.code}</p>
                    <h2 className="text-base font-semibold leading-snug text-fg">{d.name}</h2>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.name}`} onClick={() => setEditing(d)}>
                    <PencilSimple size={16} />
                  </Button>
                </div>
                <p className="text-[13px] leading-relaxed text-fg-muted">{d.description}</p>
                {!d.active && <Badge tone="warning">Not accepting assignments</Badge>}
                <dl className="grid grid-cols-3 gap-3 border-y border-line py-3">
                  {[
                    ['Open', d.stats.open],
                    ['In progress', d.stats.inProgress],
                    ['Resolved', d.stats.resolved],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="grid gap-0.5">
                      <dt className="text-[11.5px] text-fg-subtle">{k}</dt>
                      <dd className="text-lg font-bold text-fg tabular">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="grid gap-2">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg-muted">
                    <UsersThree size={15} /> {d.stats.officers} officer{d.stats.officers === 1 ? '' : 's'}
                  </p>
                  {d.officers.length > 0 ? (
                    <ul className="grid gap-1">
                      {d.officers.map((o) => (
                        <li key={o.id} className="truncate text-[12.5px] text-fg-subtle">
                          {o.name}, <span className="font-mono">{o.email}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12.5px] text-fg-subtle">No officers yet. Add one from Users.</p>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing === 'new' ? 'New department' : `Edit ${editing.name}`}>
            <DepartmentForm dept={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
