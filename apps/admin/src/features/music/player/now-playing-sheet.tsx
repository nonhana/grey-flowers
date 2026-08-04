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
import { AssetImage, BottomSheet, IconButton } from '@/ui/index.js';

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
  return volume < 0.7 ? (
    <Volume1 aria-hidden="true" />
  ) : (
    <Volume2 aria-hidden="true" />
  );
};

/** 移动端全屏「正在播放」面板。 */
export const NowPlayingSheet = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const player = useAudioPlayer();
  const track = player.currentTrack;

  const LoopIcon = LOOP_ICON[player.loopMode];
  const isPlaying = player.status === 'playing';
  const isLoading = player.status === 'loading';

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange} title="正在播放">
      {track ? (
        <div className="grid gap-6 px-5 pt-2 pb-6">
          <div
            className="
              mx-auto grid aspect-square w-full max-w-80 place-items-center
              overflow-hidden rounded-panel bg-well
            "
          >
            {track.cover ? (
              <AssetImage
                alt=""
                className="size-full object-cover"
                src={track.cover}
              />
            ) : (
              <Disc3 aria-hidden="true" className="size-12 text-ink-dim" />
            )}
          </div>

          <div className="grid gap-1 text-center">
            <p className="truncate text-lg font-bold text-ink-strong">
              {track.title}
            </p>
            <p className="truncate text-base text-ink-dim">
              {[track.artist, track.album].filter(Boolean).join(' · ') ||
                '未知艺术家'}
            </p>
          </div>

          <div className="grid gap-2">
            <TrackSlider
              label="播放进度"
              maxValue={player.duration}
              onChange={audioPlayer.seek}
              value={Math.min(player.currentTime, player.duration)}
            />
            <div
              className="
                flex justify-between font-mono text-2xs text-ink-dim
                tabular-nums
              "
            >
              <span>{formatDuration(player.currentTime)}</span>
              <span>{formatDuration(player.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <IconButton
              label="上一首"
              isDisabled={!player.hasPrev}
              onPress={audioPlayer.prev}
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
            >
              <SkipForward aria-hidden="true" />
            </IconButton>
          </div>

          <div
            className={cn(
              'flex items-center justify-center gap-3',
              'rounded-control border border-rule p-2',
            )}
          >
            <IconButton
              label={player.muted ? '取消静音' : '静音'}
              onPress={audioPlayer.toggleMute}
              size="sm"
            >
              <VolumeIcon muted={player.muted} volume={player.volume} />
            </IconButton>
            <TrackSlider
              className="max-w-40 flex-1"
              label="音量"
              maxValue={1}
              onChange={audioPlayer.setVolume}
              value={player.muted ? 0 : player.volume}
            />
            <IconButton
              className={cn(player.loopMode !== 'off' && 'text-accent-text')}
              label={LOOP_LABEL[player.loopMode]}
              onPress={audioPlayer.cycleLoopMode}
              size="sm"
            >
              <LoopIcon aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
};
