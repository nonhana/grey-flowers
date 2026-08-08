import type { OverviewPendingItem } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { ChevronRight, FileText, Images, Music2 } from 'lucide-react';

import { SectionLabel, Skeleton } from '@/ui/index.js';

interface PendingMeta {
  icon: typeof FileText;
  label: string;
  search: Record<string, unknown>;
  to: '/articles' | '/assets' | '/music';
}

/** 待处理项的标签与深链映射只属于展示层；key 本身是契约。 */
const PENDING_META: Record<string, PendingMeta> = {
  draft_articles: {
    icon: FileText,
    label: '草稿文章',
    search: { status: 'draft' },
    to: '/articles',
  },
  pending_cleanup_assets: {
    icon: Images,
    label: '待清理资产',
    search: { status: 'PENDING_CLEANUP' },
    to: '/assets',
  },
  incomplete_music: {
    icon: Music2,
    label: '缺元数据音乐',
    /* 布尔 true：TanStack 默认 search 会把 ?incomplete=true JSON 解析成布尔。 */
    search: { incomplete: true },
    to: '/music',
  },
};

/**
 * 待处理：一条横贯的待办带，不是右侧那根空了八成的立柱。
 *
 * 最多三项，是「该去做的事」而不是参考资料，所以它排在计数与趋势之间、
 * 靠近页顶，把整幅宽度还给下面的趋势图。与计数抽屉同一套 `gap-px` 格眼语言，
 * 但格子是链接：hover 时整格上蓝、标签与箭头同时变色，一眼分得出可点。
 *
 * 全零时不摆一个巨大的虚线空框——好消息只值一行。
 */
export const PendingPanel = ({
  className,
  items,
}: {
  className?: string;
  items: readonly OverviewPendingItem[];
}) => {
  const visible = items.filter((item) => item.count > 0);

  return (
    <section className={cn('grid gap-2', className)}>
      <SectionLabel>待处理</SectionLabel>

      {visible.length === 0 ? (
        <p className="font-mono text-2xs text-ink-dim">无待办。</p>
      ) : (
        <div
          className="
            grid gap-px overflow-hidden rounded-panel border border-rule bg-rule
          "
          /* auto-fit 而不是固定 grid-cols-3：只有两条待办时，第三条空轨道会把
             容器的 bg-rule 露成一块灰板。auto-fit 直接把空轨道收掉。 */
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
          }}
        >
          {visible.map((item) => {
            const meta = PENDING_META[item.key];
            if (!meta) return null;
            const Icon = meta.icon;

            return (
              <Link
                className="
                  group flex items-center gap-2.5 bg-case-raised px-4 py-3.5
                  transition-colors
                  hover:bg-accent-wash
                "
                key={item.key}
                search={meta.search}
                to={meta.to}
              >
                <Icon
                  aria-hidden="true"
                  className="
                    size-4 shrink-0 text-ink-dim transition-colors
                    group-hover:text-accent-text
                  "
                />
                <span
                  className="
                    min-w-0 flex-1 truncate text-base text-ink
                    group-hover:text-accent-text
                  "
                >
                  {meta.label}
                </span>
                <span
                  className="
                    font-mono text-md font-medium text-ink-strong
                    transition-colors
                    group-hover:text-accent-text
                  "
                >
                  {item.count}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="
                    size-4 shrink-0 text-ink-dim transition-colors
                    group-hover:text-accent-text
                  "
                />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

/**
 * 与真实待办带同构的骨架：标签 + 三格（图标 / 文案 / 计数 / 箭头）。
 * 格高与真实一致（py-3.5 + 计数行 25.6px 主导），落地时整带不跳。
 */
export const PendingPanelSkeleton = () => (
  <section aria-hidden="true" className="grid animate-content-in gap-2">
    <SectionLabel>待处理</SectionLabel>
    <div
      className="
        grid gap-px overflow-hidden rounded-panel border border-rule bg-rule
      "
      style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))',
      }}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="flex items-center gap-2.5 bg-case-raised px-4 py-3.5"
          key={index}
        >
          <Skeleton className="size-4 shrink-0" />
          <Skeleton className="h-[1.55em] min-w-0 flex-1 text-base" />
          <Skeleton className="h-[1.6em] w-10 text-md" />
          <Skeleton className="size-4 shrink-0" />
        </div>
      ))}
    </div>
  </section>
);
