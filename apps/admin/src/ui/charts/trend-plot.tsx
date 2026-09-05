import type { OverviewTrendPoint } from '@grey-flowers/contracts';
import type { KeyboardEvent } from 'react';

import { cn } from 'cn';
import { useState } from 'react';

import { monthDay } from './shared.js';

const STAGGER_WINDOW = 160;
const STAGGER_MAX_STEP = 12;

const barCapFor = (length: number) =>
  length <= 7 ? 56 : length <= 14 ? 36 : 20;

const scaleOf = (max: number) => {
  if (max <= 0) return { ticks: [0, 1], top: 1 };

  const rough = max / 4; // 目标 4 格
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const ladder =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  const step = Math.max(1, Math.round(ladder * magnitude));
  const top = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { ticks, top };
};

const dateTickIndices = (length: number): number[] => {
  if (length <= 8) return Array.from({ length }, (_, index) => index);
  const step = Math.max(1, Math.round((length - 1) / 5));
  const indices: number[] = [];
  for (let index = 0; index < length; index += step) indices.push(index);
  if (indices[indices.length - 1] !== length - 1) indices.push(length - 1);
  return indices;
};

export const TrendPlot = ({
  ariaLabel,
  className,
  points,
  unit,
}: {
  ariaLabel: string;
  className?: string;
  points: readonly OverviewTrendPoint[];
  unit: string;
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);

  const last = points.length - 1;
  const activeIndex = hoverIndex ?? cursorIndex ?? last;
  const active = points[activeIndex];
  const isPointing = hoverIndex !== null || cursorIndex !== null;

  if (!active) return null;

  const counts = points.map((point) => point.count);
  const peak = Math.max(0, ...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const mean = points.length === 0 ? 0 : total / points.length;

  const { ticks, top } = scaleOf(peak);
  const barCap = barCapFor(points.length);
  const stagger = Math.min(
    STAGGER_MAX_STEP,
    STAGGER_WINDOW / Math.max(1, last),
  );

  const moveCursor = (event: KeyboardEvent<HTMLDivElement>, next: number) => {
    event.preventDefault();
    setHoverIndex(null);
    setCursorIndex(Math.min(last, Math.max(0, next)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') moveCursor(event, activeIndex - 1);
    else if (event.key === 'ArrowRight') moveCursor(event, activeIndex + 1);
    else if (event.key === 'Home') moveCursor(event, 0);
    else if (event.key === 'End') moveCursor(event, last);
  };

  return (
    <figure className={cn('flex min-h-0 flex-1 flex-col gap-2.5', className)}>
      <figcaption
        className="
          flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1
        "
      >
        <p className="font-mono text-md text-ink-strong" aria-live="polite">
          <span className="text-ink-dim">{monthDay(active.date)}</span>{' '}
          <span className="font-medium">{active.count}</span>
          <span className="text-ink-dim"> {unit}</span>
        </p>
        <p className="font-mono text-2xs text-ink-dim">
          共 {total} · 峰值 {peak} · 日均 {mean.toFixed(1)}
        </p>
      </figcaption>

      <div className="flex min-h-0 flex-1 gap-2">
        <div aria-hidden className="relative w-9 shrink-0">
          {ticks.map((value) => (
            <span
              className="
                absolute right-0 translate-y-1/2 font-mono text-2xs
                whitespace-nowrap text-ink-dim
              "
              key={value}
              style={{ bottom: `${(value / top) * 100}%` }}
            >
              {value}
            </span>
          ))}
        </div>

        <div
          aria-label={ariaLabel}
          className="
            relative min-h-32 flex-1 overflow-hidden rounded-control bg-well
          "
          onKeyDown={onKeyDown}
          role="group"
          tabIndex={0}
        >
          {ticks.map((value) => (
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-0 h-px',
                value === 0 ? 'bg-edge' : 'bg-rule',
              )}
              key={value}
              style={{ bottom: `${(value / top) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end">
            {points.map((point, index) => {
              const isActive = isPointing && index === activeIndex;
              const isEmpty = point.count === 0;

              return (
                <div
                  className="relative flex h-full min-w-0 flex-1 justify-center"
                  key={point.date}
                  onPointerDown={() => {
                    setHoverIndex(null);
                    setCursorIndex(index);
                  }}
                  onPointerEnter={() => setHoverIndex(index)}
                  onPointerLeave={() => setHoverIndex(null)}
                >
                  <span
                    aria-hidden
                    className={cn(
                      `
                        absolute inset-0 border-x border-transparent
                        transition-colors duration-150
                      `,
                      isActive && 'border-accent-rule bg-accent-wash-hover',
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      `
                        absolute bottom-0 w-[58%] origin-bottom animate-bar-rise
                        transition-colors duration-150
                      `,
                      isEmpty
                        ? 'h-0.5 bg-edge'
                        : isActive
                          ? 'bg-accent-hover'
                          : 'bg-accent',
                    )}
                    style={{
                      animationDelay: `${index * stagger}ms`,
                      maxWidth: `${barCap}px`,
                      ...(isEmpty
                        ? null
                        : { height: `${(point.count / top) * 100}%` }),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-hidden className="flex gap-2">
        <span className="w-9 shrink-0" />
        <div
          className="grid flex-1"
          style={{
            gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
          }}
        >
          {dateTickIndices(points.length).map((index) => (
            <span
              className="
                justify-self-center font-mono text-2xs whitespace-nowrap
                text-ink-dim
              "
              key={points[index].date}
              style={{ gridColumnStart: index + 1 }}
            >
              {monthDay(points[index].date)}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};
