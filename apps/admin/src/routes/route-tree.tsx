import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Navigate,
  useParams,
} from '@tanstack/react-router';

import { ConsoleShell } from '@/app/shell/console-shell.js';
import { parseStatusFilter } from '@/features/articles/display.js';
import { Spinner } from '@/ui/index.js';

// 页面组件全部按路由懒加载：CodeMirror 编辑器、音乐上传向导等大块
// 不再进首屏 chunk。根路由的外壳（ConsoleShell）负责首屏布局，保持静态导入。
// 路由只有在定义了 pendingComponent 时才会挂 Suspense 边界，所以懒加载
// 必须搭配它，否则组件挂起时没有边界可捕获。
const RoutePending = () => (
  <div className="grid h-full min-h-[50vh] place-items-center">
    <Spinner label="加载中" />
  </div>
);

const ArticlesListPage = lazyRouteComponent(
  () => import('@/features/articles/list-page.js'),
  'ArticlesListPage',
);
const NewArticlePage = lazyRouteComponent(
  () => import('@/features/articles/new-article-page.js'),
  'NewArticlePage',
);
const ArticleWorkspacePage = lazyRouteComponent(
  () => import('@/features/articles/workspace-page.js'),
  'ArticleWorkspacePage',
);
const AssetsDetailPage = lazyRouteComponent(
  () => import('@/features/assets/detail-page.js'),
  'AssetsDetailPage',
);
const AssetsListPage = lazyRouteComponent(
  () => import('@/features/assets/list-page.js'),
  'AssetsListPage',
);
const MusicDetailPage = lazyRouteComponent(
  () => import('@/features/music/detail-page.js'),
  'MusicDetailPage',
);
const MusicLibraryPage = lazyRouteComponent(
  () => import('@/features/music/list-page.js'),
  'MusicLibraryPage',
);
const MusicUploadPage = lazyRouteComponent(
  () => import('@/features/music/upload-page.js'),
  'MusicUploadPage',
);
const CategoriesPage = lazyRouteComponent(
  () => import('@/features/taxonomy/categories-page.js'),
  'CategoriesPage',
);
const TagsPage = lazyRouteComponent(
  () => import('@/features/taxonomy/tags-page.js'),
  'TagsPage',
);

const rootRoute = createRootRoute({ component: ConsoleShell });

const RedirectToArticles = () => <Navigate replace to="/articles" />;

const indexRoute = createRoute({
  component: RedirectToArticles,
  getParentRoute: () => rootRoute,
  path: '/',
});

const articlesListRoute = createRoute({
  component: ArticlesListPage,
  pendingComponent: RoutePending,
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
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/articles/new',
});

const ArticleWorkspaceRouteView = () => {
  const { articleId } = useParams({ strict: false }) as { articleId: string };
  return <ArticleWorkspacePage articleId={articleId} />;
};

const articleWorkspaceRoute = createRoute({
  component: ArticleWorkspaceRouteView,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId',
  // 写作要独占视口：外壳收起移动端的拇指栏，把滚动交还给纸面。
  staticData: { fullBleed: true },
});

const tagsRoute = createRoute({
  component: TagsPage,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/tags',
});

const categoriesRoute = createRoute({
  component: CategoriesPage,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/categories',
});

const assetsListRoute = createRoute({
  component: AssetsListPage,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/assets',
});

const AssetsDetailRouteView = () => {
  const { assetId } = useParams({ strict: false }) as { assetId: string };
  return <AssetsDetailPage assetId={assetId} />;
};

const assetsDetailRoute = createRoute({
  component: AssetsDetailRouteView,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/assets/$assetId',
});

const musicListRoute = createRoute({
  component: MusicLibraryPage,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/music',
});

const MusicDetailRouteView = () => {
  const { musicId } = useParams({ strict: false }) as { musicId: string };
  return <MusicDetailPage musicId={musicId} />;
};

const musicDetailRoute = createRoute({
  component: MusicDetailRouteView,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/music/$musicId',
});

const musicUploadRoute = createRoute({
  component: MusicUploadPage,
  pendingComponent: RoutePending,
  getParentRoute: () => rootRoute,
  path: '/music/upload',
});

const routeTree = rootRoute.addChildren([
  articleWorkspaceRoute,
  articlesListRoute,
  assetsDetailRoute,
  assetsListRoute,
  categoriesRoute,
  indexRoute,
  musicDetailRoute,
  musicListRoute,
  musicUploadRoute,
  newArticleRoute,
  tagsRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
