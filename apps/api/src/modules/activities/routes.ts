import {
  activityCreateInputSchema,
  activityListQuerySchema,
  activityUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

/** 管理接口：挂载于 /activities */
export const createActivityRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, activityCreateInputSchema);
    const data = await dependencies.activities.create(input);
    return createSuccess(context, data, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), activityListQuerySchema);
    const data = await dependencies.activities.list(query);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const data = await dependencies.activities.detail(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, activityUpdateInputSchema);
    const data = await dependencies.activities.update(
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, data);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const data = await dependencies.activities.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
};

/** 公开接口：挂载于 /public/activities */
export const createActivityPublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/list', async (context) => {
    const query = parseQuery(context.req.query(), activityListQuerySchema);
    const data = await dependencies.activities.listPublic(query);
    return createSuccess(context, data);
  });

  routes.get('/:id', async (context) => {
    const data = await dependencies.activities.detailPublic(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
};
