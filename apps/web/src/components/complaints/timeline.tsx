'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ChatCircleText, Check, LockSimple, Signpost, Star } from '@phosphor-icons/react';
import {
  ROLE_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  STATUS_PROGRESSION,
  type ComplaintStatus,
  type TimelineEvent,
} from '@fixmycity/shared';
import { STATUS_ICONS, STATUS_STYLES, StatusBadge } from '@/components/common/complaint-meta';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';

/*
 * The route: every report travels the same line of stations,
 * Submitted > Assigned > In progress > Resolved. Under review sits at the
 * first station, a reopened report returns to the work stage, and a
 * rejected report leaves the line.
 */
export function routePosition(status: ComplaintStatus) {
  const offTrack = status === 'REJECTED';
  const effective: ComplaintStatus = status === 'UNDER_REVIEW' ? 'SUBMITTED' : status === 'REOPENED' ? 'ASSIGNED' : status;
  const index = offTrack ? -1 : Math.max(0, STATUS_PROGRESSION.indexOf(effective));
  return { offTrack, index, total: STATUS_PROGRESSION.length };
}

/** Full route with stations, labels and when each was reached. */
export function ProgressRail({ status, timeline }: { status: ComplaintStatus; timeline: TimelineEvent[] }) {
  const reduce = useReducedMotion();
  const { offTrack, index } = routePosition(status);
  const last = STATUS_PROGRESSION.length - 1;
  const reachedAt = (s: ComplaintStatus) => [...timeline].reverse().find((e) => e.toStatus === s)?.createdAt;
  const fill = offTrack ? 0 : index / last;

  return (
    <div className="grid gap-4">
      <ol className="relative grid grid-cols-4" aria-label="Complaint progress">
        {/* Track runs between the first and last station centres. */}
        <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[15px] h-1 rounded-full bg-surface-3">
          <motion.span
            className="absolute inset-0 origin-left rounded-full bg-accent"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: fill }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        </span>
        {STATUS_PROGRESSION.map((s, i) => {
          const done = !offTrack && i < index;
          const current = !offTrack && i === index;
          const Icon = STATUS_ICONS[s];
          const at = reachedAt(s);
          return (
            <li key={s} className="relative grid justify-items-center gap-2 text-center" aria-current={current ? 'step' : undefined}>
              <span className="relative grid h-[34px] w-[34px] place-items-center">
                {current && s !== 'RESOLVED' && <span aria-hidden className="station-pulse absolute inset-1 rounded-full bg-accent/40 motion-safe:animate-[station-pulse_2.2s_cubic-bezier(0.16,1,0.3,1)_infinite]" />}
                <span
                  className={cn(
                    'relative grid place-items-center rounded-full border-2 transition-colors',
                    current ? 'h-[34px] w-[34px] border-accent bg-accent text-accent-fg' : 'h-6 w-6',
                    done && 'border-accent bg-accent text-accent-fg',
                    !done && !current && 'border-line-strong bg-surface text-fg-subtle',
                  )}
                >
                  {current ? <Icon size={16} weight="bold" aria-hidden /> : done ? <Check size={12} weight="bold" aria-hidden /> : null}
                </span>
              </span>
              <span className={cn('text-[13px] font-semibold leading-tight', done || current ? 'text-fg' : 'text-fg-subtle')}>
                {STATUS_LABELS[s]}
                <span className="sr-only">{current ? ', current stage' : done ? ', completed' : ', not reached yet'}</span>
              </span>
              <span className="min-h-4 text-xs leading-tight text-fg-subtle">{at ? <time dateTime={at} title={formatDateTime(at)}>{timeAgo(at)}</time> : null}</span>
            </li>
          );
        })}
      </ol>
      {(status === 'REJECTED' || status === 'REOPENED' || status === 'UNDER_REVIEW') && (
        <p className="flex flex-wrap items-center justify-center gap-2 text-[13px] text-fg-muted">
          <StatusBadge status={status} size="sm" /> {STATUS_DESCRIPTIONS[status]}
        </p>
      )}
    </div>
  );
}

/** Four-station route in miniature, for lists and cards. */
export function MiniRoute({ status, className }: { status: ComplaintStatus; className?: string }) {
  const { offTrack, index, total } = routePosition(status);
  return (
    <span className={cn('inline-flex items-center', className)} role="img" aria-label={offTrack ? 'Closed without action' : `Stage ${index + 1} of ${total}: ${STATUS_LABELS[STATUS_PROGRESSION[index]!]}`}>
      {STATUS_PROGRESSION.map((s, i) => (
        <span key={s} className="flex items-center">
          {i > 0 && <span className={cn('h-0.5 w-4 sm:w-6', !offTrack && i <= index ? 'bg-accent' : 'bg-line-strong')} />}
          <span
            className={cn(
              'rounded-full',
              i === index && !offTrack ? 'h-2.5 w-2.5 bg-accent ring-[3px] ring-accent-soft' : 'h-2 w-2',
              i < index && !offTrack ? 'bg-accent' : i > index || offTrack ? 'border border-line-strong bg-surface' : '',
            )}
          />
        </span>
      ))}
    </span>
  );
}

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.type === 'STATUS' && event.toStatus) {
    const Icon = STATUS_ICONS[event.toStatus];
    const s = STATUS_STYLES[event.toStatus];
    return (
      <span className={cn('relative grid h-8 w-8 place-items-center rounded-full border bg-surface', s.border, s.text)}>
        <span className={cn('absolute inset-0 rounded-full', s.bg)} aria-hidden />
        <Icon size={15} weight="bold" className="relative" />
      </span>
    );
  }
  const map = {
    ASSIGNMENT: { icon: Signpost, cls: 'border-st-assigned/30 text-st-assigned bg-surface' },
    NOTE: { icon: event.visibility === 'INTERNAL' ? LockSimple : ChatCircleText, cls: 'border-line bg-surface-2 text-fg-muted' },
    FEEDBACK: { icon: Star, cls: 'border-warning/30 bg-warning-soft text-warning' },
    STATUS: { icon: Check, cls: 'border-line bg-surface-2 text-fg-muted' },
  } as const;
  const { icon: Icon, cls } = map[event.type];
  return (
    <span className={cn('grid h-8 w-8 place-items-center rounded-full border', cls)}>
      <Icon size={15} weight="bold" />
    </span>
  );
}

function describe(event: TimelineEvent): { title: string; body?: string | null } {
  switch (event.type) {
    case 'STATUS':
      if (event.toStatus === 'SUBMITTED') return { title: 'Complaint submitted', body: null };
      return { title: `Status changed to ${STATUS_LABELS[event.toStatus!]}`, body: event.body };
    case 'ASSIGNMENT':
      return {
        title: event.previousDepartment ? `Reassigned to ${event.department?.name}` : `Assigned to ${event.department?.name}`,
        body: event.body,
      };
    case 'NOTE':
      return { title: event.visibility === 'INTERNAL' ? 'Internal note' : 'Progress update', body: event.body };
    case 'FEEDBACK':
      return { title: `Citizen rated the resolution ${event.rating} of 5`, body: event.body };
  }
}

/** Chronological activity feed built from persisted history. Newest last, matching how the work happened. */
export function ComplaintTimeline({ events, staffView = false }: { events: TimelineEvent[]; staffView?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <ol className="relative grid gap-0" aria-label="Activity timeline">
      {events.map((event, i) => {
        const { title, body } = describe(event);
        const last = i === events.length - 1;
        return (
          <motion.li
            key={event.id}
            className="relative grid grid-cols-[32px_1fr] gap-4 pb-7 last:pb-0"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : Math.min(i, 10) * 0.04, ease: [0.16, 1, 0.3, 1] }}
          >
            {!last && <span className="absolute bottom-0 left-[15.5px] top-9 w-px bg-line" aria-hidden />}
            <EventIcon event={event} />
            <div className="grid gap-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold text-fg">
                  {title}
                  {event.type === 'NOTE' && event.visibility === 'INTERNAL' && staffView && (
                    <span className="ml-2 rounded-chip border border-line px-1.5 py-px align-middle text-[11px] font-semibold text-fg-subtle">Staff only</span>
                  )}
                </p>
                <time dateTime={event.createdAt} className="text-xs text-fg-subtle tabular" title={formatDateTime(event.createdAt)}>
                  {formatDateTime(event.createdAt)}
                </time>
              </div>
              {event.actor && (
                <p className="text-caption text-fg-subtle">
                  {event.actor.name}, {ROLE_LABELS[event.actor.role].toLowerCase()}
                </p>
              )}
              {body && <p className="mt-1.5 whitespace-pre-line rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed text-fg-muted">{body}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
