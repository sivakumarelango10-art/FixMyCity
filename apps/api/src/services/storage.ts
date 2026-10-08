import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AwsClient } from 'aws4fetch';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface StorageAdapter {
  readonly driver: 'local' | 's3' | 'supabase';
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
 * Native Supabase Storage driver.
 * Stores complaint photos and media directly in Supabase Storage.
 */
export class SupabaseStorage implements StorageAdapter {
  readonly driver = 'supabase' as const;
  readonly durable = true;
  private readonly client: SupabaseClient;
  public readonly bucket: string;
  private bucketChecked = false;

  constructor(url: string, key: string, bucket: string) {
    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = bucket;
  }

  private async ensureBucket() {
    if (this.bucketChecked) return;
    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === this.bucket || b.id === this.bucket);
      if (!exists) {
        await this.client.storage.createBucket(this.bucket, { public: true });
        logger.info({ bucket: this.bucket }, 'Created Supabase storage bucket');
      }
      this.bucketChecked = true;
    } catch (err) {
      // Don't fail if we lack bucket creation rights or if already created
      this.bucketChecked = true;
      logger.debug({ err, bucket: this.bucket }, 'Supabase bucket check completed');
    }
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.ensureBucket();
    const { error } = await this.client.storage.from(this.bucket).upload(key, body, {
      contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) {
      const msg = error.message?.toLowerCase() ?? '';
      if (
        msg.includes('not found') ||
        (error as unknown as { statusCode: string }).statusCode === '404' ||
        (error as unknown as { status: number }).status === 404
      ) {
        return null;
      }
      throw new Error(`Supabase storage download failed: ${error.message}`);
    }
    if (!data) return null;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase storage remove failed: ${error.message}`);
    }
  }
}

/**
 * S3-compatible object storage (AWS S3, Cloudflare R2, MinIO).
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
  if (env.isTest) {
    return new LocalDiskStorage(env.UPLOAD_DIR);
  }
  if (env.STORAGE_DRIVER === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
      throw new Error('STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SECRET_KEY');
    }
    logger.info({ bucket: env.SUPABASE_STORAGE_BUCKET }, 'Using Supabase Storage adapter');
    return new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, env.SUPABASE_STORAGE_BUCKET);
  }
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
