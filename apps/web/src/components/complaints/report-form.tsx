'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CheckCircle, Copy, MapPin, Sparkle, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  CATEGORY_META,
  CLASSIFICATION_SOURCE_LABELS,
  COMPLAINT_CATEGORIES,
  complaintFormSchema,
  type ClassificationResult,
  type ComplaintCategory,
  type ComplaintFormInput,
  type CreatedComplaint,
  type NearbyComplaint,
} from '@fixmycity/shared';
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryChip, PriorityLabel, StatusBadge } from '@/components/common/complaint-meta';
import { LocationPicker } from '@/components/maps';
import { Button } from '@/components/ui/button';
import { Field, FormError, Input, Textarea } from '@/components/ui/field';
import { Panel, PanelHeader } from '@/components/ui/primitives';
import { ApiError, api, toQuery, uploadWithProgress } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useIsClient } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { PhotoDropzone, type PickedPhoto } from './photo-dropzone';

const DRAFT_KEY = 'fmc.report.draft';
type Draft = Partial<Pick<ComplaintFormInput, 'title' | 'description' | 'category' | 'address' | 'additionalNotes' | 'latitude' | 'longitude'>>;

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: Draft) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}
function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Success screen                                                      */
/* ------------------------------------------------------------------ */

function Submitted({ created, onAnother }: { created: CreatedComplaint; onAnother: () => void }) {
  const c = created.classification;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mx-auto grid max-w-2xl gap-6">
      <Panel className="grid justify-items-center gap-5 p-8 text-center sm:p-10">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success"
        >
          <CheckCircle size={36} weight="fill" />
        </motion.span>
        <div className="grid gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-fg">Complaint submitted</h1>
          <p className="text-fg-muted">It has been saved and is waiting for a municipal administrator to review it.</p>
        </div>
        <div className="grid gap-1.5" role="status">
          <p className="text-[13px] font-semibold text-fg-subtle">Your tracking ID</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-4 py-2 font-mono text-xl font-medium text-fg hover:border-line-strong"
            onClick={() => navigator.clipboard?.writeText(created.trackingId).then(() => toast.success('Tracking ID copied'))}
            aria-label={`Copy tracking ID ${created.trackingId}`}
            data-testid="tracking-id"
          >
            {created.trackingId} <Copy size={16} />
          </button>
        </div>
        <StatusBadge status={created.status} />
      </Panel>
      {c && (
        <Panel>
          <PanelHeader title="Suggested routing" description={`${CLASSIFICATION_SOURCE_LABELS[c.source]}. An administrator confirms or changes this.`} />
          <dl className="grid gap-4 p-6 sm:grid-cols-3">
            <div className="grid gap-1">
              <dt className="text-xs text-fg-subtle">Category</dt>
              <dd>
                <CategoryChip category={c.suggestedCategory} />
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-xs text-fg-subtle">Department</dt>
              <dd className="text-[13px] font-semibold text-fg">{c.suggestedDepartment?.name ?? c.suggestedDepartmentCode}</dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-xs text-fg-subtle">Priority</dt>
              <dd>
                <PriorityLabel priority={c.suggestedPriority} />
              </dd>
            </div>
          </dl>
        </Panel>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href={`/dashboard/complaints/${created.id}`}>
            Track this complaint <ArrowRight size={18} weight="bold" />
          </Link>
        </Button>
        <Button size="lg" variant="secondary" onClick={onAnother}>
          Report another issue
        </Button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

export function ReportForm() {
  const qc = useQueryClient();
  const [photos, setPhotos] = React.useState<PickedPhoto[]>([]);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [created, setCreated] = React.useState<CreatedComplaint | null>(null);
  const isClient = useIsClient();
  // Drafts live in this browser only; read once on the client (the server has none).
  const [initialDraft] = React.useState<Draft | null>(() => (typeof window === 'undefined' ? null : readDraft()));
  const hasDraft = !!initialDraft && !!(initialDraft.title || initialDraft.description);
  const [draftDismissed, setDraftDismissed] = React.useState(false);
  const draftRestored = isClient && hasDraft && !draftDismissed;

  const form = useForm<ComplaintFormInput>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: { title: '', description: '', address: '', additionalNotes: '' },
  });
  const { register, setValue, handleSubmit, formState, control, reset } = form;
  const values = useWatch({ control });

  // Restore a saved draft once (text and location only; photos are never stored).
  React.useEffect(() => {
    if (hasDraft) reset({ title: '', description: '', address: '', additionalNotes: '', ...initialDraft });
  }, [hasDraft, initialDraft, reset]);

  // Persist the draft as the user types.
  React.useEffect(() => {
    if (created) return;
    const t = setTimeout(() => {
      const { title, description, category, address, additionalNotes, latitude, longitude } = values;
      if (title || description) writeDraft({ title, description, category, address, additionalNotes, latitude, longitude });
    }, 500);
    return () => clearTimeout(t);
  }, [values, created]);

  /* Live classification preview */
  const text = useDebounced(`${values.title ?? ''}\n${values.description ?? ''}`.trim(), 900);
  const suggestion = useQuery({
    queryKey: ['classify-preview', text],
    queryFn: () => api.post<ClassificationResult>('/api/ai/classify-complaint', { title: values.title ?? '', description: values.description ?? '' }),
    enabled: (values.description ?? '').trim().length >= 20,
    staleTime: Infinity,
    retry: false,
  });

  /* Nearby duplicates */
  const lat = values.latitude;
  const lng = values.longitude;
  const nearbyParams = { latitude: lat, longitude: lng, category: values.category, text: useDebounced(values.title ?? '', 700) || undefined };
  const nearby = useQuery({
    queryKey: qk.nearby(nearbyParams),
    queryFn: () => api.get<NearbyComplaint[]>(`/api/complaints/nearby${toQuery(nearbyParams)}`),
    enabled: typeof lat === 'number' && typeof lng === 'number',
  });

  const submit = useMutation({
    mutationFn: async (data: ComplaintFormInput) => {
      const body = new FormData();
      body.set('title', data.title);
      body.set('description', data.description);
      body.set('category', data.category);
      body.set('latitude', String(data.latitude));
      body.set('longitude', String(data.longitude));
      body.set('address', data.address);
      if (data.additionalNotes) body.set('additionalNotes', data.additionalNotes);
      photos.forEach((p) => body.append('photos', p.file));
      setProgress(0);
      return uploadWithProgress<CreatedComplaint>('/api/complaints', body, setProgress);
    },
    onSuccess: (result) => {
      clearDraft();
      setCreated(result);
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      qc.invalidateQueries({ queryKey: qk.complaints });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      qc.invalidateQueries({ queryKey: qk.notifications });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setProgress(null);
      const message = applyServerErrors(err, form.setError, ['title', 'description', 'category', 'latitude', 'longitude', 'address', 'additionalNotes']);
      if (err instanceof ApiError && err.fields?.photos) setPhotoError(err.fields.photos);
      setFormError(message ?? 'Please fix the highlighted fields.');
    },
  });

  const onSubmit = handleSubmit(
    (data) => {
      setFormError(null);
      if (photos.length === 0) {
        setPhotoError('Attach at least one photo of the issue.');
        return;
      }
      setPhotoError(null);
      submit.mutate(data);
    },
    () => {
      if (photos.length === 0) setPhotoError('Attach at least one photo of the issue.');
      setFormError('Please fix the highlighted fields.');
    },
  );

  if (created) {
    return (
      <Submitted
        created={created}
        onAnother={() => {
          reset({ title: '', description: '', address: '', additionalNotes: '' });
          setCreated(null);
          setProgress(null);
        }}
      />
    );
  }

  const s = suggestion.data;
  const location = typeof lat === 'number' && typeof lng === 'number' ? { latitude: lat, longitude: lng } : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="grid content-start gap-6">
        {draftRestored && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface-2 px-4 py-3 text-sm text-fg-muted">
            Restored your unsent draft.
            <button
              type="button"
              className="font-semibold text-accent hover:underline"
              onClick={() => {
                clearDraft();
                reset({ title: '', description: '', address: '', additionalNotes: '' });
                setDraftDismissed(true);
              }}
            >
              Start fresh
            </button>
          </div>
        )}
        <FormError message={formError} />

        <Panel>
          <PanelHeader title="What is the problem?" />
          <div className="grid gap-5 p-5 sm:p-6">
            <Field id="title" label="Title" error={formState.errors.title?.message} hint="A short headline, for example: Large pothole near MG Road">
              <Input maxLength={120} {...register('title')} />
            </Field>
            <Field id="description" label="Description" error={formState.errors.description?.message} hint={`${(values.description ?? '').length} / 2000. Say what, where and how serious it is.`}>
              <Textarea rows={5} maxLength={2000} {...register('description')} />
            </Field>
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold text-fg">Category</legend>
              <div role="radiogroup" aria-label="Category" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {COMPLAINT_CATEGORIES.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat];
                  const active = values.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setValue('category', cat, { shouldValidate: true, shouldDirty: true })}
                      className={cn(
                        'grid min-h-[76px] content-center justify-items-center gap-1.5 rounded-[14px] border px-2 py-3 text-center text-[12.5px] font-semibold transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]',
                        active ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      <Icon size={20} weight={active ? 'fill' : 'regular'} style={{ color: CATEGORY_COLORS[cat] }} />
                      {CATEGORY_META[cat].label}
                    </button>
                  );
                })}
              </div>
              {formState.errors.category && (
                <p role="alert" className="text-[13px] font-medium text-danger">
                  {formState.errors.category.message}
                </p>
              )}
            </fieldset>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Photos" description="A clear photo helps the department plan the repair." />
          <div className="p-5 sm:p-6">
            <PhotoDropzone photos={photos} onChange={(p) => { setPhotos(p); setPhotoError(null); }} error={photoError} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Where is it?" description="Tap the map to drop a pin, drag it to adjust, or use your current location." />
          <div className="grid gap-5 p-5 sm:p-6">
            <LocationPicker
              value={location}
              onChange={(la, ln) => {
                setValue('latitude', Number(la.toFixed(6)), { shouldValidate: true });
                setValue('longitude', Number(ln.toFixed(6)), { shouldValidate: true });
              }}
              nearby={nearby.data ?? []}
              className="h-[320px] rounded-[14px] border border-line sm:h-[380px]"
            />
            <p className={cn('flex items-center gap-2 text-[13px]', location ? 'text-fg-muted' : formState.errors.latitude ? 'font-medium text-danger' : 'text-fg-subtle')} role={formState.errors.latitude ? 'alert' : undefined}>
              <MapPin size={15} weight={location ? 'fill' : 'regular'} className={location ? 'text-accent' : undefined} />
              {location ? `Pinned at ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : (formState.errors.latitude?.message ?? 'No location selected yet.')}
            </p>
            <Field id="address" label="Address or landmark" error={formState.errors.address?.message} hint="For example: MG Road, near metro station exit B">
              <Input maxLength={200} autoComplete="street-address" {...register('address')} />
            </Field>
            <Field id="additionalNotes" label="Additional notes" optional error={formState.errors.additionalNotes?.message}>
              <Textarea rows={3} maxLength={1000} placeholder="Access details, best time to visit, safety concerns" {...register('additionalNotes')} />
            </Field>
          </div>
        </Panel>
      </div>

      {/* Sidebar: suggestion, duplicates, submit */}
      <div className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start">
        <Panel>
          <PanelHeader title="Suggestion" description="Advisory only. You choose the category; an administrator confirms the routing." />
          <div className="min-h-[140px] p-5 sm:p-6" aria-live="polite">
            <AnimatePresence mode="wait">
              {(values.description ?? '').trim().length < 20 ? (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-fg-subtle">
                  Write at least 20 characters of description to see a suggested category, department and priority.
                </motion.p>
              ) : suggestion.isFetching && !s ? (
                <motion.p key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-fg-muted">
                  <Sparkle size={16} className="animate-pulse text-accent" /> Analysing your description
                </motion.p>
              ) : suggestion.isError ? (
                <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-fg-subtle">
                  Suggestions are unavailable right now. You can still submit.
                </motion.p>
              ) : s ? (
                <motion.div key={`${s.suggestedCategory}-${s.suggestedPriority}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-4">
                  <dl className="grid gap-3 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-subtle">Category</dt>
                      <dd>
                        <CategoryChip category={s.suggestedCategory} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-subtle">Department</dt>
                      <dd className="text-right font-semibold text-fg">{s.suggestedDepartmentName}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg-subtle">Priority</dt>
                      <dd>
                        <PriorityLabel priority={s.suggestedPriority} />
                      </dd>
                    </div>
                  </dl>
                  <p className="text-[12.5px] leading-relaxed text-fg-muted">{s.explanation}</p>
                  <p className="text-[11.5px] text-fg-subtle">Source: {CLASSIFICATION_SOURCE_LABELS[s.source]}</p>
                  {values.category !== s.suggestedCategory && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setValue('category', s.suggestedCategory as ComplaintCategory, { shouldValidate: true })}
                    >
                      Use {CATEGORY_META[s.suggestedCategory].label}
                    </Button>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Panel>

        <AnimatePresence>
          {nearby.data && nearby.data.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Panel className="border-warning/40">
                <PanelHeader title="Already reported nearby?" description="These open reports are close to your pin. You can still submit yours." />
                <ul className="grid gap-2 p-4 sm:p-5">
                  {nearby.data.map((n) => (
                    <li key={n.id} className="grid gap-1 rounded-[12px] bg-surface-2 px-3.5 py-3">
                      <p className="flex items-start gap-2 text-[13.5px] font-semibold text-fg">
                        <Warning size={15} className="mt-0.5 shrink-0 text-warning" /> {n.title}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {n.distanceMeters} m away, {n.trackingId}
                      </p>
                      <StatusBadge status={n.status} size="sm" className="w-fit" />
                    </li>
                  ))}
                </ul>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>

        <Panel className="grid gap-4 p-5 sm:p-6">
          {progress !== null && (
            <div className="grid gap-1.5" role="status" aria-live="polite">
              <p className="text-xs font-semibold text-fg-muted">{progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Saving your report'}</p>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${Math.max(4, progress * 100)}%` }} transition={{ duration: 0.2 }} />
              </div>
            </div>
          )}
          <Button type="submit" size="lg" loading={submit.isPending} loadingText="Submitting">
            Submit complaint
          </Button>
          <p className="text-[12.5px] leading-relaxed text-fg-subtle">Your name and contact details are never shown on the public map.</p>
        </Panel>
      </div>
    </form>
  );
}
