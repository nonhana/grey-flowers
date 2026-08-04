import type { MiddlewareHandler } from 'hono';

import type { ApiEnvironment } from '@/env.js';

import type { ApiEnvironment as ContextEnvironment } from '../context.js';

import { requirePrincipal } from './require-principal.js';
import { requireRole } from './require-role.js';

export interface AdminGuard {
  admin: MiddlewareHandler<ContextEnvironment>;
  principal: MiddlewareHandler<ContextEnvironment>;
}

export const adminGuard = (environment: ApiEnvironment): AdminGuard => {
  return {
    admin: requireRole('ADMIN'),
    principal: requirePrincipal(environment),
  };
};
