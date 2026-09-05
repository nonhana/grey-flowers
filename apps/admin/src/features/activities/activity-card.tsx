import type { ActivityAdmin } from '@grey-flowers/contracts';

import { cn } from 'cn';
import { Pause, Pencil, Play, Trash2 } from 'lucide-react';

import { formatDateTime } from '@/lib/format';
import { IconButton } from '@/ui/button';
import { AssetImage } from '@/ui/image';
import { MetaLine } from '@/ui/surface';

import { activityContentPreview, activityImageGridClass } from './display';

export const ActivityCard = ({
  activity,
  onDelete,
  onEdit,
  onPlayTrack,
  playingTrackId,
}: {
  activity: ActivityAdmin;
  onDelete: () => void;
  onEdit: () => void;
  onPlayTrack: (index: number) => void;
  playingTrackId: number | null;
}) => {
  const preview = activityContentPreview(activity.content);
  const imageCount = activity.images.length;

  return (
    <article
      className="
        grid gap-3 rounded-panel border border-rule bg-case-raised p-4
        transition-colors
        hover:border-accent-rule
      "
    >
      {preview ? (
        <p
          className="
            m-0 line-clamp-5 text-base/relaxed whitespace-pre-line text-ink
          "
        >
          {preview}
        </p>
      ) : null}

      {imageCount > 0 ? (
        <div className={cn('grid gap-1', activityImageGridClass(imageCount))}>
          {activity.images.map((image) => (
            <span
              className="
                aspect-square w-full overflow-hidden rounded-control bg-well
              "
              key={image.url}
            >
              <AssetImage
                alt="动态图片"
                className="size-full object-cover"
                src={image.url}
              />
            </span>
          ))}
        </div>
      ) : null}

      {activity.music.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activity.music.map((track, index) => {
            const isPlaying = track.id === playingTrackId;
            return (
              <button
                aria-label={`${isPlaying ? '暂停' : '播放'} ${track.title}`}
                className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-full border',
                  `
                    border-edge bg-well px-2.5 font-mono text-xs text-ink
                    transition-colors
                  `,
                  'hover:border-accent-rule hover:text-accent-text',
                  isPlaying && 'border-accent-rule text-accent-text',
                )}
                key={track.id}
                onClick={() => onPlayTrack(index)}
                type="button"
              >
                {isPlaying ? (
                  <Pause aria-hidden className="size-3" />
                ) : (
                  <Play aria-hidden className="size-3" />
                )}
                <span className="max-w-40 truncate">{track.title}</span>
                <span className="text-ink-dim">
                  {track.artist || '未知艺术家'}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <MetaLine>
        <span>{formatDateTime(activity.publishedAt)}</span>
        <span className="ml-auto font-mono text-2xs text-ink-dim">
          #{String(activity.id)}
          {activity.editedAt !== activity.publishedAt ? ' · 已编辑' : ''}
        </span>
        <span className="flex shrink-0 gap-1.5">
          <IconButton
            label={`编辑动态 #${String(activity.id)}`}
            onPress={onEdit}
            size="sm"
            tone="quiet"
          >
            <Pencil aria-hidden />
          </IconButton>
          <IconButton
            label={`删除动态 #${String(activity.id)}`}
            onPress={onDelete}
            size="sm"
            tone="warnish"
          >
            <Trash2 aria-hidden />
          </IconButton>
        </span>
      </MetaLine>
    </article>
  );
};
