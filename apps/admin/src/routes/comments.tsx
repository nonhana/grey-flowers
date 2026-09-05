import { createFileRoute } from '@tanstack/react-router';

import { CommentsPage } from '@/features/comments/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/comments')({
  component: CommentsPage,
  pendingComponent: RoutePending,
});
