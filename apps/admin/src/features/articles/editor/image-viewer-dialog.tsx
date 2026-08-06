import { ExternalLink } from 'lucide-react';

import { AppDialog, Button } from '@/ui/index.js';

export const ImageViewerDialog = ({
  onClose,
  onExited,
  open,
  viewer,
}: {
  onClose: () => void;
  onExited?: () => void;
  open: boolean;
  viewer: { src: string; alt: string; assetId: string | null } | null;
}) => (
  <AppDialog
    isOpen={open}
    onExited={onExited}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}
    size="lg"
    title={viewer?.alt || '正文图片'}
  >
    {viewer ? (
      <div className="grid gap-3">
        {viewer.assetId ? (
          <p className="font-mono text-2xs text-ink-dim">
            受管资产 · id {viewer.assetId}
          </p>
        ) : null}
        <img
          alt={viewer.alt || '正文图片'}
          className="max-h-[70dvh] w-full rounded-sheet object-contain"
          src={viewer.src}
        />
        <div className="flex justify-end">
          <Button
            icon={<ExternalLink aria-hidden="true" />}
            onPress={() => window.open(viewer.src, '_blank', 'noopener')}
            size="sm"
            tone="ghost"
          >
            在新标签打开原图
          </Button>
        </div>
      </div>
    ) : null}
  </AppDialog>
);
