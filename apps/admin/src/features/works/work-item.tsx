import type { WorkAdmin } from '@grey-flowers/contracts';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

import { IconButton } from '@/ui/button';
import { Skeleton } from '@/ui/feedback';
import { AssetImage } from '@/ui/image';

export const WorkItem = ({
  busy,
  isBottom,
  isTop,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
  work,
}: {
  busy: boolean;
  isBottom: boolean;
  isTop: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  work: WorkAdmin;
}) => (
  <div className="flex items-center gap-4 px-4 py-3">
    <div
      className="
        grid size-12 shrink-0 place-items-center overflow-hidden rounded-control
        bg-well
      "
    >
      <AssetImage
        alt={`${work.site} 配图`}
        className="size-full object-cover"
        src={work.image}
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-md text-ink-strong">
        {work.site}
        <span className="ml-2 text-2xs text-ink-dim">{work.owner}</span>
      </p>
      <p className="truncate font-mono text-2xs text-ink-dim">{work.url}</p>
    </div>
    <div className="flex shrink-0 gap-1.5">
      <IconButton
        isDisabled={busy || isTop}
        label={`上移作品 ${work.site}`}
        onPress={onMoveUp}
        size="sm"
        tone="quiet"
      >
        <ArrowUp aria-hidden />
      </IconButton>
      <IconButton
        isDisabled={busy || isBottom}
        label={`下移作品 ${work.site}`}
        onPress={onMoveDown}
        size="sm"
        tone="quiet"
      >
        <ArrowDown aria-hidden />
      </IconButton>
      <IconButton
        label={`编辑作品 ${work.site}`}
        onPress={onEdit}
        size="sm"
        tone="quiet"
      >
        <Pencil aria-hidden />
      </IconButton>
      <IconButton
        label={`删除作品 ${work.site}`}
        onPress={onDelete}
        size="sm"
        tone="warnish"
      >
        <Trash2 aria-hidden />
      </IconButton>
    </div>
  </div>
);

export const WorkItemSkeleton = () => (
  <div aria-hidden className="flex items-center gap-4 px-4 py-3">
    <Skeleton className="size-12 shrink-0 rounded-control" />
    <div className="min-w-0 flex-1">
      <Skeleton className="h-[1.6em] w-40 text-md" />
      <Skeleton className="h-[1.45em] w-52 text-2xs" />
    </div>
    <div className="flex shrink-0 gap-1.5">
      <Skeleton className="size-8 rounded-control" />
      <Skeleton className="size-8 rounded-control" />
    </div>
  </div>
);
