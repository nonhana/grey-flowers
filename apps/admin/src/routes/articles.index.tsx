import { createFileRoute } from '@tanstack/react-router';

import { parseStatusFilter } from '@/features/articles/display';
import { ArticlesListPage } from '@/features/articles/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/articles/')({
  validateSearch: (search) => {
    const status = parseStatusFilter(search.status);
    return status === 'all' ? {} : { status };
  },
  component: ArticlesListPage,
  pendingComponent: RoutePending,
});
