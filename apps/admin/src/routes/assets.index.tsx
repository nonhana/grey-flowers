import { createFileRoute } from '@tanstack/react-router';

import { AssetsListPage } from '@/features/assets/list-page';
import { assetsSearchSchema } from '@/features/assets/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/assets/')({
  validateSearch: assetsSearchSchema,
  component: AssetsListPage,
  pendingComponent: RoutePending,
});
