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
import { z } from 'zod';

import type { AppDependencies } from '../../bootstrap/dependencies.js';
import type { ApiEnvironment } from '../../http/context.js';

import { ApiError, createSuccess, validationError } from '../../http/errors.js';
import { requirePrincipal } from '../../http/middleware/require-principal.js';
import { requireRole } from '../../http/middleware/require-role.js';
import { parseBody } from '../../lib/parse-body.js';

const articleIdSchema = z.coerce.number().int().positive();

function parseArticleId(value: string | undefined) {
  const parsed = articleIdSchema.safeParse(value);
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED');
  return parsed.data;
}

/** 管理接口：挂载于 /articles */
export function createArticleAdminRoutes(dependencies: AppDependencies) {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);
  const admin = requireRole('ADMIN');

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, articleCreateInputSchema);
    const article = await dependencies.articles.create(
      context.get('principal'),
      input,
    );
    return createSuccess(context, article, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const queryParsed = articleListAdminQuerySchema.safeParse(
      context.req.query(),
    );
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.listAdmin(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const article = await dependencies.articles.getAdmin(
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, articleSaveInputSchema);
    const article = await dependencies.articles.save(
      context.get('principal'),
      parseArticleId(context.req.param('id')),
      input,
    );
    return createSuccess(context, article);
  });

  routes.post('/:id/publish', principal, admin, async (context) => {
    const article = await dependencies.articles.publish(
      context.get('principal'),
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.post('/:id/unpublish', principal, admin, async (context) => {
    const article = await dependencies.articles.unpublish(
      context.get('principal'),
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const article = await dependencies.articles.remove(
      context.get('principal'),
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, article);
  });

  routes.get('/:id/snapshots', principal, admin, async (context) => {
    const data = await dependencies.articles.listSnapshots(
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.post('/:id/preview-token', principal, admin, async (context) => {
    const data = await dependencies.articles.createPreviewToken(
      parseArticleId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  return routes;
}

/** 公开接口：挂载于 /public/articles */
export function createArticlePublicRoutes(dependencies: AppDependencies) {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/list', async (context) => {
    const queryParsed = articleListQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.list(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/detail', async (context) => {
    const queryParsed = articleDetailQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.detail(queryParsed.data.path);
    return createSuccess(context, data);
  });

  routes.get('/count', async (context) => {
    const queryParsed = articleFilterQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.count(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/search', async (context) => {
    const queryParsed = articleSearchQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.search(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/neighbors', async (context) => {
    const queryParsed = articleNeighborsQuerySchema.safeParse(
      context.req.query(),
    );
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.neighbors(queryParsed.data.path);
    return createSuccess(context, data);
  });

  routes.get('/dates', async (context) => {
    const data = await dependencies.articles.dates();
    return createSuccess(context, data);
  });

  routes.get('/preview', async (context) => {
    const queryParsed = articlePreviewQuerySchema.safeParse(
      context.req.query(),
    );
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.articles.preview(
      queryParsed.data.path,
      queryParsed.data.token,
    );
    return createSuccess(context, data);
  });

  return routes;
}
