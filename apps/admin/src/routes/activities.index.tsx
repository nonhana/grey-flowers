import { createFileRoute } from '@tanstack/react-router';

import { ActivitiesPage } from '@/features/activities/list-page';
import { activitiesSearchSchema } from '@/features/activities/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/activities/')({
  validateSearch: activitiesSearchSchema,
  component: ActivitiesPage,
  pendingComponent: RoutePending,
});
