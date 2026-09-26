import { createFileRoute } from '@tanstack/react-router';

import { FriendsPage } from '@/features/friends/friends-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/friends/')({
  component: FriendsPage,
  pendingComponent: RoutePending,
});
