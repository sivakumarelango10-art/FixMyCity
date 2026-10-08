import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { AwsClient } from 'aws4fetch';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface StorageAdapter {
  readonly driver: 'local' | 's3';
  /** Whether stored files survive restarts and redeploys on typical hosts. */
  readonly durable: boolean;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

/** Stores files on local disk. Suitable for development and single-server demos. */
class LocalDiskStorage implements StorageAdapter {
  readonly driver = 'local' as const;
  readonly durable = false;
  private readonly root: string;

  constructor(dir: string) {
    this.root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  }

  private pathFor(key: string) {
    const full = resolve(this.root, key);
    // Refuse keys that escape the storage root.
    if (!full.startsWith(this.root + sep)) throw new Error('Invalid storage key');
    return full;
  }

  async put(key: string, body: Buffer) {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async get(key: string) {
    try {
      return await readFile(this.pathFor(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async remove(key: string) {
    await rm(this.pathFor(key), { force: true });
  }
}

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Supabase Storage S3 API).
 * Objects stay private; the API streams them after its own permission checks.
 */
class S3Storage implements StorageAdapter {
  readonly driver = 's3' as const;
  readonly durable = true;
  private readonly client: AwsClient;
  private readonly baseUrl: string;

  constructor(bucket: string) {
    if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    }
    const region = env.S3_REGION || 'auto';
    this.client = new AwsClient({
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region,
      service: 's3',
    });
    // Path-style URLs work for AWS, R2, MinIO and Supabase's S3 endpoint alike.
    const endpoint = (env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`).replace(/\/+$/, '');
    this.baseUrl = `${endpoint}/${encodeURIComponent(bucket)}`;
  }

  private url(key: string) {
    return `${this.baseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async put(key: string, body: Buffer, contentType: string) {
    const res = await this.client.fetch(this.url(key), {
      method: 'PUT',
      body: new Uint8Array(body),
      headers: { 'Content-Type': contentType },
    });
    if (!res.ok) throw new Error(`S3 upload failed with status ${res.status}`);
  }

  async get(key: string) {
    const res = await this.client.fetch(this.url(key), { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`S3 download failed with status ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async remove(key: string) {
    const res = await this.client.fetch(this.url(key), { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error(`S3 delete failed with status ${res.status}`);
  }
}

function createStorage(): StorageAdapter {
  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_BUCKET) throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET');
    return new S3Storage(env.S3_BUCKET);
  }
  if (env.isProduction) {
    logger.warn('Using local disk storage in production. Uploaded images are not durable on most hosts.');
  }
  return new LocalDiskStorage(env.UPLOAD_DIR);
}

export const storage = createStorage();
