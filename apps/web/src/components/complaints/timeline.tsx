'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ChatCircleText, Check, LockSimple, Signpost, Star } from '@phosphor-icons/react';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_PROGRESSION,
  type ComplaintStatus,
  type TimelineEvent,
} from '@fixmycity/shared';
import { STATUS_ICONS, STATUS_STYLES, StatusBadge } from '@/components/common/complaint-meta';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';

/** Submitted, Assigned, In progress, Resolved with the current position highlighted. */
export function ProgressRail({ status, timeline }: { status: ComplaintStatus; timeline: TimelineEvent[] }) {
  const reduce = useReducedMotion();
  const offTrack = status === 'REJECTED';
  // Under review sits between submitted and assigned; reopened returns to the work stage.
  const effective: ComplaintStatus = status === 'UNDER_REVIEW' ? 'SUBMITTED' : status === 'REOPENED' ? 'ASSIGNED' : status;
  const currentIndex = offTrack ? 0 : Math.max(0, STATUS_PROGRESSION.indexOf(effective));
  const reachedAt = (s: ComplaintStatus) => {
    const hit = [...timeline].reverse().find((e) => e.toStatus === s);
    return hit?.createdAt;
  };

  return (
    <div className="grid gap-3">
      <ol className="grid grid-cols-4 gap-2" aria-label="Complaint progress">
        {STATUS_PROGRESSION.map((s, i) => {
          const done = !offTrack && i <= currentIndex;
          const current = !offTrack && i === currentIndex;
          const Icon = STATUS_ICONS[s];
          const at = reachedAt(s);
          return (
            <li key={s} className="grid content-start gap-2" aria-current={current ? 'step' : undefined}>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-surface-3">
                <motion.span
                  className={cn('absolute inset-y-0 left-0 rounded-full', done ? 'bg-accent' : 'bg-transparent')}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: done ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Icon size={14} weight={done ? 'fill' : 'regular'} className={done ? 'text-accent' : 'text-fg-subtle'} aria-hidden />
                <span className={cn('text-[12.5px] font-semibold', done ? 'text-fg' : 'text-fg-subtle')}>{STATUS_LABELS[s]}</span>
              </div>
              <span className="hidden text-[11.5px] text-fg-subtle sm:block">{at ? timeAgo(at) : ' '}</span>
            </li>
          );
        })}
      </ol>
      {(status === 'REJECTED' || status === 'REOPENED' || status === 'UNDER_REVIEW') && (
        <p className="text-[13px] text-fg-muted">
          Current status: <StatusBadge status={status} size="sm" />
        </p>
      )}
    </div>
  );
}

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.type === 'STATUS' && event.toStatus) {
    const Icon = STATUS_ICONS[event.toStatus];
    const s = STATUS_STYLES[event.toStatus];
    return (
      <span className={cn('grid h-8 w-8 place-items-center rounded-full border', s.bg, s.border, s.text)}>
        <Icon size={15} weight="bold" />
      </span>
    );
  }
  const map = {
    ASSIGNMENT: { icon: Signpost, cls: 'bg-st-assigned/12 border-st-assigned/30 text-st-assigned' },
    NOTE: { icon: event.visibility === 'INTERNAL' ? LockSimple : ChatCircleText, cls: 'bg-surface-2 border-line text-fg-muted' },
    FEEDBACK: { icon: Star, cls: 'bg-warning-soft border-warning/30 text-warning' },
    STATUS: { icon: Check, cls: 'bg-surface-2 border-line text-fg-muted' },
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
            className="relative grid grid-cols-[32px_1fr] gap-4 pb-6 last:pb-0"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: reduce ? 0 : Math.min(i, 10) * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            {!last && <span className="absolute left-[15.5px] top-9 bottom-1 w-px bg-line" aria-hidden />}
            <EventIcon event={event} />
            <div className="grid gap-1 pt-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-[14px] font-bold text-fg">
                  {title}
                  {event.type === 'NOTE' && event.visibility === 'INTERNAL' && staffView && (
                    <span className="ml-2 rounded-full border border-line px-1.5 py-px text-[10.5px] font-semibold text-fg-subtle">Staff only</span>
                  )}
                </p>
                <time dateTime={event.createdAt} className="text-xs text-fg-subtle" title={formatDateTime(event.createdAt)}>
                  {formatDateTime(event.createdAt)}
                </time>
              </div>
              {event.actor && (
                <p className="text-[12.5px] text-fg-subtle">
                  {event.actor.name}, {ROLE_LABELS[event.actor.role].toLowerCase()}
                </p>
              )}
              {body && <p className="mt-1 whitespace-pre-line rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg-muted">{body}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
