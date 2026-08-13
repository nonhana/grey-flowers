import type { Principal } from '@grey-flowers/contracts';
import type { MiddlewareHandler } from 'hono';

import type { ApiEnvironment } from '../context.js';

import { ApiError } from '../errors.js';

export const requireRole = (
  role: Principal['role'],
): MiddlewareHandler<ApiEnvironment> => {
  return async (context, next) => {
    if (context.get('principal').role !== role)
      throw new ApiError('AUTH_FORBIDDEN');

    await next();
  };
};
