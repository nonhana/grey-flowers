import { createFileRoute } from '@tanstack/react-router';

import { UsersPage } from '@/features/users/list-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/users')({
  component: UsersPage,
  pendingComponent: RoutePending,
});
