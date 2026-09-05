import { cn } from 'cn';
import { useShallow } from 'zustand/react/shallow';

import { formatDuration } from '@/lib/format';
import { usePlayerStore } from '@/store/player';

import { TrackSlider } from './track-slider';

/**
 * 播放进度区：独占 currentTime/duration 的订阅，把 timeupdate 每秒 4~10 次的
 * 高频重渲染隔离在自身，桌面播放条与移动端「正在播放」面板不再随进度 tick 重渲染。
 * layout='row' 对齐桌面 docked 条（当前/总时长分别位于滑条两侧）；
 * layout='stack' 对齐移动端面板（滑条在上、时长一行在下）。
 */
export const SeekRow = ({
  className,
  layout = 'row',
}: {
  className?: string;
  layout?: 'row' | 'stack';
}) => {
  const { t, d } = usePlayerStore(
    useShallow((s) => ({ t: s.currentTime, d: s.duration })),
  );
  const seek = usePlayerStore((s) => s.seek);
  const value = Math.min(t, d);
  const current = formatDuration(value);
  const total = formatDuration(d);

  if (layout === 'row') {
    return (
      <span className={cn('min-w-0 flex-1 items-center gap-2', className)}>
        <span
          className="
            w-10 shrink-0 text-right font-mono text-2xs text-ink-dim
            tabular-nums
          "
        >
          {current}
        </span>
        <TrackSlider
          className="flex-1"
          label="播放进度"
          maxValue={d}
          onChange={seek}
          value={value}
        />
        <span className="w-10 shrink-0 font-mono text-2xs text-ink-dim tabular-nums">
          {total}
        </span>
      </span>
    );
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <TrackSlider
        label="播放进度"
        maxValue={d}
        onChange={seek}
        value={value}
      />
      <div
        className="
          flex justify-between font-mono text-2xs text-ink-dim tabular-nums
        "
      >
        <span>{current}</span>
        <span>{total}</span>
      </div>
    </div>
  );
};
