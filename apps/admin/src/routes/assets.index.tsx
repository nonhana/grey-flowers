import { createFileRoute } from '@tanstack/react-router';

import { parseAssetStatusFilter } from '@/features/assets/display.js';
import { AssetsListPage } from '@/features/assets/list-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/assets/')({
  validateSearch: (search) => {
    const status = parseAssetStatusFilter(search.status);
    return status === 'all' ? {} : { status };
  },
  component: AssetsListPage,
  pendingComponent: RoutePending,
});
