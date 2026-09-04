import { createFileRoute } from '@tanstack/react-router';

import { CategoriesPage } from '@/features/taxonomy/categories-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
  pendingComponent: RoutePending,
});
