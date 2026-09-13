import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AppDependencies } from './bootstrap/dependencies';
import type { ApiEnvironment } from './http/context';

import { createFailure, createSuccess, handleError } from './http/errors';
import { requestId } from './http/middleware/request-id';
import { requestLogger } from './http/middleware/request-logger';
import {
  createActivityPublicRoutes,
  createActivityRoutes,
} from './modules/activities/routes';
import {
  createArticleAdminRoutes,
  createArticlePublicRoutes,
} from './modules/articles/routes';
import { createAssetRoutes } from './modules/assets/routes';
import { createAuthRoutes } from './modules/auth/routes';
import {
  createCommentPublicRoutes,
  createCommentRoutes,
  createCommentUserRoutes,
} from './modules/comments/routes';
import {
  createMusicPublicRoutes,
  createMusicRoutes,
} from './modules/music/routes';
import { createOverviewRoutes } from './modules/overview/routes';
import {
  createCategoryRoutes,
  createPublicTaxonomyRoutes,
  createTagRoutes,
} from './modules/taxonomy/routes';
import { createUserRoutes } from './modules/users/routes';

export const createApp = (dependencies: AppDependencies) => {
  const app = new Hono<ApiEnvironment>();

  app.use('*', requestId());
  app.use('*', async (context, next) => {
    context.set('dependencies', dependencies);
    await next();
  });
  app.use('*', requestLogger());
  app.use(
    '*',
    cors({
      allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      exposeHeaders: ['X-Request-Id'],
      origin: (origin) =>
        dependencies.environment.AUTH_ALLOWED_ORIGINS.includes(origin)
          ? origin
          : null,
    }),
  );
  app.onError(handleError);
  app.get('/', (c) =>
    createSuccess(c, 'Welcome to GreyFlowers Hono API Service'),
  );
  app.route('/auth', createAuthRoutes(dependencies));
  app.route('/assets', createAssetRoutes(dependencies));
  app.route('/activities', createActivityRoutes(dependencies));
  app.route('/articles', createArticleAdminRoutes(dependencies));
  app.route('/categories', createCategoryRoutes(dependencies));
  app.route('/comments', createCommentRoutes(dependencies));
  app.route('/tags', createTagRoutes(dependencies));
  app.route('/users', createUserRoutes(dependencies));
  app.route('/music', createMusicRoutes(dependencies));
  app.route('/overview', createOverviewRoutes(dependencies));
  app.route('/public', createPublicTaxonomyRoutes(dependencies));
  app.route('/public/articles', createArticlePublicRoutes(dependencies));
  app.route('/public/activities', createActivityPublicRoutes(dependencies));
  app.route('/public/comments', createCommentPublicRoutes(dependencies));
  app.route('/public/music', createMusicPublicRoutes(dependencies));
  app.route('/public/users', createCommentUserRoutes(dependencies));
  app.notFound((c) => createFailure(c, 'NOT_FOUND'));

  return app;
};

export type AppType = ReturnType<typeof createApp>;
