import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AppDependencies } from './bootstrap/dependencies.js';
import type { ApiEnvironment } from './http/context.js';

import { createFailure, createSuccess, handleError } from './http/errors.js';
import { requestId } from './http/middleware/request-id.js';
import { requestLogger } from './http/middleware/request-logger.js';
import { createAuthRoutes } from './modules/auth/routes.js';

export function createApp(dependencies: AppDependencies) {
  const app = new Hono<ApiEnvironment>();

  app.use('*', requestId());
  app.use('*', async (context, next) => {
    context.set('dependencies', dependencies);
    await next();
  });
  app.use('*', requestLogger());
  app.use(
    '*',
    cors({
      allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      credentials: true,
      exposeHeaders: ['X-Request-Id'],
      origin: (origin) =>
        dependencies.environment.AUTH_ALLOWED_ORIGINS.includes(origin)
          ? origin
          : null,
    }),
  );
  app.onError(handleError);
  app.get('/', (c) =>
    createSuccess(c, 'Welcome to GreyFlowers Hono API Service'),
  );
  app.route('/auth', createAuthRoutes(dependencies));
  app.notFound((c) => createFailure(c, 'NOT_FOUND'));

  return app;
}

export type AppType = ReturnType<typeof createApp>;
