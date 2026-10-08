'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, CheckCircle, Copy, MapPin, NotePencil, Sparkle, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  CATEGORY_META,
  CLASSIFICATION_SOURCE_LABELS,
  COMPLAINT_CATEGORIES,
  UPLOAD_LIMITS,
  complaintFormSchema,
  type ClassificationResult,
  type ComplaintCategory,
  type ComplaintFormInput,
  type CreatedComplaint,
  type NearbyComplaint,
} from '@fixmycity/shared';
import { CATEGORY_ICONS, CategoryChip, PriorityLabel, StatusBadge } from '@/components/common/complaint-meta';
import { LocationPicker } from '@/components/maps';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FormError, Input, Textarea } from '@/components/ui/field';
import { Notice, Panel, PanelHeader } from '@/components/ui/primitives';
import { ApiError, api, toQuery, uploadWithProgress } from '@/lib/api';
import { applyServerErrors } from '@/lib/forms';
import { useIsClient } from '@/lib/hooks';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { PhotoDropzone, type PickedPhoto } from './photo-dropzone';
import { ProgressRail } from './timeline';

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
      <Panel className="grid justify-items-center gap-6 px-6 py-10 text-center sm:px-10">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.1 }}
          className="grid h-16 w-16 place-items-center rounded-full border border-success/30 bg-success-soft text-success"
        >
          <CheckCircle size={34} weight="fill" />
        </motion.span>
        <div className="grid gap-2">
          <h1 className="type-page text-fg">Complaint submitted</h1>
          <p className="text-fg-muted">It is saved and waiting for a municipal administrator to review it. You will be notified at every step.</p>
        </div>
        <div className="grid gap-2" role="status">
          <p className="text-caption font-semibold text-fg-subtle">Your tracking ID</p>
          <button
            type="button"
            className="inline-flex items-center gap-2.5 rounded-control border border-line-strong bg-surface-2 px-4 py-2.5 font-mono text-xl font-medium text-fg transition-colors hover:border-fg-subtle"
            onClick={() => navigator.clipboard?.writeText(created.trackingId).then(() => toast.success('Tracking ID copied'))}
            aria-label={`Copy tracking ID ${created.trackingId}`}
            data-testid="tracking-id"
          >
            {created.trackingId} <Copy size={16} />
          </button>
        </div>
        <div className="w-full max-w-md border-t border-line pt-6">
          <ProgressRail status={created.status} timeline={[]} />
        </div>
      </Panel>
      {c && (
        <Panel>
          <PanelHeader title="Suggested routing" description={`${CLASSIFICATION_SOURCE_LABELS[c.source]}. An administrator confirms or changes this.`} />
          <dl className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <div className="grid content-start gap-1.5">
              <dt className="text-xs text-fg-subtle">Category</dt>
              <dd>
                <CategoryChip category={c.suggestedCategory} />
              </dd>
            </div>
            <div className="grid content-start gap-1.5">
              <dt className="text-xs text-fg-subtle">Department</dt>
              <dd className="text-sm font-semibold text-fg">{c.suggestedDepartment?.name ?? c.suggestedDepartmentCode}</dd>
            </div>
            <div className="grid content-start gap-1.5">
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
/* Steps                                                               */
/* ------------------------------------------------------------------ */

/** One stop on the report route: a numbered station, a question, and its fields. */
function Step({ n, id, title, description, done, last, children }: { n: number; id: string; title: string; description?: string; done: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative grid scroll-mt-24 gap-4">
      {!last && <span aria-hidden className="absolute bottom-[-28px] left-[17px] top-12 hidden w-0.5 rounded-full bg-line sm:block" />}
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition-colors duration-300',
            done ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-bg text-fg-muted',
          )}
          aria-hidden
        >
          {done ? <Check size={16} weight="bold" /> : n}
        </span>
        <div className="grid gap-1 pt-1">
          <h2 id={`${id}-title`} className="text-lg font-semibold tracking-[-0.015em] text-fg">
            <span className="sr-only">Step {n}: </span>
            {title}
            {done && <span className="sr-only"> (complete)</span>}
          </h2>
          {description && <p className="text-sm text-fg-subtle">{description}</p>}
        </div>
      </div>
      <div className="sm:pl-[52px]">
        <Panel className="grid gap-5 p-4 sm:p-6">{children}</Panel>
      </div>
    </section>
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
  const [notesOpen, setNotesOpen] = React.useState(() => !!initialDraft?.additionalNotes);

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
      setFormError('Some steps still need attention. They are highlighted below.');
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
  const steps = [
    { id: 'step-what', label: 'What happened', done: (values.title ?? '').trim().length >= 8 && (values.description ?? '').trim().length >= 20 },
    { id: 'step-category', label: values.category ? CATEGORY_META[values.category].label : 'Category', done: !!values.category },
    { id: 'step-photo', label: photos.length ? `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} attached` : 'Photo', done: photos.length > 0 },
    { id: 'step-where', label: 'Location', done: !!location && (values.address ?? '').trim().length >= 5 },
  ];
  const completed = steps.filter((x) => x.done).length;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid min-w-0 content-start gap-7">
        {draftRestored && (
          <Notice
            title="We restored your unsent draft."
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearDraft();
                  reset({ title: '', description: '', address: '', additionalNotes: '' });
                  setDraftDismissed(true);
                }}
              >
                Start fresh
              </Button>
            }
          />
        )}
        <FormError message={formError} />

        <Step n={1} id="step-what" title="What happened?" description="A short headline and a few details about the problem." done={steps[0]!.done}>
          <Field id="title" label="Title" error={formState.errors.title?.message} hint="For example: Large pothole near MG Road">
            <Input maxLength={120} autoComplete="off" {...register('title')} />
          </Field>
          <Field
            id="description"
            label="Description"
            error={formState.errors.description?.message}
            hint={
              <span className="flex flex-wrap justify-between gap-2">
                <span>Say what is wrong, exactly where, and how serious it is.</span>
                <span className="tabular">{(values.description ?? '').length} / 2000</span>
              </span>
            }
          >
            <Textarea rows={5} maxLength={2000} {...register('description')} />
          </Field>
        </Step>

        <Step n={2} id="step-category" title="What kind of problem is it?" description="Pick the closest match. A suggestion appears once you have described the problem." done={steps[1]!.done}>
          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              {(values.description ?? '').trim().length < 20 ? (
                <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-fg-subtle">
                  <Sparkle size={16} aria-hidden /> Write at least 20 characters of description to get a suggested category, department and priority.
                </motion.p>
              ) : suggestion.isFetching && !s ? (
                <motion.p key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm text-fg-muted">
                  <Sparkle size={16} className="text-accent-text motion-safe:animate-pulse" aria-hidden /> Reading your description
                </motion.p>
              ) : suggestion.isError ? (
                <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-fg-subtle">
                  Suggestions are unavailable right now. Choose a category yourself; you can still submit.
                </motion.p>
              ) : s ? (
                <motion.div
                  key={`${s.suggestedCategory}-${s.suggestedPriority}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-3 rounded-control border border-accent-line bg-accent-soft p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Sparkle size={16} weight="fill" className="text-accent-text" aria-hidden /> Suggestion
                    </p>
                    {values.category !== s.suggestedCategory ? (
                      <Button type="button" variant="secondary" size="sm" onClick={() => setValue('category', s.suggestedCategory as ComplaintCategory, { shouldValidate: true })}>
                        Use {CATEGORY_META[s.suggestedCategory].label}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
                        <Check size={14} weight="bold" aria-hidden /> Matches your choice
                      </span>
                    )}
                  </div>
                  <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
                    <div className="grid content-start gap-1">
                      <dt className="text-xs text-fg-subtle">Category</dt>
                      <dd>
                        <CategoryChip category={s.suggestedCategory} />
                      </dd>
                    </div>
                    <div className="grid content-start gap-1">
                      <dt className="text-xs text-fg-subtle">Department</dt>
                      <dd className="font-semibold text-fg">{s.suggestedDepartmentName}</dd>
                    </div>
                    <div className="grid content-start gap-1">
                      <dt className="text-xs text-fg-subtle">Priority</dt>
                      <dd>
                        <PriorityLabel priority={s.suggestedPriority} />
                      </dd>
                    </div>
                  </dl>
                  <p className="text-[13px] leading-relaxed text-fg-muted">{s.explanation}</p>
                  <p className="text-xs text-fg-subtle">Source: {CLASSIFICATION_SOURCE_LABELS[s.source]}. Advisory only: an administrator confirms the routing.</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-3 text-sm font-semibold text-fg">Category</legend>
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
                      'relative grid min-h-[84px] content-center justify-items-center gap-2 rounded-control border px-2 py-3 text-center text-[13px] font-semibold transition-[border-color,background-color,color,transform] duration-150 active:scale-[0.98]',
                      active ? 'border-accent bg-accent-soft text-fg ring-1 ring-accent' : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
                    )}
                  >
                    {active && (
                      <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-accent-fg" aria-hidden>
                        <Check size={10} weight="bold" />
                      </span>
                    )}
                    <Icon size={22} weight={active ? 'fill' : 'regular'} className={active ? 'text-accent-text' : undefined} aria-hidden />
                    {CATEGORY_META[cat].label}
                  </button>
                );
              })}
            </div>
            {formState.errors.category && <FieldError>{formState.errors.category.message}</FieldError>}
          </fieldset>
        </Step>

        <Step n={3} id="step-photo" title="Add a photo" description="A clear photo helps the department plan the repair. At least one is required." done={steps[2]!.done}>
          <PhotoDropzone
            photos={photos}
            onChange={(p) => {
              setPhotos(p);
              setPhotoError(null);
            }}
            error={photoError}
          />
        </Step>

        <Step n={4} id="step-where" title="Where is it?" description="Tap the map to drop a pin, drag it to adjust, or use your current location." done={steps[3]!.done} last>
          <LocationPicker
            value={location}
            onChange={(la, ln) => {
              setValue('latitude', Number(la.toFixed(6)), { shouldValidate: true });
              setValue('longitude', Number(ln.toFixed(6)), { shouldValidate: true });
            }}
            nearby={nearby.data ?? []}
            className="h-[300px] rounded-control border border-line sm:h-[380px]"
          />
          {location ? (
            <p className="flex items-center gap-2 text-[13px] text-fg-muted">
              <MapPin size={15} weight="fill" className="text-accent-text" aria-hidden />
              Pinned at {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </p>
          ) : formState.errors.latitude ? (
            <FieldError>{formState.errors.latitude.message}</FieldError>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-fg-subtle">
              <MapPin size={15} aria-hidden /> No location selected yet.
            </p>
          )}

          <AnimatePresence>
            {nearby.data && nearby.data.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid gap-3 rounded-control border border-warning/35 bg-warning-soft p-4">
                  <div className="grid gap-0.5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Warning size={16} weight="bold" className="text-warning" aria-hidden /> Already reported nearby?
                    </p>
                    <p className="text-[13px] text-fg-muted">These open reports are close to your pin. If one is the same problem, you can follow it instead. You can still submit yours.</p>
                  </div>
                  <ul className="grid gap-1.5">
                    {nearby.data.map((n) => (
                      <li key={n.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-chip bg-surface px-3 py-2.5">
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate text-[13.5px] font-semibold text-fg">{n.title}</span>
                          <span className="text-xs text-fg-subtle">
                            {n.distanceMeters} m away, {n.trackingId}
                          </span>
                        </span>
                        <StatusBadge status={n.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Field id="address" label="Address or landmark" error={formState.errors.address?.message} hint="For example: MG Road, near metro station exit B">
            <Input maxLength={200} autoComplete="street-address" {...register('address')} />
          </Field>

          {notesOpen ? (
            <Field id="additionalNotes" label="Additional notes" optional error={formState.errors.additionalNotes?.message} hint="Access details, best time to visit, or safety concerns for the crew.">
              <Textarea rows={3} maxLength={1000} {...register('additionalNotes')} />
            </Field>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setNotesOpen(true)}>
              <NotePencil size={16} aria-hidden /> Add notes for the crew (optional)
            </Button>
          )}
        </Step>
      </div>

      {/* Summary and submit: sticky beside the steps on wide screens, after them on small ones. */}
      <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
        <Panel>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 className="type-title text-fg">Your report</h2>
            <span className="text-caption text-fg-subtle tabular">{completed} of 4 done</span>
          </div>
          <ol className="grid gap-1 px-3 py-3">
            {steps.map((st, i) => (
              <li key={st.id}>
                <a href={`#${st.id}`} className="flex min-h-10 items-center gap-3 rounded-control px-2 text-sm transition-colors hover:bg-surface-2">
                  <span
                    className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold', st.done ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong text-fg-subtle')}
                    aria-hidden
                  >
                    {st.done ? <Check size={11} weight="bold" /> : i + 1}
                  </span>
                  <span className={cn('truncate', st.done ? 'font-medium text-fg' : 'text-fg-muted')}>{st.label}</span>
                  <span className="sr-only">{st.done ? 'complete' : 'not complete yet'}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="grid gap-3 border-t border-line p-5">
            {progress !== null && (
              <div className="grid gap-1.5" role="status" aria-live="polite">
                <p className="text-xs font-semibold text-fg-muted">{progress < 1 ? `Uploading photos ${Math.round(progress * 100)}%` : 'Saving your report'}</p>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${Math.max(4, progress * 100)}%` }} transition={{ duration: 0.2 }} />
                </div>
              </div>
            )}
            <Button type="submit" size="lg" loading={submit.isPending} loadingText="Submitting">
              Submit complaint
            </Button>
            <p className="text-xs leading-relaxed text-fg-subtle">
              Your name and contact details are never shown on the public map. Photos are limited to {UPLOAD_LIMITS.maxFiles}, and location data inside them is removed.
            </p>
          </div>
        </Panel>
      </aside>
    </form>
  );
}
