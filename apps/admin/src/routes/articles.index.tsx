import { createFileRoute } from '@tanstack/react-router';

import { articlesSearchSchema } from '@/features/articles/display';
import { ArticlesListPage } from '@/features/articles/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/articles/')({
  validateSearch: articlesSearchSchema,
  component: ArticlesListPage,
  pendingComponent: RoutePending,
});
