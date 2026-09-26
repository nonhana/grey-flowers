import { createFileRoute } from '@tanstack/react-router';

import { WorksPage } from '@/features/works/works-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/works/')({
  component: WorksPage,
  pendingComponent: RoutePending,
});
