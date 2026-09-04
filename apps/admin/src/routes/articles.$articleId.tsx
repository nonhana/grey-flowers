import { createFileRoute } from '@tanstack/react-router';

import { ArticleWorkspacePage } from '@/features/articles/workspace-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/articles/$articleId')({
  staticData: { fullBleed: true },
  component: ArticleWorkspacePage,
  pendingComponent: RoutePending,
});
