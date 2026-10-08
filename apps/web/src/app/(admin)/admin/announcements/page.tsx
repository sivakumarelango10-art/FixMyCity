'use client';

import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Archive, Eye, EyeSlash, Megaphone, PencilSimple, Plus, PushPin, Trash } from '@phosphor-icons/react';
import { z } from 'zod';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_STATUSES,
  announcementBaseSchema,
  type AnnouncementDto,
  type AnnouncementStatus,
} from '@fixmycity/shared';
import { FilterChips, PageHeader } from '@/components/common/page';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, FormError, Input, Textarea } from '@/components/ui/field';
import { Badge, EmptyState, ErrorState, Pagination, Panel, Skeleton, Switch } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { ApiError, api, toQuery } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { usePageReset } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/utils';

/** The form edits local date-time strings; they are converted to ISO before saving. */
const formSchema = announcementBaseSchema
  .extend({ publishedAt: z.string().optional(), expiresAt: z.string().optional() })
  .refine((v) => !v.publishedAt || !v.expiresAt || new Date(v.expiresAt) > new Date(v.publishedAt), {
    path: ['expiresAt'],
    message: 'Expiry must be after the publication date.',
  });
type FormValues = z.input<typeof formSchema>;

const toLocal = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '');
const toIso = (local?: string) => (local ? new Date(local).toISOString() : null);

const STATUS_TONE: Record<AnnouncementStatus, 'neutral' | 'success' | 'warning'> = { DRAFT: 'neutral', PUBLISHED: 'success', ARCHIVED: 'warning' };

function liveState(a: AnnouncementDto) {
  const now = Date.now();
  if (a.status !== 'PUBLISHED') return null;
  if (a.publishedAt && new Date(a.publishedAt).getTime() > now) return 'Scheduled';
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) return 'Expired';
  return 'Live';
}

function AnnouncementForm({ existing, onDone }: { existing?: AnnouncementDto; onDone: () => void }) {
  const qc = useQueryClient();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          summary: existing.summary ?? '',
          content: existing.content,
          category: existing.category,
          status: existing.status,
          pinned: existing.pinned,
          publishedAt: toLocal(existing.publishedAt),
          expiresAt: toLocal(existing.expiresAt),
        }
      : { title: '', summary: '', content: '', category: 'GENERAL', status: 'DRAFT', pinned: false, publishedAt: '', expiresAt: '' },
  });
  const [status, pinned, category] = useWatch({ control: form.control, name: ['status', 'pinned', 'category'] });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = { ...values, summary: values.summary || undefined, publishedAt: toIso(values.publishedAt), expiresAt: toIso(values.expiresAt) };
    try {
      if (existing) await api.patch(`/api/admin/announcements/${existing.id}`, body);
      else await api.post('/api/admin/announcements', body);
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      qc.invalidateQueries({ queryKey: qk.announcements });
      toast.success(existing ? 'Announcement saved' : values.status === 'PUBLISHED' ? 'Announcement published' : 'Draft saved');
      onDone();
    } catch (err) {
      setFormError(applyServerErrors(err, form.setError, ['title', 'summary', 'content', 'category', 'status', 'publishedAt', 'expiresAt']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormError message={formError} />
      <Field id="ann-title" label="Title" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} />
      </Field>
      <Field id="ann-summary" label="Summary" optional error={form.formState.errors.summary?.message} hint="One or two sentences shown on cards and in notifications.">
        <Textarea rows={2} {...form.register('summary')} />
      </Field>
      <Field id="ann-content" label="Full notice" error={form.formState.errors.content?.message}>
        <Textarea rows={6} {...form.register('content')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ann-category" label="Type">
          <Select
            value={category}
            onValueChange={(v) => form.setValue('category', v as FormValues['category'])}
            options={ANNOUNCEMENT_CATEGORIES.map((c) => ({ value: c, label: ANNOUNCEMENT_CATEGORY_LABELS[c] }))}
          />
        </Field>
        <Field id="ann-status" label="Status">
          <Select
            value={status ?? 'DRAFT'}
            onValueChange={(v) => form.setValue('status', v as AnnouncementStatus)}
            options={ANNOUNCEMENT_STATUSES.map((s) => ({ value: s, label: s === 'DRAFT' ? 'Draft' : s === 'PUBLISHED' ? 'Published' : 'Archived' }))}
          />
        </Field>
        <Field id="ann-published" label="Publish at" optional error={form.formState.errors.publishedAt?.message} hint="Leave empty to publish immediately.">
          <Input type="datetime-local" {...form.register('publishedAt')} />
        </Field>
        <Field id="ann-expires" label="Expires at" optional error={form.formState.errors.expiresAt?.message} hint="Hidden from citizens after this time.">
          <Input type="datetime-local" {...form.register('expiresAt')} />
        </Field>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3">
        <span className="grid">
          <span className="text-sm font-semibold text-fg">Feature this notice</span>
          <span className="text-xs text-fg-subtle">Featured and emergency notices also notify citizens when they go live.</span>
        </span>
        <Switch checked={!!pinned} onCheckedChange={(v) => form.setValue('pinned', v)} aria-label="Feature this notice" />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {existing ? 'Save' : status === 'PUBLISHED' ? 'Publish' : 'Save draft'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminAnnouncementsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = React.useState<AnnouncementStatus | ''>('');
  const [page, setPage] = usePageReset([status]);
  const [editing, setEditing] = React.useState<AnnouncementDto | 'new' | null>(null);
  const [removing, setRemoving] = React.useState<AnnouncementDto | null>(null);
  const params = { page, pageSize: 12, status: status || undefined };
  const q = useQuery({
    queryKey: qk.adminAnnouncements(params),
    queryFn: () => api.getPage<AnnouncementDto>(`/api/admin/announcements${toQuery(params)}`),
    placeholderData: keepPreviousData,
  });

  const quick = useMutation({
    mutationFn: ({ id, next }: { id: string; next: AnnouncementStatus }) => api.patch(`/api/admin/announcements/${id}`, { status: next }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      qc.invalidateQueries({ queryKey: qk.announcements });
      toast.success(v.next === 'PUBLISHED' ? 'Published' : 'Unpublished');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean; archived: boolean }>(`/api/admin/announcements/${id}`),
    onSuccess: (r) => {
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ['admin', 'announcements'] });
      qc.invalidateQueries({ queryKey: qk.announcements });
      toast.success(r.deleted ? 'Draft deleted' : 'Announcement archived');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not remove'),
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Announcements' }]}
        title="Announcements"
        description="Publish notices to citizens. Drafts are private; expired notices disappear from citizen views automatically."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} weight="bold" /> New announcement
          </Button>
        }
      />
      <div className="grid gap-4">
        <FilterChips
          label="Filter by status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Drafts' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
        <Panel>
          {q.isError ? (
            <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
          ) : q.isLoading ? (
            <Skeleton className="m-5 h-60" />
          ) : (q.data?.data ?? []).length === 0 ? (
            <EmptyState icon={<Megaphone size={22} />} title="No announcements here" />
          ) : (
            <ul className="divide-y divide-line">
              {q.data!.data.map((a) => {
                const live = liveState(a);
                return (
                  <li key={a.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="grid min-w-0 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[a.status]}>{a.status === 'DRAFT' ? 'Draft' : a.status === 'PUBLISHED' ? 'Published' : 'Archived'}</Badge>
                        {live && <Badge tone={live === 'Live' ? 'accent' : 'neutral'}>{live}</Badge>}
                        <Badge>{ANNOUNCEMENT_CATEGORY_LABELS[a.category]}</Badge>
                        {a.pinned && (
                          <Badge tone="accent">
                            <PushPin size={11} weight="fill" /> Featured
                          </Badge>
                        )}
                        {a.isDemo && <Badge>Demo</Badge>}
                      </div>
                      <p className="truncate text-[15px] font-semibold text-fg">{a.title}</p>
                      <p className="text-xs text-fg-subtle">
                        {a.publishedAt ? `Publishes ${formatDateTime(a.publishedAt)}` : 'Not scheduled'}
                        {a.expiresAt ? `, expires ${formatDateTime(a.expiresAt)}` : ''}
                        {a.author ? `. By ${a.author.name}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(a)}>
                        <PencilSimple size={15} /> Edit
                      </Button>
                      {a.status !== 'PUBLISHED' ? (
                        <Button variant="ghost" size="sm" onClick={() => quick.mutate({ id: a.id, next: 'PUBLISHED' })}>
                          <Eye size={15} /> Publish
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => quick.mutate({ id: a.id, next: 'DRAFT' })}>
                          <EyeSlash size={15} /> Unpublish
                        </Button>
                      )}
                      {a.status !== 'ARCHIVED' && (
                        <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setRemoving(a)}>
                          {a.status === 'DRAFT' && !a.publishedAt ? <Trash size={15} /> : <Archive size={15} />}
                          {a.status === 'DRAFT' && !a.publishedAt ? 'Delete' : 'Archive'}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {q.data && q.data.meta.totalPages > 1 && (
            <div className="border-t border-line">
              <Pagination page={page} totalPages={q.data.meta.totalPages} total={q.data.meta.total} onPageChange={setPage} label="announcements" />
            </div>
          )}
        </Panel>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing === 'new' ? 'New announcement' : 'Edit announcement'} className="max-w-2xl">
            <AnnouncementForm existing={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing?.status === 'DRAFT' && !removing.publishedAt ? 'Delete this draft?' : 'Archive this announcement?'}
        description={
          removing?.status === 'DRAFT' && !removing.publishedAt
            ? 'The draft was never published and will be permanently removed.'
            : 'It is hidden from citizens but kept on record.'
        }
        confirmLabel={removing?.status === 'DRAFT' && !removing.publishedAt ? 'Delete draft' : 'Archive'}
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}
