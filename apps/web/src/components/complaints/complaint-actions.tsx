'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowCounterClockwise, CheckCircle, ImageSquare, LockSimple, Megaphone, Sparkle, Star, Wrench, XCircle } from '@phosphor-icons/react';
import {
  CATEGORY_META,
  COMPLAINT_CATEGORIES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  UPLOAD_LIMITS,
  statusRequiresReason,
  statusRequiresResolution,
  type ComplaintCategory,
  type ComplaintDetail,
  type ComplaintStatus,
  type Priority,
} from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { Field, FormError, Textarea } from '@/components/ui/field';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { Select } from '@/components/ui/select';
import { ApiError, api, uploadWithProgress } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

interface PublicDepartment {
  id: string;
  code: string;
  name: string;
}

function useInvalidateComplaint(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.complaint(id) });
    qc.invalidateQueries({ queryKey: qk.complaints });
    qc.invalidateQueries({ queryKey: qk.dashboard });
    qc.invalidateQueries({ queryKey: ['admin'] });
    qc.invalidateQueries({ queryKey: ['department'] });
    qc.invalidateQueries({ queryKey: qk.notifications });
  };
}

const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');

/* ------------------------------------------------------------------ */
/* Admin: assignment                                                    */
/* ------------------------------------------------------------------ */

export function AssignPanel({ complaint }: { complaint: ComplaintDetail }) {
  const invalidate = useInvalidateComplaint(complaint.id);
  const departments = useQuery({ queryKey: qk.departments, queryFn: () => api.get<PublicDepartment[]>('/api/departments') });
  const suggestion = complaint.classification;
  const [departmentId, setDepartmentId] = React.useState(complaint.department?.id ?? suggestion?.suggestedDepartment?.id ?? '');
  const [priority, setPriority] = React.useState<Priority>(complaint.department ? complaint.priority : (suggestion?.suggestedPriority ?? complaint.priority));
  const [category, setCategory] = React.useState<ComplaintCategory>(complaint.category);
  const [notes, setNotes] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);

  const assign = useMutation({
    mutationFn: () =>
      api.patch(`/api/admin/complaints/${complaint.id}/assign`, {
        departmentId,
        priority,
        category: category !== complaint.category ? category : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setConfirm(false);
      setNotes('');
      toast.success('Complaint assigned', { description: `${complaint.trackingId} is now with ${deptName}.` });
      invalidate();
    },
    onError: (err) => toast.error('Assignment failed', { description: errorMessage(err) }),
  });

  const deptName = departments.data?.find((d) => d.id === departmentId)?.name ?? 'the department';
  const followsSuggestion = !!suggestion && suggestion.suggestedDepartment?.id === departmentId && suggestion.suggestedPriority === priority;
  const reassign = !!complaint.department;

  return (
    <Panel>
      <PanelHeader title={reassign ? 'Reassign department' : 'Assign to a department'} description="You make the final decision. The suggestion is advisory." />
      <div className="grid gap-4 p-5 sm:p-6">
        <Field id="assign-dept" label="Department">
          <Select
            value={departmentId}
            onValueChange={setDepartmentId}
            placeholder={departments.isLoading ? 'Loading departments' : 'Choose a department'}
            options={(departments.data ?? []).map((d) => ({
              value: d.id,
              label: d.name,
              description: suggestion?.suggestedDepartment?.id === d.id ? 'Suggested' : undefined,
            }))}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="assign-priority" label="Priority">
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
          </Field>
          <Field id="assign-category" label="Category">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ComplaintCategory)}
              options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))}
            />
          </Field>
        </div>
        <Field id="assign-notes" label="Notes for the department" optional>
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Access details, safety concerns, related reports" />
        </Field>
        {suggestion && (
          <p className={cn('text-[12.5px]', followsSuggestion ? 'text-success' : 'text-fg-subtle')}>
            {followsSuggestion ? 'This follows the suggestion. It will be recorded as accepted.' : 'This differs from the suggestion. It will be recorded as an override.'}
          </p>
        )}
        <Button disabled={!departmentId} onClick={() => setConfirm(true)}>
          {reassign ? 'Reassign complaint' : 'Assign complaint'}
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={reassign ? 'Reassign this complaint?' : 'Assign this complaint?'}
        description={`${complaint.trackingId} will go to ${deptName} with ${PRIORITY_LABELS[priority].toLowerCase()} priority. The citizen and the department's officers are notified.`}
        confirmLabel={reassign ? 'Reassign' : 'Assign'}
        loading={assign.isPending}
        onConfirm={() => assign.mutate()}
      />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Staff: status changes                                                */
/* ------------------------------------------------------------------ */

const STATUS_ACTION: Partial<Record<ComplaintStatus, { label: string; icon: typeof Wrench; tone: 'primary' | 'secondary' | 'danger' }>> = {
  UNDER_REVIEW: { label: 'Start review', icon: Sparkle, tone: 'secondary' },
  IN_PROGRESS: { label: 'Start work', icon: Wrench, tone: 'primary' },
  RESOLVED: { label: 'Mark resolved', icon: CheckCircle, tone: 'primary' },
  REJECTED: { label: 'Reject', icon: XCircle, tone: 'danger' },
  REOPENED: { label: 'Reopen', icon: ArrowCounterClockwise, tone: 'secondary' },
};

export function StatusActions({ complaint, allowPhotos }: { complaint: ComplaintDetail; allowPhotos: boolean }) {
  const invalidate = useInvalidateComplaint(complaint.id);
  const [target, setTarget] = React.useState<ComplaintStatus | null>(null);
  const [text, setText] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (to: ComplaintStatus) => {
      const body = statusRequiresResolution(to) ? { status: to, resolutionSummary: text.trim() } : { status: to, reason: text.trim() || undefined };
      await api.patch(`/api/complaints/${complaint.id}/status`, body);
      if (files.length && allowPhotos) {
        const form = new FormData();
        files.forEach((f) => form.append('photos', f));
        setProgress(0);
        await uploadWithProgress(`/api/complaints/${complaint.id}/resolution-photos`, form, setProgress);
      }
    },
    onSuccess: (_d, to) => {
      toast.success(`Status updated: ${STATUS_LABELS[to]}`, { description: 'The citizen has been notified.' });
      setTarget(null);
      setText('');
      setFiles([]);
      setProgress(null);
      invalidate();
    },
    onError: (err) => {
      setProgress(null);
      setError(errorMessage(err));
    },
  });

  const allowed = complaint.permissions.allowedStatuses;
  if (allowed.length === 0) return null;

  const needsReason = target ? statusRequiresReason(target) : false;
  const needsResolution = target ? statusRequiresResolution(target) : false;
  const valid = needsResolution ? text.trim().length >= 10 : needsReason ? text.trim().length >= 3 : true;

  return (
    <Panel>
      <PanelHeader title="Update status" description="Only transitions allowed for your role are shown." />
      <div className="flex flex-wrap gap-2 p-5 sm:p-6">
        {allowed.map((s) => {
          const action = STATUS_ACTION[s];
          const Icon = action?.icon ?? Wrench;
          return (
            <Button
              key={s}
              variant={action?.tone === 'danger' ? 'danger-quiet' : (action?.tone ?? 'secondary')}
              onClick={() => {
                setError(null);
                setText('');
                setTarget(s);
              }}
            >
              <Icon size={16} weight="bold" /> {action?.label ?? STATUS_LABELS[s]}
            </Button>
          );
        })}
      </div>
      <Dialog open={!!target} onOpenChange={(o) => !o && !mutation.isPending && setTarget(null)}>
        {target && (
          <DialogContent
            title={needsResolution ? 'Record the resolution' : `Change status to ${STATUS_LABELS[target]}`}
            description={
              needsResolution
                ? 'Describe what was fixed. The citizen sees this on their timeline.'
                : needsReason
                  ? 'A short reason is required and is shown to the citizen.'
                  : 'Optionally add a short note for the timeline.'
            }
          >
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid) mutation.mutate(target);
              }}
            >
              <FormError message={error} />
              <Field
                id="status-text"
                label={needsResolution ? 'Resolution details' : needsReason ? 'Reason' : 'Note'}
                optional={!needsReason && !needsResolution}
                hint={needsResolution ? 'At least 10 characters.' : undefined}
              >
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} autoFocus />
              </Field>
              {needsResolution && allowPhotos && (
                <Field id="resolution-photos" label="Resolution photos" optional hint={`Up to ${UPLOAD_LIMITS.maxFiles} images, 5 MB each.`}>
                  <input
                    type="file"
                    accept={UPLOAD_LIMITS.allowedMimeTypes.join(',')}
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, UPLOAD_LIMITS.maxFiles))}
                    className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-[10px] file:border file:border-line file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-fg"
                  />
                </Field>
              )}
              {progress !== null && (
                <div className="grid gap-1.5" role="status" aria-live="polite">
                  <p className="flex items-center gap-2 text-xs font-semibold text-fg-muted">
                    <ImageSquare size={14} /> Uploading photos {Math.round(progress * 100)}%
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setTarget(null)} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!valid} loading={mutation.isPending} variant={target === 'REJECTED' ? 'danger' : 'primary'}>
                  {STATUS_ACTION[target]?.label ?? 'Save'}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Staff: notes                                                         */
/* ------------------------------------------------------------------ */

export function NoteComposer({ complaint }: { complaint: ComplaintDetail }) {
  const invalidate = useInvalidateComplaint(complaint.id);
  const [body, setBody] = React.useState('');
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'INTERNAL'>('PUBLIC');
  const add = useMutation({
    mutationFn: () => api.post(`/api/complaints/${complaint.id}/notes`, { body: body.trim(), visibility }),
    onSuccess: () => {
      setBody('');
      toast.success(visibility === 'PUBLIC' ? 'Progress update posted' : 'Internal note saved');
      invalidate();
    },
    onError: (err) => toast.error('Could not save the note', { description: errorMessage(err) }),
  });
  if (!complaint.permissions.canAddPublicNote) return null;
  return (
    <Panel>
      <PanelHeader title="Add an update" />
      <form
        className="grid gap-3 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim().length >= 2) add.mutate();
        }}
      >
        <div role="radiogroup" aria-label="Who can see this note" className="grid grid-cols-2 gap-1 rounded-[12px] border border-line bg-surface-2 p-1">
          {(
            [
              { v: 'PUBLIC', label: 'Public', icon: Megaphone },
              { v: 'INTERNAL', label: 'Staff only', icon: LockSimple },
            ] as const
          ).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={visibility === v}
              onClick={() => setVisibility(v)}
              className={cn(
                'flex h-9 items-center justify-center gap-1.5 rounded-[9px] text-[13px] font-semibold transition-colors',
                visibility === v ? 'bg-surface text-fg shadow-[var(--shadow-panel)]' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <label htmlFor="note-body" className="sr-only">
          Note
        </label>
        <Textarea
          id="note-body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder={visibility === 'PUBLIC' ? 'Visible to the citizen, for example: crew scheduled for tonight' : 'Visible to municipal staff only'}
        />
        <Button type="submit" variant="secondary" disabled={body.trim().length < 2} loading={add.isPending}>
          {visibility === 'PUBLIC' ? 'Post update' : 'Save internal note'}
        </Button>
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Citizen: reopen and feedback                                         */
/* ------------------------------------------------------------------ */

export function CitizenFollowUp({ complaint }: { complaint: ComplaintDetail }) {
  const invalidate = useInvalidateComplaint(complaint.id);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');

  const reopen = useMutation({
    mutationFn: () => api.post(`/api/complaints/${complaint.id}/reopen`, { reason: reason.trim() }),
    onSuccess: () => {
      setReopenOpen(false);
      setReason('');
      toast.success('Complaint reopened', { description: 'It has been sent back to the department.' });
      invalidate();
    },
    onError: (err) => toast.error('Could not reopen', { description: errorMessage(err) }),
  });
  const feedback = useMutation({
    mutationFn: () => api.post(`/api/complaints/${complaint.id}/feedback`, { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      toast.success('Thanks for your feedback');
      invalidate();
    },
    onError: (err) => toast.error('Could not save feedback', { description: errorMessage(err) }),
  });

  const { canGiveFeedback, canReopen } = complaint.permissions;
  if (!canGiveFeedback && !canReopen && !complaint.feedback) return null;

  return (
    <Panel>
      <PanelHeader title="How did it go?" description="Rate the resolution, or reopen it if the problem is back." />
      <div className="grid gap-4 p-5 sm:p-6">
        {complaint.feedback ? (
          <div className="grid gap-1">
            <p className="flex items-center gap-1 text-warning" aria-label={`You rated ${complaint.feedback.rating} of 5`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={18} weight={i <= complaint.feedback!.rating ? 'fill' : 'regular'} />
              ))}
            </p>
            {complaint.feedback.comment && <p className="text-sm text-fg-muted">{complaint.feedback.comment}</p>}
          </div>
        ) : canGiveFeedback ? (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (rating > 0) feedback.mutate();
            }}
          >
            <div role="radiogroup" aria-label="Rating" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${i} star${i > 1 ? 's' : ''}`}
                  onClick={() => setRating(i)}
                  className="rounded-[8px] p-1 text-warning transition-transform hover:scale-110"
                >
                  <Star size={24} weight={i <= rating ? 'fill' : 'regular'} />
                </button>
              ))}
            </div>
            <label htmlFor="feedback-comment" className="sr-only">
              Comment
            </label>
            <Textarea id="feedback-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Optional comment" />
            <Button type="submit" variant="secondary" disabled={rating === 0} loading={feedback.isPending}>
              Submit rating
            </Button>
          </form>
        ) : null}
        {canReopen && (
          <Button variant="secondary" onClick={() => setReopenOpen(true)}>
            <ArrowCounterClockwise size={16} /> The problem is back
          </Button>
        )}
      </div>
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent title="Reopen this complaint" description="Tell the department what is still wrong. It returns to them with your reason.">
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length >= 10) reopen.mutate();
            }}
          >
            <Field id="reopen-reason" label="What is still wrong?" hint="At least 10 characters.">
              <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReopenOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={reason.trim().length < 10} loading={reopen.isPending}>
                Reopen complaint
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Admin: re-run classification                                         */
/* ------------------------------------------------------------------ */

export function useReclassify(id: string) {
  const invalidate = useInvalidateComplaint(id);
  return useMutation({
    mutationFn: () => api.post(`/api/admin/complaints/${id}/classify`),
    onSuccess: () => {
      toast.success('Classification refreshed');
      invalidate();
    },
    onError: (err) => toast.error('Classification failed', { description: errorMessage(err) }),
  });
}
