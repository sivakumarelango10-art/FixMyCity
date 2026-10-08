'use client';

import * as React from 'react';
import { ImageBroken } from '@phosphor-icons/react';
import type { AttachmentDto, ComplaintCategory } from '@fixmycity/shared';
import { CATEGORY_COLORS, CategoryIcon } from '@/components/common/complaint-meta';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/*
 * Complaint photos are private: they are served by the API only to users who may
 * view the complaint, using the session cookie. The Next.js image optimizer
 * fetches server-side without that cookie, so plain <img> elements are used.
 */

export function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div className={cn('grid place-items-center bg-surface-2 text-fg-subtle', className)} role="img" aria-label={`${alt} (could not be loaded)`}>
        <ImageBroken size={22} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- private, cookie-authenticated image; see note above
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={cn('object-cover', className)} />;
}

export function ComplaintThumb({ src, category, title, className }: { src: string | null; category: ComplaintCategory; title: string; className?: string }) {
  if (src) return <AuthImage src={src} alt={`Photo for ${title}`} className={cn('rounded-[12px]', className)} />;
  return (
    <div
      className={cn('grid place-items-center rounded-[12px]', className)}
      style={{ background: `${CATEGORY_COLORS[category]}1f`, color: CATEGORY_COLORS[category] }}
      role="img"
      aria-label="No photo attached"
    >
      <CategoryIcon category={category} size={22} />
    </div>
  );
}

export function PhotoGallery({ attachments, title }: { attachments: AttachmentDto[]; title: string }) {
  const [open, setOpen] = React.useState<AttachmentDto | null>(null);
  if (attachments.length === 0) {
    return <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-subtle">No photos attached to this record.</p>;
  }
  return (
    <>
      <ul className={cn('grid gap-3', attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3')}>
        {attachments.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpen(a)}
              className="group relative block w-full overflow-hidden rounded-[14px] border border-line focus-visible:outline-2"
              aria-label={`Open ${a.kind === 'RESOLUTION' ? 'resolution' : 'evidence'} photo ${i + 1}`}
            >
              <AuthImage
                src={a.url}
                alt={`${a.kind === 'RESOLUTION' ? 'Resolution' : 'Evidence'} photo ${i + 1} for ${title}`}
                className={cn('w-full transition-transform duration-300 group-hover:scale-[1.02]', attachments.length === 1 ? 'aspect-[16/10]' : 'aspect-square')}
              />
            </button>
            <p className="mt-1.5 text-xs text-fg-subtle">{a.kind === 'RESOLUTION' ? 'Resolution photo' : 'Submitted by citizen'}</p>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent title={open.kind === 'RESOLUTION' ? 'Resolution photo' : 'Evidence photo'} className="max-w-4xl">
            <AuthImage src={open.url} alt={`Full size photo for ${title}`} className="max-h-[75dvh] w-full rounded-[12px] object-contain" />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
