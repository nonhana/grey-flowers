import {
  createRoute,
  createRootRoute,
  createRouter,
  Link,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { cn } from 'cnfast';
import { useEffect } from 'react';

import { ArticlesListPage } from '../features/articles/list-page.js';
import { NewArticlePage } from '../features/articles/new-article-page.js';
import { ArticleWorkspacePage } from '../features/articles/workspace-page.js';
import { AssetsDetailPage } from '../features/assets/detail-page.js';
import { AssetsListPage } from '../features/assets/list-page.js';
import { CategoriesPage } from '../features/taxonomy/categories-page.js';
import { TagsPage } from '../features/taxonomy/tags-page.js';

const NAV_ITEMS = [
  { label: '文章', path: '/articles' },
  { label: '新建文章', path: '/articles/new' },
  { label: '分类', path: '/categories' },
  { label: '标签', path: '/tags' },
  { label: '资产库', path: '/assets' },
];

function NavigationTab({ label, path }: { label: string; path: string }) {
  return (
    <Link
      className={cn(
        'flex min-h-10.5 shrink-0 items-center rounded-control px-3 font-mono',
        `
          text-[0.8rem] leading-[1.2] text-ink-soft transition-colors
          duration-150
        `,
        `
          ease-out
          hover:bg-accent hover:text-accent-text
        `,
        'focus-visible:outline-[3px] focus-visible:outline-offset-2',
        `
          focus-visible:outline-focus-outline
          [&.active]:bg-vapor
        `,
        '[&.active]:text-brand',
      )}
      to={path}
    >
      {label}
    </Link>
  );
}

function NavigationRail() {
  return (
    <aside
      aria-label="主导航"
      className="
        flex w-52 shrink-0 flex-col gap-1 border-r border-edge bg-surface p-3
      "
    >
      {NAV_ITEMS.map((item) => (
        <Link
          className={cn(
            'flex min-h-10.5 items-center rounded-control px-3 font-mono',
            'text-[0.82rem] leading-[1.2] text-ink-soft transition-colors',
            `
              duration-150 ease-out
              hover:bg-accent hover:text-accent-text
            `,
            'focus-visible:outline-[3px] focus-visible:outline-offset-2',
            `
              focus-visible:outline-focus-outline
              [&.active]:bg-vapor
            `,
            '[&.active]:text-brand',
          )}
          key={item.path}
          to={item.path}
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}

const rootRoute = createRootRoute({
  component: () => (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="
          flex items-center gap-1 overflow-x-auto border-b border-edge
          bg-surface px-3 py-1
          md:hidden
        "
      >
        {NAV_ITEMS.map((item) => (
          <NavigationTab key={item.path} label={item.label} path={item.path} />
        ))}
      </div>
      <div
        className="
          flex h-full min-h-0 flex-1 flex-col
          md:flex-row
        "
      >
        <div
          className="
            hidden h-full
            md:block
          "
        >
          <NavigationRail />
        </div>
        <section className="h-full min-w-0 flex-1 overflow-auto">
          <Outlet />
        </section>
      </div>
    </div>
  ),
});

function RedirectToLists() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: '/articles' });
  }, [navigate]);

  return null;
}

const indexRoute = createRoute({
  component: RedirectToLists,
  getParentRoute: () => rootRoute,
  path: '/',
});

const articlesListRoute = createRoute({
  component: ArticlesListPage,
  getParentRoute: () => rootRoute,
  path: '/articles',
});

const newArticleRoute = createRoute({
  component: NewArticlePage,
  getParentRoute: () => rootRoute,
  path: '/articles/new',
});

function ArticleWorkspaceRouteView() {
  const { articleId } = useParams({ strict: false }) as {
    articleId: string;
  };
  return <ArticleWorkspacePage articleId={articleId} />;
}

const articleWorkspaceRoute = createRoute({
  component: ArticleWorkspaceRouteView,
  getParentRoute: () => rootRoute,
  path: '/articles/$articleId',
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

function AssetsDetailRouteView() {
  const { assetId } = useParams({ strict: false }) as { assetId: string };
  return <AssetsDetailPage assetId={assetId} />;
}

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
