import {
  friendCreateInputSchema,
  friendReorderInputSchema,
  friendUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId } from '@/lib/parser';

/** 管理接口：挂载于 /friends */
export const createFriendRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    return createSuccess(context, await dependencies.friends.list());
  });

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, friendCreateInputSchema);
    const friend = await dependencies.friends.create(input);
    return createSuccess(context, friend, 201);
  });

  // 静态段必须先于 PATCH /:id 注册，否则 /reorder 会被当作 id 吞掉
  routes.patch('/reorder', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, friendReorderInputSchema);
    return createSuccess(
      context,
      await dependencies.friends.reorder(input.ids),
    );
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, friendUpdateInputSchema);
    const friend = await dependencies.friends.update(
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, friend);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const result = await dependencies.friends.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, result);
  });

  return routes;
};

/** 公开接口：挂载于 /public/friends */
export const createFriendPublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/', async (context) => {
    return createSuccess(context, await dependencies.friends.listPublic());
  });

  return routes;
};
