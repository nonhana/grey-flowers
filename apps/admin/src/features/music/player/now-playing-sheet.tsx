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
import { useEffect } from 'react';

import { usePlayerStore, type LoopMode } from '@/store/player.js';
import { Button, IconButton } from '@/ui/button.js';
import { AssetImage } from '@/ui/image.js';
import { BottomSheet } from '@/ui/overlay.js';

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
  return volume < 0.7 ? <Volume1 aria-hidden /> : <Volume2 aria-hidden />;
};

/** 移动端全屏「正在播放」面板。 */
export const NowPlayingSheet = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
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

  // 曲目被清空（停止、删曲）而浮层还开着时，自动收起浮层。
  useEffect(() => {
    if (track === null && isOpen) onOpenChange(false);
  }, [isOpen, onOpenChange, track]);

  const LoopIcon = LOOP_ICON[loopMode];
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';

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
              <Disc3 aria-hidden className="size-12 text-ink-dim" />
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

          <SeekRow layout="stack" />

          <div className="flex items-center justify-center gap-3">
            <IconButton label="上一首" isDisabled={!hasPrev} onPress={prev}>
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
            <IconButton label="下一首" isDisabled={!hasNext} onPress={next}>
              <SkipForward aria-hidden />
            </IconButton>
          </div>

          <div
            className={cn(
              'flex items-center justify-center gap-3',
              'rounded-control border border-rule p-2',
            )}
          >
            <IconButton
              label={muted ? '取消静音' : '静音'}
              onPress={toggleMute}
              size="sm"
            >
              <VolumeIcon muted={muted} volume={volume} />
            </IconButton>
            <TrackSlider
              className="max-w-40 flex-1"
              label="音量"
              maxValue={1}
              onChange={setVolume}
              value={muted ? 0 : volume}
            />
            <IconButton
              className={cn(loopMode !== 'off' && 'text-accent-text')}
              label={LOOP_LABEL[loopMode]}
              onPress={cycleLoopMode}
              size="sm"
            >
              <LoopIcon aria-hidden />
            </IconButton>
          </div>

          <Button
            className="w-full"
            icon={<X aria-hidden />}
            onPress={() => {
              onOpenChange(false);
              stop();
            }}
            tone="quiet"
          >
            停止播放
          </Button>
        </div>
      ) : null}
    </BottomSheet>
  );
};
