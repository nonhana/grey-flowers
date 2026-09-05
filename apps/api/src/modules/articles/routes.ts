import {
  articleCreateInputSchema,
  articleDetailQuerySchema,
  articleFilterQuerySchema,
  articleListAdminQuerySchema,
  articleListQuerySchema,
  articleNeighborsQuerySchema,
  articlePreviewQuerySchema,
  articleSaveInputSchema,
  articleSearchQuerySchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

/** 管理接口：挂载于 /articles */
export const createArticleAdminRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, articleCreateInputSchema);
    const article = await dependencies.articles.create(input);
    return createSuccess(context, article, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), articleListAdminQuerySchema);
    const data = await dependencies.articles.listAdmin(query);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const article = await dependencies.articles.getAdmin(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, articleSaveInputSchema);
    const article = await dependencies.articles.save(
      context.get('principal'),
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, article);
  });

  routes.post('/:id/publish', principal, admin, async (context) => {
    const article = await dependencies.articles.publish(
      context.get('principal'),
      parseId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.post('/:id/unpublish', principal, admin, async (context) => {
    const article = await dependencies.articles.unpublish(
      context.get('principal'),
      parseId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const article = await dependencies.articles.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.get('/:id/snapshots', principal, admin, async (context) => {
    const data = await dependencies.articles.listSnapshots(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.post('/:id/preview-token', principal, admin, async (context) => {
    const data = await dependencies.articles.createPreviewToken(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
};

/** 公开接口：挂载于 /public/articles */
export const createArticlePublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/list', async (context) => {
    const query = parseQuery(context.req.query(), articleListQuerySchema);
    const data = await dependencies.articles.list(query);
    return createSuccess(context, data);
  });

  routes.get('/detail', async (context) => {
    const query = parseQuery(context.req.query(), articleDetailQuerySchema);
    const data = await dependencies.articles.detail(query.path);
    return createSuccess(context, data);
  });

  routes.get('/count', async (context) => {
    const query = parseQuery(context.req.query(), articleFilterQuerySchema);
    const data = await dependencies.articles.count(query);
    return createSuccess(context, data);
  });

  routes.get('/search', async (context) => {
    const query = parseQuery(context.req.query(), articleSearchQuerySchema);
    const data = await dependencies.articles.search(query);
    return createSuccess(context, data);
  });

  routes.get('/neighbors', async (context) => {
    const query = parseQuery(context.req.query(), articleNeighborsQuerySchema);
    const data = await dependencies.articles.neighbors(query.path);
    return createSuccess(context, data);
  });

  routes.get('/dates', async (context) => {
    const data = await dependencies.articles.dates();
    return createSuccess(context, data);
  });

  routes.get('/preview', async (context) => {
    const query = parseQuery(context.req.query(), articlePreviewQuerySchema);
    const data = await dependencies.articles.preview(query.path, query.token);

    // 预览 token 走 query 是 SSR 需要（fragment 到不了服务端）。
    // 响应绝不可缓存，杜绝 query 中的 token 进入共享/代理缓存日志。
    context.header('Cache-Control', 'no-store');
    context.header('Referrer-Policy', 'no-referrer');
    return createSuccess(context, data);
  });

  return routes;
};
