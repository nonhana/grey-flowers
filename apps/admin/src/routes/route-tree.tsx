import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
} from '@tanstack/react-router';

import { ConsoleShell } from '@/app/shell/console-shell.js';
import { parseStatusFilter } from '@/features/articles/display.js';

import { lazyPage } from './lazy-page.js';

const rootRoute = createRootRoute({ component: ConsoleShell });

const RedirectToArticles = () => <Navigate replace to="/articles" />;

const indexRoute = createRoute({
  component: RedirectToArticles,
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
  // 「全部」是无查询串的规范 URL，草稿与已发布各自带一个 status。
  // 这样侧栏子项可以深链，而普通的「去文章列表」不必拖着查询串走。
  validateSearch: (search: Record<string, unknown>) => {
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
  // 写作要独占视口：外壳收起移动端的拇指栏，把滚动交还给纸面。
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
  // 全文写作独占视口：收起移动端拇指栏，把滚动交还给纸面。
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
  editActivityRoute,
  indexRoute,
  musicDetailRoute,
  musicListRoute,
  musicUploadRoute,
  newActivityRoute,
  newArticleRoute,
  tagsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
