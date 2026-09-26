import type { FriendAdmin } from '@grey-flowers/contracts';

import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react';

import { IconButton } from '@/ui/button';
import { Skeleton } from '@/ui/feedback';
import { AssetImage } from '@/ui/image';

export const FriendItem = ({
  busy,
  friend,
  isBottom,
  isTop,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
}: {
  busy: boolean;
  friend: FriendAdmin;
  isBottom: boolean;
  isTop: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
}) => (
  <div className="flex items-center gap-4 px-4 py-3">
    <div
      className="
        grid size-12 shrink-0 place-items-center overflow-hidden rounded-control
        bg-well
      "
    >
      <AssetImage
        alt={`${friend.site} 头像`}
        className="size-full object-cover"
        src={friend.image}
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-md text-ink-strong">
        {friend.site}
        <span className="ml-2 text-2xs text-ink-dim">{friend.owner}</span>
      </p>
      <p className="truncate font-mono text-2xs text-ink-dim">{friend.url}</p>
    </div>
    <div className="flex shrink-0 gap-1.5">
      <IconButton
        isDisabled={busy || isTop}
        label={`上移友链 ${friend.site}`}
        onPress={onMoveUp}
        size="sm"
        tone="quiet"
      >
        <ArrowUp aria-hidden />
      </IconButton>
      <IconButton
        isDisabled={busy || isBottom}
        label={`下移友链 ${friend.site}`}
        onPress={onMoveDown}
        size="sm"
        tone="quiet"
      >
        <ArrowDown aria-hidden />
      </IconButton>
      <IconButton
        label={`编辑友链 ${friend.site}`}
        onPress={onEdit}
        size="sm"
        tone="quiet"
      >
        <Pencil aria-hidden />
      </IconButton>
      <IconButton
        label={`删除友链 ${friend.site}`}
        onPress={onDelete}
        size="sm"
        tone="warnish"
      >
        <Trash2 aria-hidden />
      </IconButton>
    </div>
  </div>
);

export const FriendItemSkeleton = () => (
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
