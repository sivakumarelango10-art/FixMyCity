'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ImageSquare, Trash, UploadSimple } from '@phosphor-icons/react';
import { UPLOAD_LIMITS } from '@fixmycity/shared';
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
          'grid place-items-center gap-3 rounded-[var(--radius-panel)] border-2 border-dashed px-6 py-8 text-center transition-colors duration-150',
          dragging ? 'border-accent bg-accent-soft' : message ? 'border-danger/50' : 'border-line-strong hover:border-fg-subtle',
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">
          <UploadSimple size={22} weight="bold" />
        </span>
        <div className="grid gap-1">
          <p className="text-[15px] font-semibold text-fg">Drag photos here or</p>
          <button type="button" onClick={() => inputRef.current?.click()} className="mx-auto text-[15px] font-bold text-accent hover:underline">
            choose from your device
          </button>
        </div>
        <p className="text-[12.5px] text-fg-subtle">
          JPEG, PNG or WebP, up to {UPLOAD_LIMITS.maxFileBytes / MB} MB each, {UPLOAD_LIMITS.maxFiles} photos max. Location data inside photos is removed.
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
      {message && (
        <p id={`${id}-error`} role="alert" className="text-[13px] font-medium text-danger">
          {message}
        </p>
      )}
      <ul className="grid grid-cols-3 gap-3" aria-label="Selected photos">
        <AnimatePresence initial={false}>
          {photos.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.2 }}
              className="group relative overflow-hidden rounded-[14px] border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={p.preview} alt={`Selected photo ${p.file.name}`} className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-[#050817]/70 text-white backdrop-blur transition-opacity hover:bg-[#050817]/90"
                aria-label={`Remove ${p.file.name}`}
              >
                <Trash size={15} />
              </button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[#050817]/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] text-white">
                {(p.file.size / MB).toFixed(1)} MB
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
        {photos.length === 0 && (
          <li className="col-span-3 flex items-center gap-2 text-[13px] text-fg-subtle">
            <ImageSquare size={16} /> At least one photo is required.
          </li>
        )}
      </ul>
    </div>
  );
}
