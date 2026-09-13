import { createFileRoute } from '@tanstack/react-router';

import { ActivityComposePage } from '@/features/activities/compose-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/activities/$activityId/edit')({
  staticData: { fullBleed: true },
  component: ActivityComposePage,
  pendingComponent: RoutePending,
});
