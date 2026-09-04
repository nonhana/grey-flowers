import { createFileRoute } from '@tanstack/react-router';

import { AssetsDetailPage } from '@/features/assets/detail-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/assets/$assetId')({
  component: AssetsDetailPage,
  pendingComponent: RoutePending,
});
