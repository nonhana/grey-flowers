import {
  assetListQuerySchema,
  assetPurposeSchema,
  assetSetStatusInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppDependencies } from '../../bootstrap/dependencies.js';
import type { ApiEnvironment } from '../../http/context.js';

import { ApiError, createSuccess, validationError } from '../../http/errors.js';
import { requirePrincipal } from '../../http/middleware/require-principal.js';
import { requireRole } from '../../http/middleware/require-role.js';
import { parseBody } from '../../lib/parse-body.js';
import { MAX_UPLOAD_BYTES } from './service.js';

/** multipart 边界等开销，只为避免 Content-Length 预检误伤。 */
const MULTIPART_OVERHEAD = 64 * 1024;

const assetIdSchema = z.coerce.number().int().positive();

function parseAssetId(value: string) {
  const parsed = assetIdSchema.safeParse(value);
  if (!parsed.success) throw new ApiError('VALIDATION_FAILED');
  return parsed.data;
}

export function createAssetRoutes(dependencies: AppDependencies) {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);
  const admin = requireRole('ADMIN');

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
    const queryParsed = assetListQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.assets.list(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const data = await dependencies.assets.detail(
      parseAssetId(context.req.param('id')),
    );
    return createSuccess(context, data);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, assetSetStatusInputSchema);
    const asset = await dependencies.assets.setStatus(
      parseAssetId(context.req.param('id')),
      input.status,
    );
    return createSuccess(context, asset);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const asset = await dependencies.assets.remove(
      parseAssetId(context.req.param('id')),
    );
    return createSuccess(context, asset);
  });

  return routes;
}
