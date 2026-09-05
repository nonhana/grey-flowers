import { createFileRoute } from '@tanstack/react-router';

import { TagsPage } from '@/features/taxonomy/tags-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/tags')({
  component: TagsPage,
  pendingComponent: RoutePending,
});
