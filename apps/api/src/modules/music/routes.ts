import {
  musicCreateInputSchema,
  musicListQuerySchema,
  musicParseInputSchema,
  musicUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies.js';
import type { ApiEnvironment } from '@/http/context.js';

import { createSuccess, validationError } from '@/http/errors.js';
import { requirePrincipal } from '@/http/middleware/require-principal.js';
import { requireRole } from '@/http/middleware/require-role.js';
import { parseBody, parseId } from '@/lib/parser.js';

/** 管理接口：挂载于 /music */
export const createMusicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const principal = requirePrincipal(dependencies.environment);
  const admin = requireRole('ADMIN');

  routes.post('/parse', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, musicParseInputSchema);
    const data = await dependencies.music.parse(
      context.get('principal'),
      input.sourceAssetId,
    );
    return createSuccess(context, data);
  });

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, musicCreateInputSchema);
    const music = await dependencies.music.create(input);
    return createSuccess(context, music, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const queryParsed = musicListQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.music.list(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/:id', principal, admin, async (context) => {
    const music = await dependencies.music.detail(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, music);
  });

  routes.patch('/:id', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, musicUpdateInputSchema);
    const music = await dependencies.music.update(
      parseId(context.req.param('id')),
      input,
    );
    return createSuccess(context, music);
  });

  routes.delete('/:id', principal, admin, async (context) => {
    const music = await dependencies.music.remove(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, music);
  });

  return routes;
};

/** 公开接口：挂载于 /public/music */
export const createMusicPublicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();

  routes.get('/', async (context) => {
    const queryParsed = musicListQuerySchema.safeParse(context.req.query());
    if (!queryParsed.success) throw validationError(queryParsed.error);

    const data = await dependencies.music.listPublic(queryParsed.data);
    return createSuccess(context, data);
  });

  routes.get('/:id', async (context) => {
    const track = await dependencies.music.detailPublic(
      parseId(context.req.param('id')),
    );
    return createSuccess(context, track);
  });

  return routes;
};
