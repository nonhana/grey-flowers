import {
  assetListQuerySchema,
  assetPurposeSchema,
  assetSetStatusInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies.js';
import type { ApiEnvironment } from '@/http/context.js';

import { ApiError, createSuccess } from '@/http/errors.js';
import { adminGuard } from '@/http/middleware/admin-guard.js';
import { parseBody, parseId, parseQuery } from '@/lib/parser.js';

import { MAX_UPLOAD_BYTES } from './service.js';

/** multipart 边界等开销，只为避免 Content-Length 预检误伤。 */
const MULTIPART_OVERHEAD = 64 * 1024;

export const createAssetRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.post('/upload', principal, admin, async (context) => {
    const contentLength = Number(context.req.header('content-length'));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD
    ) {
      throw new ApiError('ASSET_PAYLOAD_TOO_LARGE');
    }

    let body: Record<string, string | File>;
    try {
      body = await context.req.parseBody();
    } catch {
      throw new ApiError('VALIDATION_FAILED');
    }

    const file = body['file'];
    const purposeParsed = assetPurposeSchema.safeParse(body['purpose']);

    if (!(file instanceof File) || !purposeParsed.success) {
      throw new ApiError('VALIDATION_FAILED');
    }

    const asset = await dependencies.assets.upload(
      context.get('principal').userId,
      purposeParsed.data,
      file,
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
