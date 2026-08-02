import {
  createRoute,
  createRootRoute,
  createRouter,
  Outlet,
  useNavigate,
  useParams,
} from '@tanstack/react-router';
import { useEffect } from 'react';

import { AssetsDetailPage } from '../features/assets/detail-page.js';
import { AssetsListPage } from '../features/assets/list-page.js';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

function RedirectToAssets() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: '/assets' });
  }, [navigate]);

  return null;
}

const indexRoute = createRoute({
  component: RedirectToAssets,
  getParentRoute: () => rootRoute,
  path: '/',
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
  assetsDetailRoute,
  assetsListRoute,
  indexRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
