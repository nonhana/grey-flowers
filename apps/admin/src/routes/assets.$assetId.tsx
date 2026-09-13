import { createFileRoute } from '@tanstack/react-router';

import { AssetsDetailPage } from '@/features/assets/detail-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/assets/$assetId')({
  component: AssetsDetailPage,
  pendingComponent: RoutePending,
});
