import {
  musicCreateInputSchema,
  musicListQuerySchema,
  musicUpdateInputSchema,
} from '@grey-flowers/contracts';
import { Hono } from 'hono';

import type { AppDependencies } from '@/bootstrap/dependencies';
import type { ApiEnvironment } from '@/http/context';

import { createSuccess } from '@/http/errors';
import { adminGuard } from '@/http/middleware/admin-guard';
import { parseBody, parseId, parseQuery } from '@/lib/parser';

/** 管理接口：挂载于 /music */
export const createMusicRoutes = (dependencies: AppDependencies) => {
  const routes = new Hono<ApiEnvironment>();
  const { admin, principal } = adminGuard(dependencies.environment);

  routes.post('/', principal, admin, async (context) => {
    const input = await parseBody(context.req.raw, musicCreateInputSchema);
    const music = await dependencies.music.create(input);
    return createSuccess(context, music, 201);
  });

  routes.get('/', principal, admin, async (context) => {
    const query = parseQuery(context.req.query(), musicListQuerySchema);
    const data = await dependencies.music.list(query);
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
    const query = parseQuery(context.req.query(), musicListQuerySchema);
    const data = await dependencies.music.listPublic(query);
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
