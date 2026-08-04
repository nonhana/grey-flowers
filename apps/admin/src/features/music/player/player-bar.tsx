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
} from 'lucide-react';

import { formatDuration } from '@/lib/format.js';
import { AssetImage, IconButton } from '@/ui/index.js';

import {
  audioPlayer,
  type LoopMode,
  useAudioPlayer,
} from './audio-player-store.js';
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
  if (muted || volume === 0) return <VolumeX aria-hidden="true" />;
  if (volume < 0.3) return <Volume1 aria-hidden="true" />;
  if (volume < 0.7) return <Volume1 aria-hidden="true" />;
  return <Volume2 aria-hidden="true" />;
};

/** 桌面 docked 播放条：跨路由常驻，挂在 ConsoleShell 底部。 */
export const PlayerBar = () => {
  const player = useAudioPlayer();
  const track = player.currentTrack;
  if (track === null) return null;

  const LoopIcon = LOOP_ICON[player.loopMode];
  const loopActive = player.loopMode !== 'off';
  const isPlaying = player.status === 'playing';
  const isLoading = player.status === 'loading';

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
          <Disc3 aria-hidden="true" className="size-5 text-ink-dim" />
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
          isDisabled={!player.hasPrev}
          onPress={audioPlayer.prev}
          size="sm"
        >
          <SkipBack aria-hidden="true" />
        </IconButton>
        <IconButton
          label={isPlaying ? '暂停' : '播放'}
          onPress={audioPlayer.toggle}
          tone="solid"
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
          size="sm"
        >
          <SkipForward aria-hidden="true" />
        </IconButton>
      </span>

      <span
        className="
          hidden min-w-0 flex-1 items-center gap-2
          xl:flex
        "
      >
        <span
          className="
            w-10 shrink-0 text-right font-mono text-2xs text-ink-dim
            tabular-nums
          "
        >
          {formatDuration(player.currentTime)}
        </span>
        <TrackSlider
          className="flex-1"
          label="播放进度"
          maxValue={player.duration}
          onChange={audioPlayer.seek}
          value={Math.min(player.currentTime, player.duration)}
        />
        <span className="w-10 shrink-0 font-mono text-2xs text-ink-dim tabular-nums">
          {formatDuration(player.duration)}
        </span>
      </span>

      <span
        className="
          hidden items-center gap-3
          xl:flex
        "
      >
        <IconButton
          className={cn(loopActive && 'text-accent-text')}
          label={LOOP_LABEL[player.loopMode]}
          onPress={audioPlayer.cycleLoopMode}
          size="sm"
        >
          <LoopIcon aria-hidden="true" />
        </IconButton>
        <span className="flex items-center gap-1">
          <IconButton
            label={player.muted ? '取消静音' : '静音'}
            onPress={audioPlayer.toggleMute}
            size="sm"
          >
            <VolumeIcon muted={player.muted} volume={player.volume} />
          </IconButton>
          <TrackSlider
            className="w-24"
            label="音量"
            maxValue={1}
            onChange={audioPlayer.setVolume}
            value={player.muted ? 0 : player.volume}
          />
        </span>
      </span>
    </div>
  );
};
