import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';
import { attachRealtime, closeRealtime } from './sockets/index.js';
import { aiProviderStatus } from './modules/ai/classifier.service.js';
import { storage } from './services/storage.js';

const app = createApp();
const server = createServer(app);
attachRealtime(server);

server.listen(env.API_PORT, () => {
  const ai = aiProviderStatus();
  logger.info(
    {
      port: env.API_PORT,
      origins: env.webOrigins,
      ai: ai.configured ? `${ai.provider} (${ai.model})` : 'rule-based only',
      storage: storage.driver,
      email: env.smtpEnabled ? 'smtp' : 'console (dev)',
    },
    `FixMyCity API listening on http://localhost:${env.API_PORT}`,
  );
});

// Periodically remove expired sessions and reset tokens.
const cleanup = setInterval(
  () => {
    const now = new Date();
    Promise.all([
      prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    ]).catch((err) => logger.warn({ err }, 'Session cleanup failed'));
  },
  60 * 60 * 1000,
);
cleanup.unref();

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  await closeRealtime();
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
