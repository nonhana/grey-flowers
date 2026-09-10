import { createFileRoute } from '@tanstack/react-router';

import { MusicLibraryPage } from '@/features/music/list-page';
import { musicSearchSchema } from '@/features/music/search';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/music/')({
  validateSearch: musicSearchSchema,
  component: MusicLibraryPage,
  pendingComponent: RoutePending,
});
