import type { MiddlewareHandler } from 'hono';

import { performance } from 'node:perf_hooks';

import type { ApiEnvironment } from '../context.js';

interface ApiFailureBody {
  error?: { code?: string; message?: string };
}

export const requestLogger = (): MiddlewareHandler<ApiEnvironment> => {
  return async (context, next) => {
    const { logger } = context.get('dependencies');
    const startedAt = performance.now();
    const method = context.req.method;
    const path = new URL(context.req.url).pathname;
    const requestId = context.get('requestId');

    await next();

    const responseTimeMs =
      Math.round((performance.now() - startedAt) * 100) / 100;
    const status = context.res.status;

    const line = `${method} ${path} ${status} ${responseTimeMs}ms`;

    if (status >= 500) {
      logger.error({ requestId, status, responseTimeMs }, line);
      return;
    }

    if (status >= 400) {
      let reason = '';
      try {
        const body = (await context.res.clone().json()) as ApiFailureBody;
        const { code, message } = body.error ?? {};
        if (code) reason = ` ${code}`;
        if (message) reason += ` "${message}"`;
      } catch {
        // response body is not a JSON failure envelope; fall back to status only
      }
      logger.warn({ requestId, status, responseTimeMs }, line + reason);
      return;
    }

    logger.info({ requestId, status, responseTimeMs }, line);
  };
};
