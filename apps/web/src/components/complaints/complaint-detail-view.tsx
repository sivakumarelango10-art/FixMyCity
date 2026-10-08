'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowsClockwise, ArrowSquareOut, Copy, EnvelopeSimple, Phone, User } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  CATEGORY_META,
  CLASSIFICATION_SOURCE_LABELS,
  PRIORITY_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type ComplaintDetail,
  type PublicMapComplaint,
} from '@fixmycity/shared';
import { CategoryChip, DemoTag, PriorityLabel, STATUS_ICONS, STATUS_STYLES, StatusBadge } from '@/components/common/complaint-meta';
import { PageHeader } from '@/components/common/page';
import { IssuesMap } from '@/components/maps';
import { Button } from '@/components/ui/button';
import { Badge, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import Link from 'next/link';
import { ApiError, api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';
import { AssignPanel, CitizenFollowUp, NoteComposer, StatusActions, useReclassify } from './complaint-actions';
import { PhotoGallery } from './complaint-media';
import { ComplaintTimeline, ProgressRail } from './timeline';

export type DetailMode = 'citizen' | 'admin' | 'officer';

export function useComplaint(id: string) {
  return useQuery({
    queryKey: qk.complaint(id),
    queryFn: () => api.get<ComplaintDetail>(`/api/complaints/${id}`),
    // Realtime events invalidate this; polling is the fallback when the socket is down.
    refetchInterval: 30_000,
  });
}

function ClassificationCard({ complaint, mode }: { complaint: ComplaintDetail; mode: DetailMode }) {
  const c = complaint.classification;
  const reclassify = useReclassify(complaint.id);
  if (!c) return null;
  const outcome = { PENDING: 'Awaiting review', ACCEPTED: 'Accepted by administrator', OVERRIDDEN: 'Overridden by administrator' }[c.reviewOutcome];
  return (
    <Panel>
      <PanelHeader
        title="Suggested routing"
        description={`${CLASSIFICATION_SOURCE_LABELS[c.source]}${c.model ? ` (${c.model})` : ''}. Advisory only.`}
        action={
          mode === 'admin' ? (
            <Button size="sm" variant="ghost" loading={reclassify.isPending} onClick={() => reclassify.mutate()}>
              <ArrowsClockwise size={14} /> Re-run
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-4 p-5 sm:p-6">
        <dl className="grid gap-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">Category</dt>
            <dd>
              <CategoryChip category={c.suggestedCategory} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">Department</dt>
            <dd className="text-right font-semibold text-fg">{c.suggestedDepartment?.name ?? c.suggestedDepartmentCode}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fg-subtle">Priority</dt>
            <dd>
              <PriorityLabel priority={c.suggestedPriority} />
            </dd>
          </div>
        </dl>
        <p className="text-[13px] leading-relaxed text-fg-muted">{c.explanation}</p>
        {c.signals.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Signals found in the text">
            {c.signals.map((s) => (
              <li key={s} className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-[11.5px] font-medium text-fg-muted">
                {s}
              </li>
            ))}
          </ul>
        )}
        {mode !== 'citizen' && <Badge tone={c.reviewOutcome === 'PENDING' ? 'warning' : c.reviewOutcome === 'ACCEPTED' ? 'success' : 'neutral'}>{outcome}</Badge>}
      </div>
    </Panel>
  );
}

function LocationCard({ complaint }: { complaint: ComplaintDetail }) {
  const point: PublicMapComplaint = {
    id: complaint.id,
    trackingId: complaint.trackingId,
    title: complaint.title,
    category: complaint.category,
    status: complaint.status,
    latitude: complaint.latitude,
    longitude: complaint.longitude,
    address: complaint.address,
    createdAt: complaint.createdAt,
    isDemo: complaint.isDemo,
    isMine: false,
  };
  const osm = `https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=18/${complaint.latitude}/${complaint.longitude}`;
  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Location" description={complaint.address} />
      <div className="grid gap-3 p-4 sm:p-5">
        <IssuesMap complaints={[point]} scrollZoom={false} className="h-56 rounded-control border border-line" ariaLabel={`Map showing ${complaint.address}`} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <span className="font-mono">
            {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
          </span>
          <a href={osm} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
            Open in OpenStreetMap <ArrowSquareOut size={12} />
          </a>
        </div>
      </div>
    </Panel>
  );
}

function CitizenContact({ complaint }: { complaint: ComplaintDetail }) {
  if (!complaint.citizenContact) return null;
  const c = complaint.citizenContact;
  return (
    <Panel>
      <PanelHeader title="Reported by" description="Shown to staff working on this complaint only." />
      <ul className="grid gap-2.5 p-5 text-[13.5px] sm:p-6">
        <li className="flex items-center gap-2.5 text-fg">
          <User size={16} className="text-fg-subtle" /> {c.name}
        </li>
        <li className="flex items-center gap-2.5 text-fg-muted">
          <EnvelopeSimple size={16} className="text-fg-subtle" /> {c.email}
        </li>
        {c.phone && (
          <li className="flex items-center gap-2.5 text-fg-muted">
            <Phone size={16} className="text-fg-subtle" /> {c.phone}
          </li>
        )}
      </ul>
    </Panel>
  );
}

/** "Where is my complaint right now?": the current stage in words, who has it, and the route. */
function WhereNow({ complaint: c }: { complaint: ComplaintDetail }) {
  const Icon = STATUS_ICONS[c.status];
  const st = STATUS_STYLES[c.status];
  const lastChange = [...c.timeline].reverse().find((e) => e.type === 'STATUS' || e.type === 'ASSIGNMENT');
  const holder =
    c.status === 'RESOLVED'
      ? c.department
        ? `Resolved by ${c.department.name}`
        : 'Resolved'
      : c.status === 'REJECTED'
        ? 'Closed by the municipal administration'
        : c.department
          ? `With ${c.department.name}`
          : 'Waiting for a municipal administrator to assign it';
  return (
    <section aria-labelledby="where-now" className="panel grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-10">
      <div className="flex items-start gap-4">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-panel border', st.border, st.bg, st.text)} aria-hidden>
          <Icon size={22} weight="bold" />
        </span>
        <div className="grid min-w-0 gap-1">
          <p id="where-now" className="text-xs font-semibold text-fg-subtle">
            Where it is now
          </p>
          <p className="text-xl font-semibold tracking-[-0.02em] text-fg">{STATUS_LABELS[c.status]}</p>
          <p className="text-sm text-fg-muted">{holder}</p>
          <p className="text-caption text-fg-subtle">
            {STATUS_DESCRIPTIONS[c.status]}
            {lastChange ? ` Last change ${timeAgo(lastChange.createdAt)}.` : ''}
          </p>
        </div>
      </div>
      <ProgressRail status={c.status} timeline={c.timeline} />
    </section>
  );
}

export function ComplaintDetailView({ id, mode, breadcrumbs }: { id: string; mode: DetailMode; breadcrumbs: { label: string; href?: string }[] }) {
  const query = useComplaint(id);

  if (query.isLoading) {
    return (
      <div className="grid gap-6" role="status" aria-label="Loading complaint">
        <div className="grid gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-6 w-64" />
        </div>
        <Skeleton className="h-36 rounded-panel" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-[480px] rounded-panel" />
          <Skeleton className="h-[360px] rounded-panel" />
        </div>
      </div>
    );
  }
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <ErrorState
        className="panel"
        title={notFound ? 'This complaint is not available' : 'This complaint could not be loaded'}
        message={notFound ? 'It does not exist, or your account does not have access to it.' : ((query.error as Error)?.message ?? 'Unknown error')}
        onRetry={notFound ? undefined : () => query.refetch()}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={breadcrumbs[breadcrumbs.length - 2]?.href ?? '/'}>Back to the list</Link>
          </Button>
        }
      />
    );
  }

  const c = query.data;
  const evidence = c.attachments.filter((a) => a.kind === 'EVIDENCE');
  const resolution = c.attachments.filter((a) => a.kind === 'RESOLUTION');
  const staff = mode !== 'citizen';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(c.trackingId);
      toast.success('Tracking ID copied');
    } catch {
      toast.error('Could not copy. Select the ID and copy it manually.');
    }
  };

  const details = (
    <Panel key="details">
      <PanelHeader title="Details" />
      <div className="grid gap-6 p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] 2xl:grid-cols-4">
          <div className="grid content-start gap-1.5">
            <dt className="text-xs text-fg-subtle">Category</dt>
            <dd>
              <CategoryChip category={c.category} />
            </dd>
          </div>
          <div className="grid content-start gap-1.5">
            <dt className="text-xs text-fg-subtle">Priority</dt>
            <dd>
              <PriorityLabel priority={c.priority} />
            </dd>
          </div>
          <div className="grid content-start gap-1.5">
            <dt className="text-xs text-fg-subtle">Department</dt>
            <dd className="font-semibold text-fg">{c.department?.name ?? <span className="font-normal text-fg-subtle">Not assigned yet</span>}</dd>
          </div>
          <div className="grid content-start gap-1.5">
            <dt className="text-xs text-fg-subtle">Submitted</dt>
            <dd className="text-fg" title={formatDateTime(c.createdAt)}>
              {timeAgo(c.createdAt)}
            </dd>
          </div>
        </dl>
        <div className="grid gap-2 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-fg">Description</h3>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg-muted">{c.description}</p>
        </div>
        {c.additionalNotes && (
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold text-fg">Additional notes</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{c.additionalNotes}</p>
          </div>
        )}
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold text-fg">Photos</h3>
          <PhotoGallery attachments={evidence} title={c.title} />
        </div>
        <p className="text-xs text-fg-subtle">
          {CATEGORY_META[c.category].group}. Last updated {formatDateTime(c.updatedAt)}.
        </p>
      </div>
    </Panel>
  );

  const resolutionPanel = (c.resolutionSummary || resolution.length > 0) && (
    <Panel key="resolution" className="border-success/35">
      <PanelHeader title="Resolution" description={c.resolvedAt ? `Resolved ${formatDateTime(c.resolvedAt)}` : undefined} />
      <div className="grid gap-4 p-5 sm:p-6">
        {c.resolutionSummary && <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg">{c.resolutionSummary}</p>}
        {resolution.length > 0 && <PhotoGallery attachments={resolution} title={c.title} />}
      </div>
    </Panel>
  );

  const activity = (
    <Panel key="activity">
      <PanelHeader title="Activity" description="Every change is saved with who made it and when." />
      <div className="p-5 sm:p-6">
        <ComplaintTimeline events={c.timeline} staffView={staff} />
      </div>
    </Panel>
  );

  // Citizens come back to see progress, so updates lead; staff start from the evidence.
  const main = staff ? [details, resolutionPanel, activity] : [resolutionPanel, activity, details];

  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              onClick={copyId}
              className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-line bg-surface px-2 font-mono text-[13px] font-medium text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              aria-label={`Copy tracking ID ${c.trackingId}`}
            >
              {c.trackingId} <Copy size={13} aria-hidden />
            </button>
            <StatusBadge status={c.status} />
            {c.isDemo && <DemoTag />}
            <span className="text-[13px] text-fg-subtle">Reported {timeAgo(c.createdAt)}</span>
          </span>
        }
        className="mb-0"
      />

      <WhereNow complaint={c} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-6">{main}</div>

        <div className="grid min-w-0 content-start gap-6">
          {mode === 'admin' && c.permissions.canAssign && <AssignPanel key={`${c.id}-${c.department?.id ?? 'none'}`} complaint={c} />}
          {staff && <StatusActions complaint={c} allowPhotos={staff} />}
          {staff && <NoteComposer complaint={c} />}
          {mode === 'citizen' && <CitizenFollowUp complaint={c} />}
          <ClassificationCard complaint={c} mode={mode} />
          <LocationCard complaint={c} />
          {staff && <CitizenContact complaint={c} />}
          {mode === 'citizen' && !c.department && (
            <p className="px-1 text-caption leading-relaxed text-fg-subtle">
              An administrator reviews new reports and assigns them to a department. Suggested priority: {PRIORITY_LABELS[c.classification?.suggestedPriority ?? c.priority]}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
