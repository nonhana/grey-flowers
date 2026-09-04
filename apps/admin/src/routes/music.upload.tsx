import { createFileRoute } from '@tanstack/react-router';

import { MusicUploadPage } from '@/features/music/upload-page.js';
import { RoutePending } from '@/ui/route-pending.js';

export const Route = createFileRoute('/music/upload')({
  component: MusicUploadPage,
  pendingComponent: RoutePending,
});
