import type { MiddlewareHandler } from 'hono';

import type { ApiEnvironment } from '../../env.js';
import type { ApiEnvironment as ContextEnvironment } from '../context.js';

import { findActivePrincipal } from '../../modules/auth/principal.js';
import { verifyAccessToken } from '../../modules/auth/tokens.js';
import { ApiError } from '../errors.js';

const bearerTokenPattern =
  /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export function requirePrincipal(
  environment: ApiEnvironment,
): MiddlewareHandler<ContextEnvironment> {
  return async (context, next) => {
    const authorization = context.req.header('Authorization');
    const match = authorization?.match(bearerTokenPattern);
    if (!match) throw new ApiError('AUTH_REQUIRED');

    const token = await verifyAccessToken(match[1], environment);
    if (!token) throw new ApiError('AUTH_REQUIRED');

    const principal = await findActivePrincipal(
      context.get('dependencies'),
      token.userId,
      token.sessionId,
    );
    if (!principal) throw new ApiError('AUTH_REQUIRED');

    context.set('principal', principal);
    await next();
  };
}
