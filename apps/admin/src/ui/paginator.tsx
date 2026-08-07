import { cn } from 'cnfast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button as AriaButton } from 'react-aria-components';

import { IconButton } from './button.js';

/**
 * 页码序列：首尾两页 + 当前页附近的滑动窗口，跳过的区间用省略号占位。
 *
 *   总页数 20、当前 6、siblings 1 → [1, …, 5, 6, 7, …, 20]
 *
 * 页数本身装得下窗口时就全部展开——一个 5 页的列表不值得戴省略号。
 */
const buildPageItems = (
  totalPages: number,
  page: number,
  siblings: number,
): Array<number | 'gap-l' | 'gap-r'> => {
  const current = Math.min(totalPages, Math.max(1, page));
  if (totalPages <= siblings * 2 + 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const items: Array<number | 'gap-l' | 'gap-r'> = [1];
  if (start > 2) items.push('gap-l');
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push('gap-r');
  items.push(totalPages);
  return items;
};

/** 页码是 8px 圆角矩形按钮，不是胶囊——胶囊留给状态读数（见 DESIGN「Pill Is Not A Button」）。 */
const PAGE_BUTTON = cn(
  'inline-flex h-8 min-w-8 items-center justify-center rounded-control border',
  'font-mono text-xs leading-none transition-colors duration-150',
  `
    disabled:opacity-45
    disabled:hover:bg-transparent
  `,
);

/** Colour Is Never Alone：当前页的填充、描边、文字一起换到 accent 家族。 */
const PAGE_CURRENT =
  'border-accent-rule bg-accent-wash text-accent-text font-medium';
const PAGE_IDLE =
  'border-edge bg-case-raised text-ink-dim hover:not-disabled:bg-accent-wash hover:not-disabled:text-accent-text';

export interface PaginatorProps {
  /** 当前页，从 1 起算。 */
  page: number;
  /** 总页数。 */
  totalPages: number;
  /** 点击页码 / 上一页 / 下一页时回调，参数为切换后的页码（1 起）。 */
  onChange: (page: number) => void;
  /** 总数。给出时在左侧渲染「共 N {unit} · 第 {page} / {totalPages} 页」。 */
  total?: number;
  /** 计量单位，跟随实体的量词（条 / 篇 / 首 / 位…）。仅在有 total 时生效，默认「条」。 */
  unit?: string;
  /** 当前页两侧各保留几个页码；默认 1。 */
  siblings?: number;
  className?: string;
}

/**
 * 字盘层的分页器。总页数 ≤ 1 时整组不渲染——单页不值得占一条导航。
 * 结构：左侧计数（可选）＋ 上一页 · 页码（可折叠为省略号）· 下一页。
 * 计数和上一页/下一页都在 mono 下，货架数字对齐直。
 */
export const Paginator = ({
  page,
  totalPages,
  onChange,
  total,
  unit = '条',
  siblings = 1,
  className,
}: PaginatorProps) => {
  if (totalPages <= 1) return null;

  const current = Math.min(totalPages, Math.max(1, page));
  const items = buildPageItems(totalPages, current, siblings);
  const hasCount = total !== undefined;

  return (
    <nav
      aria-label="分页"
      className={cn(
        'flex items-center gap-3',
        hasCount && 'flex-wrap',
        className,
      )}
    >
      {hasCount && (
        <span className="font-mono text-xs text-ink-dim">
          共 {total} {unit} · 第 {current} / {totalPages} 页
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <IconButton
          isDisabled={current <= 1}
          label="上一页"
          onPress={() => onChange(current - 1)}
          size="sm"
          tone="quiet"
        >
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        {items.map((item) =>
          item === 'gap-l' || item === 'gap-r' ? (
            <span
              aria-hidden="true"
              className="
                h-8 w-5 text-center font-mono text-xs/8 text-ink-dim select-none
              "
              key={item}
            >
              …
            </span>
          ) : (
            <AriaButton
              aria-current={item === current ? 'page' : undefined}
              aria-label={`第 ${item} 页`}
              className={cn(
                PAGE_BUTTON,
                item === current ? PAGE_CURRENT : PAGE_IDLE,
              )}
              key={item}
              onPress={() => onChange(item)}
              type="button"
            >
              {item}
            </AriaButton>
          ),
        )}
        <IconButton
          isDisabled={current >= totalPages}
          label="下一页"
          onPress={() => onChange(current + 1)}
          size="sm"
          tone="quiet"
        >
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </nav>
  );
};
