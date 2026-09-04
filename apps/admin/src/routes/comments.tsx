import { createFileRoute } from '@tanstack/react-router';

import { CommentsPage } from '@/features/comments/list-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/comments')({
  component: CommentsPage,
  pendingComponent: RoutePending,
});
