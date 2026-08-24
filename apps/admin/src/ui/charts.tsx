import type {
  OverviewCalendarDay,
  OverviewRankItem,
  OverviewTrendPoint,
} from '@grey-flowers/contracts';
import type { KeyboardEvent } from 'react';

import { getDayOfWeek, parseDate, startOfWeek } from '@internationalized/date';
import { cn } from 'cnfast';
import { Fragment, useEffect, useRef, useState } from 'react';

/** 错峰入场的总窗口上限（ms）。末柱结束 = 本值 + 单根 200ms。 */
const STAGGER_WINDOW = 160;
/** 单根错峰步进上限（ms）。天数少时不该把 160ms 摊得稀稀拉拉。 */
const STAGGER_MAX_STEP = 12;

/** 柱宽上限（px）按天数收敛：7 天的柱不该细成发丝，30 天的柱不该胖成砖。 */
const barCapFor = (length: number) =>
  length <= 7 ? 56 : length <= 14 ? 36 : 20;

/** 「整」步长刻度（0/10/20 而非 0/8/16），步长下限锁 1。 */
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

/** 只显示稀疏日期刻度：≤8 天全出，更长则取 ~6 个均布样本（含首尾）。 */
const dateTickIndices = (length: number): number[] => {
  if (length <= 8) return Array.from({ length }, (_, index) => index);
  const step = Math.max(1, Math.round((length - 1) / 5));
  const indices: number[] = [];
  for (let index = 0; index < length; index += step) indices.push(index);
  if (indices[indices.length - 1] !== length - 1) indices.push(length - 1);
  return indices;
};

/** 'YYYY-MM-DD' → 'M/D' */
const monthDay = (date: string) => {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
};

/**
 * 逐日趋势图（自绘 DOM + CSS，零依赖）。
 * 不用 SVG 拉伸（1px 基线和圆角会变形）；值≠0 才立柱、0 只画基线短横。
 */
export const TrendPlot = ({
  ariaLabel,
  className,
  points,
  unit,
}: {
  ariaLabel: string;
  className?: string;
  points: readonly OverviewTrendPoint[];
  /** 计量单位：篇 / 条 / 人。读数行用。 */
  unit: string;
}) => {
  /** 指针悬停优先于键盘游标；都没有时默认停在最新一天。 */
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorIndex, setCursorIndex] = useState<number | null>(null);

  const last = points.length - 1;
  const activeIndex = hoverIndex ?? cursorIndex ?? last;
  const active = points[activeIndex];
  /** 读数默认停最新一天，但高亮只在真的有人在指时出现。 */
  const isPointing = hoverIndex !== null || cursorIndex !== null;

  // DTO 保证 points.length === days，这里只是不让一个空数组把整页打白。
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
      {/* 常驻读数行：不浮层、不遮柱，位置永远可预测。 */}
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
        {/* 纵轴：mono tabular 右对齐，标签中心压在自己那条刻度线上。 */}
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

        {/* 图区是一块 well —— 「往里面放东西的凹面」，柱子落在里面而不是浮在上面。 */}
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
                // 零轴比刻度线重一档：它是地面，不是参考线。
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
                  {/* 选中格：底色、竖边、柱色三者同时变——状态不骑在色相上。 */}
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
                      // 柱方顶不圆角：圆的是带半径的 well 凹面，铅字本身是方的。
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

      {/* 日期刻度：与柱区同一套等分列，靠 gridColumnStart 精确落在自己那根柱下面。 */}
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

/**
 * 排行条：条宽是 count / max 而非占比（标签总和 > 文章数，占比无分母意义）。
 * 三列走 subgrid，名称列由整表最长的名字定宽。
 */
export const RankBars = ({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: readonly OverviewRankItem[];
}) => {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <ol
      aria-label={ariaLabel}
      className="
        grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center
        gap-x-3 gap-y-2
      "
    >
      {items.map((item) => (
        <li
          className="col-span-3 grid grid-cols-subgrid items-center"
          key={item.name}
        >
          <span className="truncate text-base text-ink" title={item.name}>
            {item.name}
          </span>
          {/* 槽是 well 凹面，条是方头的——同趋势图的铅字几何；厚度与 ShareBar 对齐。 */}
          <span aria-hidden className="h-2.5 w-full bg-well">
            <span
              className="block h-full bg-accent"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </span>
          <span className="font-mono text-base text-ink-strong">
            {item.count}
          </span>
        </li>
      ))}
    </ol>
  );
};

// ==================== 日历热力 ====================

/** 周起始跟 locale 走：zh-CN 是周一，所以第 0 行永远是周一。 */
const CAL_LOCALE = 'zh-CN';
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** 四档明度，取值必须在 well 底上分得开（第一档用 wash-hover 而非 wash）。 */
const LEVEL_FILL = [
  'bg-well',
  'bg-accent-wash-hover',
  'bg-accent-rule',
  'bg-accent',
] as const;

/** 绝对阈值而非四分位：日发布量右偏，四分位会把 1 和 4 挤进同一档。 */
const levelOf = (count: number) =>
  count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;

/** 相邻月份标签至少隔 4 列，否则「7月 8月」会叠在一起糊成一团。 */
const MIN_LABEL_GAP = 4;

/**
 * 发布节奏日历热力图（近一年逐日分布）。
 * 不画星期标签（读数行已报周几）、列宽 minmax(9px, 1fr)、挂载后滚到最右。
 */
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

  useEffect(() => {
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

  // 月份标签落在该月首日所在列的顶格上方；用列顶日期判月，省去逐列解析日期。
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

  const moveCursor = (event: KeyboardEvent<HTMLDivElement>, next: number) => {
    event.preventDefault();
    setHoverIndex(null);
    setCursorIndex(Math.min(last, Math.max(0, next)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // 左右走列（±1 周），上下走行（±1 天）——跟着眼睛在网格上的移动来。
    if (event.key === 'ArrowLeft') moveCursor(event, activeIndex - 7);
    else if (event.key === 'ArrowRight') moveCursor(event, activeIndex + 7);
    else if (event.key === 'ArrowUp') moveCursor(event, activeIndex - 1);
    else if (event.key === 'ArrowDown') moveCursor(event, activeIndex + 1);
    else if (event.key === 'Home') moveCursor(event, 0);
    else if (event.key === 'End') moveCursor(event, last);
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
        {/* 图例：四档从空到满，跟着格子一起读。 */}
        <p className="flex items-center gap-1 font-mono text-2xs text-ink-dim">
          少
          {LEVEL_FILL.map((fill) => (
            <span aria-hidden className={cn('size-2', fill)} key={fill} />
          ))}
          多
        </p>
      </figcaption>

      {/* ref 挂在这层：滚的是 gf-scroll-x 这只溢出容器，不是里面那张网格。 */}
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
            // 每列先出一个标签格（可能为空），再出 7 个日格 —— 正好填满
            // grid-auto-flow: column 的一列 8 格。Fragment 不产生 DOM，不打断流。
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
                if (!day)
                  return <span aria-hidden key={row} />; /* 首尾残周占位 */

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

export interface ShareSegment {
  label: string;
  value: number;
  /** 三档明度，按重要性递减；不引入第二个色系。 */
  tone: 'strong' | 'mid' | 'faint';
}

const SHARE_FILL: Record<ShareSegment['tone'], string> = {
  faint: 'bg-edge',
  mid: 'bg-accent-rule',
  strong: 'bg-accent',
};

/**
 * 占比条（三段互斥、和为整体）：「图例同色 + 数值」补强（Colour Is Never Alone）；
 * 零值段不渲染，避免退化成细丝。
 */
export const ShareBar = ({
  ariaLabel,
  format,
  segments,
}: {
  ariaLabel: string;
  /** 值 → 可读文本（字节、时长等各自的量纲）。 */
  format: (value: number) => string;
  segments: readonly ShareSegment[];
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0);
  const share = (value: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <div className="grid gap-3">
      <div
        aria-label={ariaLabel}
        className="flex h-2.5 w-full overflow-hidden bg-well"
        role="img"
      >
        {visible.map((segment) => (
          <span
            className={SHARE_FILL[segment.tone]}
            key={segment.label}
            style={{ width: `${share(segment.value)}%` }}
          />
        ))}
      </div>

      <ul className="grid gap-1.5">
        {segments.map((segment) => (
          <li className="flex items-baseline gap-2" key={segment.label}>
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 translate-y-px',
                SHARE_FILL[segment.tone],
              )}
            />
            <span className="min-w-0 flex-1 truncate text-base text-ink">
              {segment.label}
            </span>
            <span className="font-mono text-base text-ink-strong">
              {format(segment.value)}
            </span>
            <span className="w-10 text-right font-mono text-2xs text-ink-dim">
              {total === 0 ? '—' : `${share(segment.value).toFixed(0)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
