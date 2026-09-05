import { createFileRoute } from '@tanstack/react-router';

import { CategoriesPage } from '@/features/taxonomy/categories-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
  pendingComponent: RoutePending,
});
