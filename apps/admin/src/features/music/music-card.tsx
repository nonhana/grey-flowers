import type { MusicAdmin } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { Disc3, Info, Pause, Pencil, Play, Trash2 } from 'lucide-react';

import { formatDuration } from '@/lib/format.js';
import {
  AssetImage,
  buttonClass,
  IconButton,
  MetaLine,
  StatusReadout,
} from '@/ui/index.js';

export const MusicCard = ({
  isCurrent,
  isPlaying,
  music,
  onDelete,
  onEdit,
  onPlayToggle,
}: {
  isCurrent: boolean;
  isPlaying: boolean;
  music: MusicAdmin;
  onDelete: () => void;
  onEdit: () => void;
  onPlayToggle: () => void;
}) => {
  const cover = music.coverAsset?.deliveryUrl ?? music.cover;
  const playLabel =
    isCurrent && isPlaying ? `暂停 ${music.title}` : `播放 ${music.title}`;

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden rounded-panel border
        border-rule bg-case-raised transition-colors
        hover:border-accent-rule
      "
    >
      <div
        className="
          relative grid min-h-[10.5rem] flex-1 place-items-center overflow-hidden
          border-b border-rule bg-well
        "
      >
        {cover ? (
          <AssetImage
            alt=""
            className="absolute inset-0 size-full object-cover"
            src={cover}
          />
        ) : (
          <Disc3 aria-hidden className="size-8 text-ink-dim" />
        )}

        {/* 桌面：整块封面即播放开关，hover/聚焦时揭示遮罩与圆钮。 */}
        <button
          aria-label={playLabel}
          className="
            absolute inset-0 hidden place-items-center
            md:grid
          "
          onClick={onPlayToggle}
          type="button"
        >
          <span
            className={cn(
              'absolute inset-0 grid place-items-center bg-scrim/40',
              !isCurrent &&
                `
                  opacity-0 transition-opacity
                  group-focus-within:opacity-100
                  group-hover:opacity-100
                `,
            )}
          >
            <span
              className="
                grid size-11 place-items-center rounded-full bg-accent
                text-accent-on
              "
            >
              {isCurrent && isPlaying ? (
                <Pause aria-hidden />
              ) : (
                <Play aria-hidden />
              )}
            </span>
          </span>
        </button>

        {/* 移动端：封面不可点，提供常显的显式播放/暂停圆钮。 */}
        <button
          aria-label={playLabel}
          className="
            absolute inset-0 m-auto grid size-11 place-items-center rounded-full
            bg-accent text-accent-on shadow-float transition-colors
            hover:bg-accent-hover
            md:hidden
          "
          onClick={onPlayToggle}
          type="button"
        >
          {isCurrent && isPlaying ? (
            <Pause aria-hidden className="size-5" />
          ) : (
            <Play aria-hidden className="size-5" />
          )}
        </button>
      </div>

      <div className="grid gap-1 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base text-ink-strong">
            {music.title}
          </span>
          {music.inActivity ? (
            <StatusReadout label="动态中" tone="busy" />
          ) : null}
        </div>
        <MetaLine>
          <span className="truncate">{music.artist || '未知艺术家'}</span>
          <span className="truncate">{music.album || '未知专辑'}</span>
          <span className="ml-auto">{formatDuration(music.seconds)}</span>
        </MetaLine>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="truncate font-mono text-2xs text-ink-dim">
            {isCurrent
              ? isPlaying
                ? '播放中'
                : '已暂停'
              : `#${String(music.id)}`}
          </span>
          <span className="flex shrink-0 gap-1.5">
            <Link
              aria-label={`查看 ${music.title} 的信息`}
              className={buttonClass({
                className: 'size-8 px-0 [&_svg]:size-3.5',
                size: 'sm',
                tone: 'quiet',
              })}
              params={{ musicId: String(music.id) }}
              to="/music/$musicId"
            >
              <Info aria-hidden />
            </Link>
            <IconButton
              label={`编辑 ${music.title}`}
              onPress={onEdit}
              size="sm"
              tone="quiet"
            >
              <Pencil aria-hidden />
            </IconButton>
            <IconButton
              label={`删除 ${music.title}`}
              onPress={onDelete}
              size="sm"
              tone="warnish"
            >
              <Trash2 aria-hidden />
            </IconButton>
          </span>
        </div>
      </div>
    </article>
  );
};
