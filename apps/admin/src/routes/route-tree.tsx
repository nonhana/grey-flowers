import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  useParams,
} from '@tanstack/react-router';

import { ConsoleShell } from '@/app/shell/console-shell.js';
import { parseStatusFilter } from '@/features/articles/display.js';
import { ArticlesListPage } from '@/features/articles/list-page.js';
import { NewArticlePage } from '@/features/articles/new-article-page.js';
import { ArticleWorkspacePage } from '@/features/articles/workspace-page.js';
import { AssetsDetailPage } from '@/features/assets/detail-page.js';
import { AssetsListPage } from '@/features/assets/list-page.js';
import { CategoriesPage } from '@/features/taxonomy/categories-page.js';
import { TagsPage } from '@/features/taxonomy/tags-page.js';

const rootRoute = createRootRoute({ component: ConsoleShell });

const RedirectToArticles = () => <Navigate replace to="/articles" />;

const indexRoute = createRoute({
  component: RedirectToArticles,
  getParentRoute: () => rootRoute,
  path: '/',
});

const articlesListRoute = createRoute({
  component: ArticlesListPage,
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
  component: NewArticlePage,
  getParentRoute: () => rootRoute,
  path: '/articles/new',
});

const ArticleWorkspaceRouteView = () => {
  const { articleId } = useParams({ strict: false }) as { articleId: string };
  return <ArticleWorkspacePage articleId={articleId} />;
};

const articleWorkspaceRoute = createRoute({
  component: ArticleWorkspaceRouteView,
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId',
  // 写作要独占视口：外壳收起移动端的拇指栏，把滚动交还给纸面。
  staticData: { fullBleed: true },
});

const tagsRoute = createRoute({
  component: TagsPage,
  getParentRoute: () => rootRoute,
  path: '/tags',
});

const categoriesRoute = createRoute({
  component: CategoriesPage,
  getParentRoute: () => rootRoute,
  path: '/categories',
});

const assetsListRoute = createRoute({
  component: AssetsListPage,
  getParentRoute: () => rootRoute,
  path: '/assets',
});

const AssetsDetailRouteView = () => {
  const { assetId } = useParams({ strict: false }) as { assetId: string };
  return <AssetsDetailPage assetId={assetId} />;
};

const assetsDetailRoute = createRoute({
  component: AssetsDetailRouteView,
  getParentRoute: () => rootRoute,
  path: '/assets/$assetId',
});

const routeTree = rootRoute.addChildren([
  articleWorkspaceRoute,
  articlesListRoute,
  assetsDetailRoute,
  assetsListRoute,
  categoriesRoute,
  indexRoute,
  newArticleRoute,
  tagsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
