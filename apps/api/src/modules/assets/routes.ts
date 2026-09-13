import {
  assetConfirmInputSchema,
  assetListQuerySchema,
  assetSetStatusInputSchema,
  assetUploadUrlInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

export const createAssetRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  /** 直传第一步：签发一次性 PUT URL（浏览器直接传 R2）。 */
  routes.post('/upload-url', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, assetUploadUrlInputSchema);
    const data = await dependencies.assets.createUploadUrl(input);
    return createSuccess(context, data);
  });

  /** 直传第三步：PUT 完成后回执，服务端 HEAD 校验并落库。 */
  routes.post('/confirm', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, assetConfirmInputSchema);
    const asset = await dependencies.assets.confirmUpload(
      context.get('principal').userId,
      input,
    );
    return createSuccess(context, asset, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), assetListQuerySchema);
    const data = await dependencies.assets.list(query);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const data = await dependencies.assets.detail(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, assetSetStatusInputSchema);
    const asset = await dependencies.assets.setStatus(
      parseId(context.req.param('id')),
      input.status,
    );
    return createSuccess(context, asset);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const asset = await dependencies.assets.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, asset);
  });

  return routes;
};
