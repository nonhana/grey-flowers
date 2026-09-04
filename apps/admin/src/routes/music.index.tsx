import { createFileRoute } from '@tanstack/react-router';

import { MusicLibraryPage } from '@/features/music/list-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/music/')({
  validateSearch: (search) =>
    search.incomplete === true ? { incomplete: true } : {},
  component: MusicLibraryPage,
  pendingComponent: RoutePending,
});
