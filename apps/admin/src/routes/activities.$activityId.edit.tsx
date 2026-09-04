import { createFileRoute } from '@tanstack/react-router';

import { ActivityComposePage } from '@/features/activities/compose-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/activities/$activityId/edit')({
  staticData: { fullBleed: true },
  component: ActivityComposePage,
  pendingComponent: RoutePending,
});
