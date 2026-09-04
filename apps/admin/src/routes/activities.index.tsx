import { createFileRoute } from '@tanstack/react-router';

import { ActivitiesPage } from '@/features/activities/list-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/activities/')({
  component: ActivitiesPage,
  pendingComponent: RoutePending,
});
