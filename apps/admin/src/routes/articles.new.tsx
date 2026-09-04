import { createFileRoute } from '@tanstack/react-router';

import { NewArticlePage } from '@/features/articles/new-article-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/articles/new')({
  component: NewArticlePage,
  pendingComponent: RoutePending,
});
