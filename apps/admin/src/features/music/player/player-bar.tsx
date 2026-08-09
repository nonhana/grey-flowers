import { cn } from 'cnfast';
import {
  Disc3,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { usePlayerStore, type LoopMode } from '@/store/player.js';
import { AssetImage, IconButton } from '@/ui/index.js';

import { SeekRow } from './seek-row.js';
import { TrackSlider } from './track-slider.js';

const LOOP_LABEL: Record<LoopMode, string> = {
  off: '顺序播放',
  all: '列表循环',
  one: '单曲循环',
  shuffle: '随机播放',
};

const LOOP_ICON: Record<LoopMode, typeof Repeat> = {
  off: Repeat,
  all: Repeat,
  one: Repeat1,
  shuffle: Shuffle,
};

const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => {
  if (muted || volume === 0) return <VolumeX aria-hidden />;
  if (volume < 0.3) return <Volume1 aria-hidden />;
  if (volume < 0.7) return <Volume1 aria-hidden />;
  return <Volume2 aria-hidden />;
};

/** 桌面 docked 播放条：跨路由常驻，挂在 ConsoleShell 底部。 */
export const PlayerBar = () => {
  const track = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const loopMode = usePlayerStore((s) => s.loopMode);
  const muted = usePlayerStore((s) => s.muted);
  const volume = usePlayerStore((s) => s.volume);
  const hasPrev = usePlayerStore(
    (s) =>
      s.playlist.length > 0 &&
      (s.loopMode !== 'shuffle' ||
        s.shuffleHistory.length > 0 ||
        s.currentTime > 3),
  );
  const hasNext = usePlayerStore(
    (s) =>
      s.playlist.length > 0 &&
      (s.loopMode !== 'off' || s.currentIndex < s.playlist.length - 1),
  );
  const prev = usePlayerStore((s) => s.prev);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const cycleLoopMode = usePlayerStore((s) => s.cycleLoopMode);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const stop = usePlayerStore((s) => s.stop);

  if (track === null) return null;

  const LoopIcon = LOOP_ICON[loopMode];
  const loopActive = loopMode !== 'off';
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';

  return (
    <div
      className="
        hidden h-16 shrink-0 items-center gap-3 border-t border-rule px-4
        lg:flex
      "
    >
      <div
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
          <Disc3 aria-hidden className="size-5 text-ink-dim" />
        )}
      </div>

      <span
        className="
          grid min-w-0 flex-1 gap-0.5
          lg:max-w-44
        "
      >
        <span className="truncate text-sm text-ink-strong">{track.title}</span>
        <span className="truncate text-2xs text-ink-dim">
          {track.artist || '未知艺术家'}
        </span>
      </span>

      <span className="flex items-center gap-1">
        <IconButton
          label="上一首"
          isDisabled={!hasPrev}
          onPress={prev}
          size="sm"
        >
          <SkipBack aria-hidden />
        </IconButton>
        <IconButton
          label={isPlaying ? '暂停' : '播放'}
          onPress={toggle}
          tone="solid"
        >
          {isLoading ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : isPlaying ? (
            <Pause aria-hidden />
          ) : (
            <Play aria-hidden />
          )}
        </IconButton>
        <IconButton
          label="下一首"
          isDisabled={!hasNext}
          onPress={next}
          size="sm"
        >
          <SkipForward aria-hidden />
        </IconButton>
      </span>

      <SeekRow
        className="
          hidden
          xl:flex
        "
      />

      <span
        className="
          hidden items-center gap-3
          xl:flex
        "
      >
        <IconButton
          className={cn(loopActive && 'text-accent-text')}
          label={LOOP_LABEL[loopMode]}
          onPress={cycleLoopMode}
          size="sm"
        >
          <LoopIcon aria-hidden />
        </IconButton>
        <span className="flex items-center gap-1">
          <IconButton
            label={muted ? '取消静音' : '静音'}
            onPress={toggleMute}
            size="sm"
          >
            <VolumeIcon muted={muted} volume={volume} />
          </IconButton>
          <TrackSlider
            className="w-24"
            label="音量"
            maxValue={1}
            onChange={setVolume}
            value={muted ? 0 : volume}
          />
        </span>
      </span>
      <IconButton label="停止播放" onPress={stop} size="sm">
        <X aria-hidden />
      </IconButton>
    </div>
  );
};
