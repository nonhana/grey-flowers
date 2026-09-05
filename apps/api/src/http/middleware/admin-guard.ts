import type { MiddlewareHandler } from 'hono';

import type { ApiEnvironment } from '@/env';

import type { ApiEnvironment as ContextEnvironment } from '../context';

import { requirePrincipal } from './require-principal';
import { requireRole } from './require-role';

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
