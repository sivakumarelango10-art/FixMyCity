'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react';
import { UPLOAD_LIMITS } from '@fixmycity/shared';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export interface PickedPhoto {
  id: string;
  file: File;
  preview: string;
}

const MB = 1024 * 1024;

export function validatePhoto(file: File): string | null {
  if (!UPLOAD_LIMITS.allowedMimeTypes.includes(file.type)) return `"${file.name}" is not a JPEG, PNG or WebP image.`;
  if (file.size > UPLOAD_LIMITS.maxFileBytes) return `"${file.name}" is larger than ${UPLOAD_LIMITS.maxFileBytes / MB} MB.`;
  return null;
}

/** Drag-and-drop or click-to-pick image input with previews. Object URLs are revoked on removal and unmount. */
export function PhotoDropzone({
  photos,
  onChange,
  error,
  id = 'photos',
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  error?: string | null;
  id?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  // Track the latest previews so object URLs can be released when the form unmounts.
  const latest = React.useRef(photos);
  React.useEffect(() => {
    latest.current = photos;
  }, [photos]);
  React.useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const add = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const room = UPLOAD_LIMITS.maxFiles - photos.length;
    const problems: string[] = [];
    const accepted: PickedPhoto[] = [];
    for (const file of incoming) {
      const problem = validatePhoto(file);
      if (problem) problems.push(problem);
      else if (accepted.length < room) accepted.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, preview: URL.createObjectURL(file) });
      else problems.push(`Only ${UPLOAD_LIMITS.maxFiles} photos can be attached.`);
    }
    setLocalError(problems[0] ?? null);
    if (accepted.length) onChange([...photos, ...accepted]);
  };

  const remove = (photoId: string) => {
    const target = photos.find((p) => p.id === photoId);
    if (target) URL.revokeObjectURL(target.preview);
    onChange(photos.filter((p) => p.id !== photoId));
  };

  const message = localError ?? error;

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) add(e.dataTransfer.files);
        }}
        className={cn(
          'grid place-items-center gap-3 rounded-control border-2 border-dashed px-5 py-8 text-center transition-colors duration-150',
          dragging ? 'border-accent bg-accent-soft' : message ? 'border-danger/50 bg-danger-soft' : 'border-line-strong bg-surface-2/50 hover:border-fg-subtle',
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-control border border-line bg-surface text-accent-text" aria-hidden>
          <UploadSimple size={22} weight="bold" />
        </span>
        <div className="grid gap-2">
          <p className="text-[15px] font-semibold text-fg">Drag photos here</p>
          <Button type="button" variant="secondary" size="sm" className="mx-auto" onClick={() => inputRef.current?.click()}>
            <Camera size={16} aria-hidden /> Take or choose a photo
          </Button>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-fg-subtle">
          JPEG, PNG or WebP, up to {UPLOAD_LIMITS.maxFileBytes / MB} MB each, {UPLOAD_LIMITS.maxFiles} photos at most. Location data inside photos is removed.
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={UPLOAD_LIMITS.allowedMimeTypes.join(',')}
          multiple
          capture="environment"
          className="sr-only"
          aria-describedby={message ? `${id}-error` : undefined}
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {message && <FieldError id={`${id}-error`}>{message}</FieldError>}
      <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Selected photos">
        <AnimatePresence initial={false}>
          {photos.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-control border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={p.preview} alt={`Selected photo ${p.file.name}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-[#172322]/75 text-white transition-colors hover:bg-[#172322]/90"
                aria-label={`Remove ${p.file.name}`}
              >
                <Trash size={15} />
              </button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-[#172322]/80 px-2 py-1 text-[11px] font-medium text-white">
                {(p.file.size / MB).toFixed(1)} MB
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {photos.length === 0 && (
          <li className="col-span-3 flex items-center gap-2 text-[13px] text-fg-subtle">
            <ImageSquare size={16} aria-hidden /> No photo attached yet.
          </li>
        )}
      </ul>
    </div>
  );
}
