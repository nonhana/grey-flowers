import { createFileRoute } from '@tanstack/react-router';

import { MusicDetailPage } from '@/features/music/detail-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/music/$musicId')({
  component: MusicDetailPage,
  pendingComponent: RoutePending,
});
