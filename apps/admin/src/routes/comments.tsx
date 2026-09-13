import { createFileRoute } from '@tanstack/react-router';

import { CommentsPage } from '@/features/comments/list-page';
import { commentsSearchSchema } from '@/features/comments/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/comments')({
  validateSearch: commentsSearchSchema,
  component: CommentsPage,
  pendingComponent: RoutePending,
});
