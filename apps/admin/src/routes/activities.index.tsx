import { createFileRoute } from '@tanstack/react-router';

import { ActivitiesPage } from '@/features/activities/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/activities/')({
  component: ActivitiesPage,
  pendingComponent: RoutePending,
});
