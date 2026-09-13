import {
  commentCreateInputSchema,
  commentListQuerySchema,
  commentPublicListQuerySchema,
  commentReplyInputSchema,
  commentsBatchDeleteInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { requirePrincipal } from '@/http/middleware/require-principal';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

const commentCountQuerySchema = z
  .object({
    path: z.string().min(1).max(300),
  })
  .strict();

/** 管理接口：挂载于 /comments（requireRole ADMIN） */
export const createCommentRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), commentListQuerySchema);
    const data = await dependencies.comments.listAdmin(query);
    return createSuccess(context, data);
  });

  routes.post('/:id/reply', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, commentReplyInputSchema);
    const data = await dependencies.comments.replyAdmin(
      context.get('principal'),
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, data, 201);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const data = await dependencies.comments.removeAdmin(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.delete('/', principal, admin, async (context) => {
    const input = await parseBody(
      context.req.raw,
      commentsBatchDeleteInputSchema,
    );
    const data = await dependencies.comments.removeAdminBatch(input.ids);
    return createSuccess(context, data);
  });

  return routes;
};

/** 公开接口：挂载于 /public/comments（读匿名；写 principal） */
export const createCommentPublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);

  routes.get('/list', async (context) => {
    const query = parseQuery(context.req.query(), commentPublicListQuerySchema);
    const data = await dependencies.comments.listPublic(query);
    return createSuccess(context, data);
  });

  routes.get('/count', async (context) => {
    const { path } = parseQuery(context.req.query(), commentCountQuerySchema);
    const data = await dependencies.comments.countPublic(path);
    return createSuccess(context, data);
  });

  routes.post('/', principal, async (context) => {
    const input = await parseBody(context.req.raw, commentCreateInputSchema);
    const data = await dependencies.comments.createPublic(
      context.get('principal'),
      input,
    );
    return createSuccess(context, data, 201);
  });

  routes.delete('/:id', principal, async (context) => {
    const data = await dependencies.comments.removeOwn(
      context.get('principal'),
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
};

/** 用户自助接口：挂载于 /public/users（principal，仅看自己） */
export const createCommentUserRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);

  routes.get('/me/comments', principal, async (context) => {
    const data = await dependencies.comments.listMyComments(
      context.get('principal'),
    );
    return createSuccess(context, data);
  });

  routes.get('/me/messages', principal, async (context) => {
    const data = await dependencies.comments.listMyMessages(
      context.get('principal'),
    );
    return createSuccess(context, data);
  });

  return routes;
};
