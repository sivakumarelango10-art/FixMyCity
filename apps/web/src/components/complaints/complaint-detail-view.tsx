'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowSquareOut, Copy, EnvelopeSimple, Phone, Sparkle, User } from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  CATEGORY_META,
  CLASSIFICATION_SOURCE_LABELS,
  PRIORITY_LABELS,
  type ComplaintDetail,
  type PublicMapComplaint,
} from '@fixmycity/shared';
import { CategoryChip, DemoTag, PriorityLabel, StatusBadge } from '@/components/common/complaint-meta';
import { PageHeader } from '@/components/common/page';
import { IssuesMap } from '@/components/maps';
import { Button } from '@/components/ui/button';
import { Badge, ErrorState, Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { ApiError, api } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { formatDateTime, timeAgo } from '@/lib/utils';
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
              <Sparkle size={14} /> Re-run
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
              <li key={s} className="rounded-full border border-line px-2 py-0.5 text-[11.5px] font-medium text-fg-muted">
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
        <IssuesMap complaints={[point]} className="h-56 rounded-[12px]" ariaLabel={`Map showing ${complaint.address}`} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-subtle">
          <span className="font-mono">
            {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
          </span>
          <a href={osm} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
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

export function ComplaintDetailView({ id, mode, breadcrumbs }: { id: string; mode: DetailMode; breadcrumbs: { label: string; href?: string }[] }) {
  const query = useComplaint(id);

  if (query.isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-[520px] rounded-[var(--radius-panel)]" />
          <Skeleton className="h-[420px] rounded-[var(--radius-panel)]" />
        </div>
      </div>
    );
  }
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <ErrorState
        className="panel"
        message={notFound ? 'This complaint does not exist or you do not have access to it.' : ((query.error as Error)?.message ?? 'Unknown error')}
        onRetry={notFound ? undefined : () => query.refetch()}
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

  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <button type="button" onClick={copyId} className="inline-flex items-center gap-1.5 rounded-[8px] font-mono text-[13px] font-medium text-fg-muted hover:text-fg" aria-label={`Copy tracking ID ${c.trackingId}`}>
              {c.trackingId} <Copy size={13} />
            </button>
            <StatusBadge status={c.status} />
            {c.isDemo && <DemoTag />}
          </span>
        }
        className="mb-0"
      />

      <Panel className="p-5 sm:p-6">
        <ProgressRail status={c.status} timeline={c.timeline} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid content-start gap-6">
          <Panel>
            <PanelHeader title="Details" />
            <div className="grid gap-5 p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] 2xl:grid-cols-4">
                <div className="grid gap-1">
                  <dt className="text-fg-subtle">Category</dt>
                  <dd>
                    <CategoryChip category={c.category} />
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-fg-subtle">Priority</dt>
                  <dd>
                    <PriorityLabel priority={c.priority} />
                  </dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-fg-subtle">Department</dt>
                  <dd className="font-semibold text-fg">{c.department?.name ?? <span className="font-normal text-fg-subtle">Not assigned yet</span>}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-fg-subtle">Submitted</dt>
                  <dd className="text-fg" title={formatDateTime(c.createdAt)}>
                    {timeAgo(c.createdAt)}
                  </dd>
                </div>
              </dl>
              <div className="grid gap-2">
                <h3 className="text-sm font-bold text-fg">Description</h3>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg-muted">{c.description}</p>
              </div>
              {c.additionalNotes && (
                <div className="grid gap-2">
                  <h3 className="text-sm font-bold text-fg">Additional notes</h3>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{c.additionalNotes}</p>
                </div>
              )}
              <div className="grid gap-2">
                <h3 className="text-sm font-bold text-fg">Photos</h3>
                <PhotoGallery attachments={evidence} title={c.title} />
              </div>
              <p className="text-xs text-fg-subtle">
                {CATEGORY_META[c.category].group}. Last updated {formatDateTime(c.updatedAt)}.
              </p>
            </div>
          </Panel>

          {(c.resolutionSummary || resolution.length > 0) && (
            <Panel className="border-success/30">
              <PanelHeader title="Resolution" description={c.resolvedAt ? `Resolved ${formatDateTime(c.resolvedAt)}` : undefined} />
              <div className="grid gap-4 p-5 sm:p-6">
                {c.resolutionSummary && <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg">{c.resolutionSummary}</p>}
                {resolution.length > 0 && <PhotoGallery attachments={resolution} title={c.title} />}
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Activity" description="Every change is saved with who made it and when." />
            <div className="p-5 sm:p-6">
              <ComplaintTimeline events={c.timeline} staffView={staff} />
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          {mode === 'admin' && c.permissions.canAssign && <AssignPanel key={`${c.id}-${c.department?.id ?? 'none'}`} complaint={c} />}
          {staff && <StatusActions complaint={c} allowPhotos={staff} />}
          {staff && <NoteComposer complaint={c} />}
          {mode === 'citizen' && <CitizenFollowUp complaint={c} />}
          <ClassificationCard complaint={c} mode={mode} />
          <LocationCard complaint={c} />
          {staff && <CitizenContact complaint={c} />}
          {mode === 'citizen' && !c.department && (
            <p className="px-1 text-[12.5px] leading-relaxed text-fg-subtle">
              An administrator reviews new reports and assigns them to a department. Suggested priority: {PRIORITY_LABELS[c.classification?.suggestedPriority ?? c.priority]}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
