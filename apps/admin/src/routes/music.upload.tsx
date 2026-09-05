import { createFileRoute } from '@tanstack/react-router';

import { MusicUploadPage } from '@/features/music/upload-page';
import { RoutePending } from '@/ui/route-pending';

export const Route = createFileRoute('/music/upload')({
  component: MusicUploadPage,
  pendingComponent: RoutePending,
});
