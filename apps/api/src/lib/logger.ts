import pino from 'pino';
import { env } from '../config/env.js';

const usePretty = !env.isProduction && !env.isTest && process.stdout.isTTY;

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'fixmycity-api' },
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', '*.password', '*.passwordHash'],
    censor: '[redacted]',
  },
  ...(usePretty ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } } : {}),
});
