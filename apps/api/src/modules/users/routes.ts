import {
  userAdminDetailQuerySchema,
  userListQuerySchema,
  userUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies.js';
import type { ApiEnvironment } from '@/http/context.js';

import { createSuccess } from '@/http/errors.js';
import { adminGuard } from '@/http/middleware/admin-guard.js';
import { parseBody, parseId, parseQuery } from '@/lib/parser.js';

/** 管理接口：挂载于 /users（requireRole ADMIN）。路由保持薄：验证 → service → 已映射 DTO。 */
export const createUserRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), userListQuerySchema);
    const data = await dependencies.users.list(query);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), userAdminDetailQuerySchema);
    const data = await dependencies.users.detail(
      parseId(context.req.param('id')),
      query,
    );
    return createSuccess(context, data);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, userUpdateInputSchema);
    const data = await dependencies.users.update(
      context.get('principal'),
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, data);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const data = await dependencies.users.remove(
      context.get('principal'),
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
};
