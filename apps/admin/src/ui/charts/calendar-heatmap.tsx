import type { OverviewCalendarDay } from '@grey-flowers/contracts';
import type { KeyboardEvent } from 'react';

import { getDayOfWeek, parseDate, startOfWeek } from '@internationalized/date';
import { cn } from 'cn';
import { Fragment, useEffect, useRef, useState } from 'react';

import { monthDay } from './shared';

const CAL_LOCALE = 'zh-CN';
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

const LEVEL_FILL = [
  'bg-well',
  'bg-accent-wash-hover',
  'bg-accent-rule',
  'bg-accent',
] as const;

const levelOf = (count: number) =>
  count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;

const MIN_LABEL_GAP = 4;

// 发布节奏热力图
export const CalendarHeatmap = ({
  ariaLabel,
  days,
}: {
  ariaLabel: string;
  days: readonly OverviewCalendarDay[];
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 外部系统同步：日历渲染后把横向滚动归位到最新一天（DOM scrollLeft）。
  useEffect(() => {
    if (days.length === 0) return;
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [days]);

  const last = days.length - 1;
  const activeIndex = hoverIndex ?? cursorIndex ?? last;
  const active = days[activeIndex];

  if (!active) return null;

  const first = parseDate(days[0].date);
  const gridStart = startOfWeek(first, CAL_LOCALE);
  // first 在本周内的序号 = 网格开头要补的空格数。
  const padStart = getDayOfWeek(first, CAL_LOCALE);
  const columns = Math.ceil((padStart + days.length) / 7);

  const labels = new Map<number, string>();
  let previousMonth = -1;
  let lastLabelColumn = -MIN_LABEL_GAP;
  for (let column = 0; column < columns; column += 1) {
    const month = gridStart.add({ days: column * 7 }).month;
    if (month === previousMonth) continue;
    previousMonth = month;
    if (column - lastLabelColumn < MIN_LABEL_GAP) continue;
    labels.set(column, `${month}月`);
    lastLabelColumn = column;
  }

  const moveCursor = (e: KeyboardEvent<HTMLDivElement>, next: number) => {
    e.preventDefault();
    setHoverIndex(null);
    setCursorIndex(Math.min(last, Math.max(0, next)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') moveCursor(e, activeIndex - 7);
    else if (e.key === 'ArrowRight') moveCursor(e, activeIndex + 7);
    else if (e.key === 'ArrowUp') moveCursor(e, activeIndex - 1);
    else if (e.key === 'ArrowDown') moveCursor(e, activeIndex + 1);
    else if (e.key === 'Home') moveCursor(e, 0);
    else if (e.key === 'End') moveCursor(e, last);
  };

  const activeTotal = active.articles + active.activities;

  return (
    <figure className="grid gap-2.5">
      <figcaption
        className="
          flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1
        "
      >
        <p className="font-mono text-md text-ink-strong" aria-live="polite">
          <span className="text-ink-dim">
            {monthDay(active.date)} 周{WEEKDAYS[(padStart + activeIndex) % 7]}
          </span>{' '}
          {activeTotal === 0 ? (
            <span className="text-ink-dim">无发布</span>
          ) : (
            <>
              <span className="font-medium">{active.articles}</span>
              <span className="text-ink-dim"> 篇 · </span>
              <span className="font-medium">{active.activities}</span>
              <span className="text-ink-dim"> 条</span>
            </>
          )}
        </p>
        <p className="flex items-center gap-1 font-mono text-2xs text-ink-dim">
          少
          {LEVEL_FILL.map((fill) => (
            <span aria-hidden className={cn('size-2', fill)} key={fill} />
          ))}
          多
        </p>
      </figcaption>

      <div className="gf-scroll-x min-w-0" ref={scrollRef}>
        <div
          aria-label={ariaLabel}
          className="grid gap-0.75"
          onKeyDown={onKeyDown}
          onPointerLeave={() => setHoverIndex(null)}
          onPointerOver={(event) => {
            const raw = (event.target as HTMLElement).dataset.index;
            if (raw !== undefined) setHoverIndex(Number(raw));
          }}
          role="group"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(9px, 1fr))`,
            gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))',
            gridAutoFlow: 'column',
          }}
          tabIndex={0}
        >
          {Array.from({ length: columns }, (_, column) => (
            <Fragment key={column}>
              <span
                aria-hidden
                className="
                  justify-self-start overflow-visible font-mono text-2xs
                  whitespace-nowrap text-ink-dim
                "
              >
                {labels.get(column) ?? ''}
              </span>
              {Array.from({ length: 7 }, (_, row) => {
                const index = column * 7 + row - padStart;
                const day = days[index];
                if (!day) return <span aria-hidden key={row} />;

                const total = day.articles + day.activities;
                return (
                  <span
                    aria-hidden
                    className={cn(
                      'aspect-square w-full transition-colors duration-150',
                      LEVEL_FILL[levelOf(total)],
                      index === activeIndex &&
                        'outline-2 outline-offset-1 outline-accent-rule',
                    )}
                    data-index={index}
                    key={row}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </figure>
  );
};
