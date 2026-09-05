import { createFileRoute } from '@tanstack/react-router';

import { MusicDetailPage } from '@/features/music/detail-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/music/$musicId')({
  component: MusicDetailPage,
  pendingComponent: RoutePending,
});
