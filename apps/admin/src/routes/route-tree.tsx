import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';

import { ConsoleShell } from '@/app/shell/console-shell.js';
import { parseStatusFilter } from '@/features/articles/display.js';
import { parseAssetStatusFilter } from '@/features/assets/display.js';

import { lazyPage } from './lazy-page.js';

const rootRoute = createRootRoute({ component: ConsoleShell });

const indexRoute = createRoute({
  ...lazyPage(
    () => import('@/features/overview/overview-page.js'),
    'OverviewPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/',
});

const articlesListRoute = createRoute({
  ...lazyPage(
    () => import('@/features/articles/list-page.js'),
    'ArticlesListPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/articles',
  validateSearch: (search) => {
    const status = parseStatusFilter(search.status);
    return status === 'all' ? {} : { status };
  },
});

const newArticleRoute = createRoute({
  ...lazyPage(
    () => import('@/features/articles/new-article-page.js'),
    'NewArticlePage',
  ),
  getParentRoute: () => rootRoute,
  path: '/articles/new',
});

const articleWorkspaceRoute = createRoute({
  ...lazyPage(
    () => import('@/features/articles/workspace-page.js'),
    'ArticleWorkspacePage',
  ),
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId',
  staticData: { fullBleed: true },
});

const tagsRoute = createRoute({
  ...lazyPage(() => import('@/features/taxonomy/tags-page.js'), 'TagsPage'),
  getParentRoute: () => rootRoute,
  path: '/tags',
});

const categoriesRoute = createRoute({
  ...lazyPage(
    () => import('@/features/taxonomy/categories-page.js'),
    'CategoriesPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/categories',
});

const commentsRoute = createRoute({
  ...lazyPage(() => import('@/features/comments/list-page.js'), 'CommentsPage'),
  getParentRoute: () => rootRoute,
  path: '/comments',
});

const usersRoute = createRoute({
  ...lazyPage(() => import('@/features/users/list-page.js'), 'UsersPage'),
  getParentRoute: () => rootRoute,
  path: '/users',
});

const activitiesRoute = createRoute({
  ...lazyPage(
    () => import('@/features/activities/list-page.js'),
    'ActivitiesPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/activities',
});

const newActivityRoute = createRoute({
  ...lazyPage(
    () => import('@/features/activities/compose-page.js'),
    'ActivityComposePage',
  ),
  getParentRoute: () => rootRoute,
  path: '/activities/new',
  staticData: { fullBleed: true },
});

const editActivityRoute = createRoute({
  ...lazyPage(
    () => import('@/features/activities/compose-page.js'),
    'ActivityComposePage',
  ),
  getParentRoute: () => rootRoute,
  path: '/activities/$activityId/edit',
  staticData: { fullBleed: true },
});

const assetsListRoute = createRoute({
  ...lazyPage(() => import('@/features/assets/list-page.js'), 'AssetsListPage'),
  getParentRoute: () => rootRoute,
  path: '/assets',
  validateSearch: (search) => {
    const status = parseAssetStatusFilter(search.status);
    return status === 'all' ? {} : { status };
  },
});

const assetsDetailRoute = createRoute({
  ...lazyPage(
    () => import('@/features/assets/detail-page.js'),
    'AssetsDetailPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/assets/$assetId',
});

const musicListRoute = createRoute({
  ...lazyPage(
    () => import('@/features/music/list-page.js'),
    'MusicLibraryPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/music',
  validateSearch: (search) =>
    search.incomplete === true ? { incomplete: true } : {},
});

const musicDetailRoute = createRoute({
  ...lazyPage(
    () => import('@/features/music/detail-page.js'),
    'MusicDetailPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/music/$musicId',
});

const musicUploadRoute = createRoute({
  ...lazyPage(
    () => import('@/features/music/upload-page.js'),
    'MusicUploadPage',
  ),
  getParentRoute: () => rootRoute,
  path: '/music/upload',
});

const routeTree = rootRoute.addChildren([
  activitiesRoute,
  articleWorkspaceRoute,
  articlesListRoute,
  assetsDetailRoute,
  assetsListRoute,
  categoriesRoute,
  commentsRoute,
  editActivityRoute,
  indexRoute,
  musicDetailRoute,
  musicListRoute,
  musicUploadRoute,
  newActivityRoute,
  newArticleRoute,
  tagsRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });
