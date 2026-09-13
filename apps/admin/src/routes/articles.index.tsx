import { createFileRoute } from '@tanstack/react-router';

import { ArticlesListPage } from '@/features/articles/list-page';
import { articlesSearchSchema } from '@/features/articles/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/articles/')({
  validateSearch: articlesSearchSchema,
  component: ArticlesListPage,
  pendingComponent: RoutePending,
});
