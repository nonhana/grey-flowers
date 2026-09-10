import { createFileRoute } from '@tanstack/react-router';

import { UsersPage } from '@/features/users/list-page';
import { usersSearchSchema } from '@/features/users/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/users')({
  validateSearch: usersSearchSchema,
  component: UsersPage,
  pendingComponent: RoutePending,
});
