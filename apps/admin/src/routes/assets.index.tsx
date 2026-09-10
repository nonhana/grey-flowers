import { createFileRoute } from '@tanstack/react-router';

import { assetsSearchSchema } from '@/features/assets/display';
import { AssetsListPage } from '@/features/assets/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/assets/')({
  validateSearch: assetsSearchSchema,
  component: AssetsListPage,
  pendingComponent: RoutePending,
});
