'use client';

import * as React from 'react';
import Link from 'next/link';
import { CaretDown } from '@phosphor-icons/react';
import { ROLE_LABELS, type AuditLogDto } from '@fixmycity/shared';
import { Skeleton } from '@/components/ui/primitives';
import { cn, formatDateTime, timeAgo } from '@/lib/utils';

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.login_failed': 'Failed sign-in attempt',
  'auth.register': 'Registered an account',
  'auth.password_reset_requested': 'Requested a password reset',
  'auth.password_reset': 'Reset their password',
  'complaint.created': 'Submitted a complaint',
  'complaint.assigned': 'Assigned a complaint',
  'complaint.reassigned': 'Reassigned a complaint',
  'complaint.status_changed': 'Changed complaint status',
  'complaint.note_added': 'Added a note',
  'complaint.reopened': 'Reopened a complaint',
  'complaint.feedback': 'Rated a resolution',
  'complaint.resolution_photos': 'Added resolution photos',
  'complaint.reclassified': 'Re-ran classification',
  'utility.demo_payment': 'Made a demo payment',
  'announcement.created': 'Created an announcement',
  'announcement.updated': 'Edited an announcement',
  'announcement.published': 'Published an announcement',
  'announcement.unpublished': 'Unpublished an announcement',
  'announcement.archived': 'Archived an announcement',
  'announcement.deleted': 'Deleted a draft announcement',
  'department.created': 'Created a department',
  'department.updated': 'Edited a department',
  'user.staff_created': 'Created a staff account',
  'user.updated': 'Changed a user account',
  'user.profile_updated': 'Updated their profile',
  'user.password_changed': 'Changed their password',
  'user.session_revoked': 'Signed out a device',
};

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

function entityLink(e: AuditLogDto): string | null {
  if (e.entityType === 'complaint' && e.entityId) return `/admin/complaints/${e.entityId}`;
  return null;
}

function summary(e: AuditLogDto): string | null {
  const m = e.metadata ?? {};
  const parts: string[] = [];
  if (typeof m.trackingId === 'string') parts.push(m.trackingId);
  if (typeof m.department === 'string') parts.push(`to ${m.department}`);
  if (typeof m.from === 'string' && typeof m.to === 'string') parts.push(`${m.from.replace('_', ' ').toLowerCase()} to ${m.to.replace('_', ' ').toLowerCase()}`);
  if (typeof m.title === 'string') parts.push(`"${m.title}"`);
  if (typeof m.referenceNumber === 'string') parts.push(m.referenceNumber);
  if (typeof m.name === 'string' && e.entityType === 'department') parts.push(m.name);
  return parts.length ? parts.join(', ') : null;
}

export function AuditRow({ e, expandable }: { e: AuditLogDto; expandable?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const link = entityLink(e);
  const detail = summary(e);
  return (
    <li className="rounded-control px-3 py-3 transition-colors hover:bg-surface-2/70">
      <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-4">
        <div className="grid min-w-0 gap-0.5">
          <p className="text-[13.5px] text-fg">
            <span className="font-semibold">{e.actor?.name ?? 'System'}</span>
            {e.actor && <span className="text-fg-subtle"> ({ROLE_LABELS[e.actor.role].toLowerCase()})</span>} {actionLabel(e.action).toLowerCase()}
          </p>
          {detail &&
            (link ? (
              <Link href={link} className="truncate text-[12.5px] font-medium text-accent hover:underline">
                {detail}
              </Link>
            ) : (
              <p className="truncate text-[12.5px] text-fg-muted">{detail}</p>
            ))}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <time dateTime={e.createdAt} title={formatDateTime(e.createdAt)} className="text-xs text-fg-subtle">
            {timeAgo(e.createdAt)}
          </time>
          {expandable && e.metadata && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-[11.5px] font-semibold text-fg-subtle hover:bg-surface-3 hover:text-fg"
            >
              Details <CaretDown size={11} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>
      {open && (
        <pre className="relative mt-2 overflow-x-auto rounded-control bg-surface-2 p-3 font-mono text-[11.5px] leading-relaxed text-fg-muted">
          {JSON.stringify({ action: e.action, entity: `${e.entityType}${e.entityId ? `:${e.entityId}` : ''}`, ...e.metadata }, null, 2)}
        </pre>
      )}
    </li>
  );
}

export function AuditList({ entries, loading, expandable }: { entries: AuditLogDto[]; loading?: boolean; expandable?: boolean }) {
  if (loading)
    return (
      <div className="grid gap-2 p-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  if (entries.length === 0) return <p className="p-3 text-sm text-fg-subtle">No activity recorded yet.</p>;
  return (
    <ul className="grid gap-0.5">
      {entries.map((e) => (
        <AuditRow key={e.id} e={e} expandable={expandable} />
      ))}
    </ul>
  );
}
