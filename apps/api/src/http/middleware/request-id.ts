import type { MiddlewareHandler } from 'hono';

import { randomUUID } from 'node:crypto';

import type { ApiEnvironment } from '../context.js';

export function requestId(): MiddlewareHandler<ApiEnvironment> {
  return async (context, next) => {
    const id = randomUUID();
    context.set('requestId', id);
    context.header('X-Request-Id', id);
    await next();
  };
}
