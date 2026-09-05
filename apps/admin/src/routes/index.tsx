import { createFileRoute } from '@tanstack/react-router';

import { OverviewPage } from '@/features/overview/overview-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/')({
  component: OverviewPage,
  pendingComponent: RoutePending,
});
