import { createFileRoute } from '@tanstack/react-router';

import { ArticleWorkspacePage } from '@/features/articles/workspace-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/articles/$articleId')({
  staticData: { fullBleed: true },
  component: ArticleWorkspacePage,
  pendingComponent: RoutePending,
});
