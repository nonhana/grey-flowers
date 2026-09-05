import { createFileRoute } from '@tanstack/react-router';

import { NewArticlePage } from '@/features/articles/new-article-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/articles/new')({
  component: NewArticlePage,
  pendingComponent: RoutePending,
});
