import type { MiddlewareHandler } from 'hono';

import type { ApiEnvironment as Environment } from '@/env';

import type { ApiEnvironment } from '../context';

import { ApiError } from '../errors';

export const requireAllowedOrigin = (
  env: Environment,
): MiddlewareHandler<ApiEnvironment> => {
  return async (context, next) => {
    const origin = context.req.header('Origin');
    if (!origin || !env.AUTH_ALLOWED_ORIGINS.includes(origin))
      throw new ApiError('AUTH_FORBIDDEN');

    await next();
  };
};
