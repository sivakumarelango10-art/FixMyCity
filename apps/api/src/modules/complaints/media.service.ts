import { randomUUID } from 'node:crypto';
import multer from 'multer';
import sharp from 'sharp';
import { UPLOAD_LIMITS } from '@fixmycity/shared';
import { validationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { storage } from '../../services/storage.js';

/** Multer configured for in-memory image uploads under the "photos" field. */
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_LIMITS.maxFileBytes, files: UPLOAD_LIMITS.maxFiles, fields: 20 },
  fileFilter: (_req, file, cb) => {
    if (!UPLOAD_LIMITS.allowedMimeTypes.includes(file.mimetype)) {
      cb(validationError('Only JPEG, PNG or WebP images are accepted.', { photos: 'Only JPEG, PNG or WebP images are accepted.' }));
      return;
    }
    cb(null, true);
  },
}).array('photos', UPLOAD_LIMITS.maxFiles);

export interface ProcessedImage {
  id: string;
  originalName: string;
  main: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  size: number;
}

/**
 * Verifies the bytes really are an image (not just a claimed MIME type),
 * auto-orients it, strips EXIF metadata (including GPS), and produces a
 * web-friendly WebP plus a list thumbnail.
 */
export async function processImages(files: Express.Multer.File[]): Promise<ProcessedImage[]> {
  const out: ProcessedImage[] = [];
  for (const file of files) {
    let format: string | undefined;
    try {
      const meta = await sharp(file.buffer, { failOn: 'error' }).metadata();
      format = meta.format;
    } catch {
      format = undefined;
    }
    if (!format || !['jpeg', 'png', 'webp'].includes(format)) {
      throw validationError(`"${file.originalname}" is not a valid JPEG, PNG or WebP image.`, {
        photos: `"${file.originalname}" is not a valid JPEG, PNG or WebP image.`,
      });
    }
    const main = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(file.buffer).rotate().resize({ width: 480, height: 360, fit: 'cover' }).webp({ quality: 70 }).toBuffer();
    out.push({
      id: randomUUID(),
      originalName: file.originalname.slice(0, 200),
      main: main.data,
      thumb,
      width: main.info.width,
      height: main.info.height,
      size: main.info.size,
    });
  }
  return out;
}

export const attachmentKey = (complaintId: string, attachmentId: string, size?: 'thumb') =>
  `complaints/${complaintId}/${attachmentId}${size === 'thumb' ? '_thumb' : ''}.webp`;

export async function storeImages(complaintId: string, images: ProcessedImage[]): Promise<string[]> {
  const keys: string[] = [];
  try {
    for (const img of images) {
      const mainKey = attachmentKey(complaintId, img.id);
      const thumbKey = attachmentKey(complaintId, img.id, 'thumb');
      await storage.put(mainKey, img.main, 'image/webp');
      keys.push(mainKey);
      await storage.put(thumbKey, img.thumb, 'image/webp');
      keys.push(thumbKey);
    }
  } catch (err) {
    await removeKeys(keys);
    throw err;
  }
  return keys;
}

export async function removeKeys(keys: string[]) {
  for (const key of keys) {
    await storage.remove(key).catch((err) => logger.warn({ err, key }, 'Failed to clean up stored file'));
  }
}
