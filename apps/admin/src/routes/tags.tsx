import { createFileRoute } from '@tanstack/react-router';

import { TagsPage } from '@/features/taxonomy/tags-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/tags')({
  component: TagsPage,
  pendingComponent: RoutePending,
});
