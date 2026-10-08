import type { Request, Response } from 'express';
import type { ZodType } from 'zod';
import type { PaginationMeta } from '@fixmycity/shared';
import { validationError } from './errors.js';

/** Parses input with a Zod schema and converts failures into a 400 with field messages. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Invalid input.';
  throw validationError(first, fields);
}

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function paginated<T>(res: Response, data: T[], meta: PaginationMeta) {
  return res.status(200).json({ data, meta });
}

export function pageMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function clientIp(req: Request): string | null {
  return req.ip ?? req.socket.remoteAddress ?? null;
}

/** Route params are always strings in our routes. */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  return typeof value === 'string' ? value : '';
}
