import { cn } from 'cnfast';
import { Slider, SliderThumb, SliderTrack } from 'react-aria-components';

/**
 * 可拖拽进度/音量条。RAC Slider 负责指针/键盘/ARIA；
 * 手柄静止时隐藏，悬停或拖动时浮现 —— 进度条自身描出所在位置。
 */
export const TrackSlider = ({
  className,
  label,
  maxValue,
  onChange,
  value,
}: {
  className?: string;
  label: string;
  maxValue: number;
  onChange: (value: number) => void;
  value: number;
}) => (
  <Slider
    aria-label={label}
    className={cn('group/slider min-w-0 touch-none', className)}
    maxValue={Math.max(maxValue, 0)}
    minValue={0}
    onChange={(next: number | number[]) => {
      const resolved = Array.isArray(next) ? (next[0] ?? 0) : next;
      onChange(Math.max(0, Math.min(Math.max(maxValue, 0), resolved)));
    }}
    step={0.1}
    value={value}
  >
    <SliderTrack className="relative h-1.5 w-full cursor-pointer rounded-full bg-rule">
      {({ state }) => (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-full bg-accent"
            style={{ width: `${state.getThumbPercent(0) * 100}%` }}
          />
          <SliderThumb
            className={cn(
              'top-1/2 size-3 rounded-full bg-accent shadow-sm outline-none',
              'opacity-0 transition-opacity',
              'group-hover/slider:opacity-100',
              `
                data-dragging:opacity-100
                data-focus-visible:opacity-100
              `,
            )}
            style={{ transform: 'translateY(-50%)' }}
          />
        </>
      )}
    </SliderTrack>
  </Slider>
);
