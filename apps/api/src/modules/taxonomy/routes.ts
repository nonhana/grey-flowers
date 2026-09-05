import {
  categorySaveInputSchema,
  tagCreateInputSchema,
  tagListQuerySchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

/** 管理接口：/categories */
export const createCategoryRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    return createSuccess(context, await dependencies.taxonomy.listCategories());
  });

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, categorySaveInputSchema);
    const category = await dependencies.taxonomy.createCategory(input);
    return createSuccess(context, category, 201);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, categorySaveInputSchema);
    const category = await dependencies.taxonomy.updateCategory(
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, category);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const result = await dependencies.taxonomy.deleteCategory(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, result);
  });

  return routes;
};

/** 管理接口：/tags */
export const createTagRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), tagListQuerySchema);
    const result = await dependencies.taxonomy.listTags(query);
    return createSuccess(context, result);
  });

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, tagCreateInputSchema);
    const tag = await dependencies.taxonomy.createTag(input);
    return createSuccess(context, tag, 201);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const result = await dependencies.taxonomy.deleteTag(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, result);
  });

  return routes;
};

/** 公开接口：/public/tags 与 /public/categories */
export const createPublicTaxonomyRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/tags', async (context) => {
    return createSuccess(context, await dependencies.taxonomy.listPublicTags());
  });

  routes.get('/categories', async (context) => {
    return createSuccess(
      context,
      await dependencies.taxonomy.listPublicCategories(),
    );
  });

  return routes;
};
