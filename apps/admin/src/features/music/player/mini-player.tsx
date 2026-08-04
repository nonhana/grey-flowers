import { Disc3, Loader2, Pause, Play, SkipForward } from 'lucide-react';

import { AssetImage, IconButton } from '@/ui/index.js';

import { audioPlayer, useAudioPlayer } from './audio-player-store.js';

/** 移动端悬浮 mini-card：悬于底部 tab 之上，点主体展开全屏「正在播放」。 */
export const MiniPlayer = ({ onOpen }: { onOpen: () => void }) => {
  const player = useAudioPlayer();
  const track = player.currentTrack;
  if (track === null) return null;

  const isPlaying = player.status === 'playing';
  const isLoading = player.status === 'loading';

  return (
    <div
      className="
        fixed right-20 bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3
        z-40
        lg:hidden
      "
    >
      <div
        className="
          flex items-center gap-1 rounded-panel border border-rule
          bg-case-raised p-2 shadow-float
        "
      >
        <button
          aria-label={`展开正在播放：${track.title}`}
          className="
            flex min-w-0 flex-1 items-center gap-3 rounded-control px-1 py-0.5
            text-left
          "
          onClick={onOpen}
          type="button"
        >
          <span
            className="
              grid size-10 shrink-0 place-items-center overflow-hidden
              rounded-control bg-well
            "
          >
            {track.cover ? (
              <AssetImage
                alt=""
                className="size-full object-cover"
                src={track.cover}
              />
            ) : (
              <Disc3 aria-hidden="true" className="size-5 text-ink-dim" />
            )}
          </span>
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate text-sm text-ink-strong">
              {track.title}
            </span>
            <span className="truncate text-2xs text-ink-dim">
              {track.artist || '未知艺术家'}
            </span>
          </span>
        </button>
        <IconButton
          label={isPlaying ? '暂停' : '播放'}
          onPress={audioPlayer.toggle}
          tone="quiet"
        >
          {isLoading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : isPlaying ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </IconButton>
        <IconButton
          label="下一首"
          isDisabled={!player.hasNext}
          onPress={audioPlayer.next}
          tone="quiet"
        >
          <SkipForward aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
};
