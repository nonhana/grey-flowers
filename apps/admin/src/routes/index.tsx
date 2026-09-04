import { createFileRoute } from '@tanstack/react-router';

import { OverviewPage } from '@/features/overview/overview-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/')({
  component: OverviewPage,
  pendingComponent: RoutePending,
});
