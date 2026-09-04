import { createFileRoute } from '@tanstack/react-router';

import { ActivityComposePage } from '@/features/activities/compose-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/activities/new')({
  staticData: { fullBleed: true },
  component: ActivityComposePage,
  pendingComponent: RoutePending,
});
