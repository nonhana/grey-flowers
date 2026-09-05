import { createFileRoute } from '@tanstack/react-router';

import { UsersPage } from '@/features/users/list-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/users')({
  component: UsersPage,
  pendingComponent: RoutePending,
});
