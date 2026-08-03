import {
  categorySaveInputSchema,
  tagCreateInputSchema,
  tagListQuerySchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDependencies } from '@/bootstrap/dependencies.js';
import type { ApiEnvironment } from '@/http/context.js';

import { ApiError, createSuccess, validationError } from '@/http/errors.js';
import { requirePrincipal } from '@/http/middleware/require-principal.js';
import { requireRole } from '@/http/middleware/require-role.js';
import { parseBody } from '@/lib/parse-body.js';

const idSchema = z.coerce.number().int().positive();

const parseId = (value: string | undefined) => {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED');
  return parsed.data;
};

/** 管理接口：/categories */
export const createCategoryRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);
  const admin = requireRole('ADMIN');

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
  const principal = requirePrincipal(dependencies.environment);
  const admin = requireRole('ADMIN');

  routes.get('/', principal, admin, async (context) => {
    const queryParsed = tagListQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const result = await dependencies.taxonomy.listTags(queryParsed.data);
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
