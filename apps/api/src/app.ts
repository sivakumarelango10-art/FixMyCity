import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { healthRouter, readinessChecks } from './modules/health/health.routes.js';
import { loadSession } from './middleware/auth.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { complaintsRouter } from './modules/complaints/complaints.routes.js';
import { departmentRouter } from './modules/department/department.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { announcementsRouter, dashboardRouter, departmentsRouter, publicRouter } from './modules/public/public.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { utilitiesRouter } from './modules/utilities/utilities.routes.js';

export function createApp() {
  const app = express();

  // Behind the Next.js rewrite proxy (loopback) or a platform load balancer.
  app.set('trust proxy', env.TRUST_PROXY ? 1 : 'loopback');
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], imgSrc: ["'self'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cors({ origin: env.webOrigins, credentials: true }));
  if (!env.isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: { ignore: (req) => ['/api/health', '/health', '/ready'].includes(req.url ?? '') },
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
        serializers: {
          req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
      }),
    );
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  app.use(healthRouter);

  // Kept for existing clients; same readiness logic, reachable through the web app's /api proxy.
  app.get('/api/health', async (_req, res) => {
    const { ready, checks } = await readinessChecks();
    res.status(ready ? 200 : 503).json({
      data: { status: ready ? 'ok' : 'degraded', database: checks.database?.ok ? 'ok' : 'unreachable', checks },
    });
  });

  app.use('/api', apiLimiter, loadSession, csrfProtection);

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/complaints', complaintsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/utilities', utilitiesRouter);
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/departments', departmentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/department', departmentRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
