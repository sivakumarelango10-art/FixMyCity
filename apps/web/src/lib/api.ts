import type { ApiErrorBody, PaginationMeta } from '@fixmycity/shared';

/** Error thrown for any non-2xx API response, carrying field-level messages when present. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const CSRF_COOKIE = 'fmc_csrf';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfPromise: Promise<string> | null = null;

/** Returns the double-submit CSRF token, fetching it once if the cookie is not set yet. */
async function csrfToken(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  csrfPromise ??= fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' })
    .then(async (r) => {
      const contentType = r.headers.get('content-type') || '';
      if (!r.ok || !contentType.includes('application/json')) {
        return readCookie(CSRF_COOKIE) ?? '';
      }
      try {
        const j = (await r.json()) as { data?: { csrfToken?: string } };
        return readCookie(CSRF_COOKIE) ?? j.data?.csrfToken ?? '';
      } catch {
        return readCookie(CSRF_COOKIE) ?? '';
      }
    })
    .catch(() => readCookie(CSRF_COOKIE) ?? '')
    .finally(() => {
      csrfPromise = null;
    });
  return csrfPromise;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  const contentType = res.headers.get('content-type') || '';
  let rawText = '';
  if (contentType.includes('application/json')) {
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* non-JSON error */
    }
  } else {
    try {
      rawText = await res.text();
    } catch {
      /* ignore text reading failure */
    }
  }
  let message = body.error?.message;
  if (!message) {
    if (rawText.includes('DNS_HOSTNAME_RESOLVED_PRIVATE') || rawText.includes('The page could not be found')) {
      message = 'Production API backend is not configured. In Vercel Project Settings, set API_INTERNAL_URL to your deployed FixMyCity backend URL.';
    } else if (res.status === 502 || res.status === 504) {
      message = 'Backend API is unreachable. Please verify that the backend API server is running.';
    } else if (res.status === 404) {
      message = 'Backend endpoint not found. In production, configure API_INTERNAL_URL in Vercel to your deployed backend service.';
    } else if (res.status === 0 || res.status >= 500) {
      message = 'The server encountered an error. Please try again in a moment.';
    } else {
      message = 'Something went wrong. Please try again.';
    }
  }
  return new ApiError(res.status, body.error?.code ?? 'BACKEND_UNREACHABLE', message, body.error?.fields);
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<{ data: T; meta?: PaginationMeta }> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken();

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, credentials: 'include', signal: opts.signal, cache: 'no-store' });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach FixMyCity. Check your connection and try again.');
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return { data: undefined as T };

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      res.status,
      'INVALID_RESPONSE',
      'The API server returned an unexpected response. Please verify that the API server is running on port 4000.',
    );
  }

  try {
    return (await res.json()) as { data: T; meta?: PaginationMeta };
  } catch {
    throw new ApiError(res.status, 'INVALID_JSON', 'Unable to parse server response as JSON.');
  }
}

export const api = {
  get: async <T>(path: string, signal?: AbortSignal) => (await request<T>('GET', path, { signal })).data,
  getPage: async <T>(path: string, signal?: AbortSignal) => {
    const res = await request<T[]>('GET', path, { signal });
    return { data: res.data, meta: res.meta! };
  },
  post: async <T>(path: string, body?: unknown, headers?: Record<string, string>) => (await request<T>('POST', path, { body, headers })).data,
  patch: async <T>(path: string, body?: unknown) => (await request<T>('PATCH', path, { body })).data,
  delete: async <T>(path: string) => (await request<T>('DELETE', path)).data,
};

/**
 * Multipart upload with progress, used for complaint photos.
 * XMLHttpRequest is used because fetch does not expose upload progress.
 */
export async function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  const token = await csrfToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', token);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'Upload failed. Check your connection and try again.'));
    xhr.onload = () => {
      let json: { data?: T; error?: ApiErrorBody['error'] } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.data !== undefined) {
        onProgress(1);
        resolve(json.data);
      } else {
        reject(
          new ApiError(
            xhr.status,
            json.error?.code ?? 'UNKNOWN',
            json.error?.message ?? (xhr.status === 413 ? 'The upload is too large.' : 'The upload could not be completed.'),
            json.error?.fields,
          ),
        );
      }
    };
    xhr.send(form);
  });
}

export function toQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** Idempotency keys for demo payments: one per checkout attempt. */
export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}
