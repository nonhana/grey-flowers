import type {
  OverviewComposition,
  OverviewRankGroup,
} from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { ChevronRight } from 'lucide-react';

import { Panel, RankBars, SectionLabel, Skeleton } from '@/ui/index.js';

/**
 * 一个排行段：标题（深链到该维度的管理页）+ 排行条 + 尾注。
 *
 * 行级不做深链：文章列表当前只认 ?status，没有分类/标签筛选，
 * 编一个点不动的链接比不给链接更糟。段标题去 /categories、/tags 是真的能走。
 */
const RankSection = ({
  footnote,
  group,
  label,
  to,
}: {
  footnote?: string;
  group: OverviewRankGroup;
  label: string;
  to: '/categories' | '/tags';
}) => (
  <section className="grid gap-2.5">
    <Link
      className="
        flex w-fit items-center gap-1 font-mono text-xs text-ink-dim
        transition-colors
        hover:text-accent-text
      "
      to={to}
    >
      {label} · {group.totalItems} 个
      <ChevronRight aria-hidden className="size-3" />
    </Link>

    {group.items.length === 0 ? (
      <p className="font-mono text-2xs text-ink-dim">还没有{label}。</p>
    ) : (
      <RankBars ariaLabel={`${label}文章数排行`} items={group.items} />
    )}

    {footnote ? (
      <p className="font-mono text-2xs text-ink-dim">{footnote}</p>
    ) : null}
  </section>
);

/** 尾注：把没进榜的部分如实交代，否则排行条会读成「全部就这些」。 */
const restNote = (group: OverviewRankGroup, unit: string) =>
  group.restCount > 0
    ? `其余 ${group.totalItems - group.items.length} 个 · ${group.restCount} ${unit}`
    : '';

/**
 * 内容构成：分类与标签的文章数排行。回答「我到底在写什么」。
 *
 * 计数来自 Category/Tag 的 articleCount 物化列，口径是**全部文章（含草稿）**，
 * 与读数抽屉里的「已发布 640」不是同一个分母 —— 卡头标注「含草稿」讲清楚这件事。
 */
export const CompositionCard = ({
  className,
  composition,
}: {
  className?: string;
  composition: OverviewComposition;
}) => {
  const categoryNotes = [
    composition.uncategorized > 0
      ? `未分类 ${composition.uncategorized} 篇`
      : '',
    restNote(composition.categories, '篇'),
  ].filter(Boolean);

  return (
    <Panel
      className={cn(
        `
          flex flex-col gap-4 p-4
          md:p-5
        `,
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>内容构成</SectionLabel>
        <span className="font-mono text-2xs text-ink-dim">含草稿</span>
      </div>

      <RankSection
        footnote={categoryNotes.join(' · ')}
        group={composition.categories}
        label="分类"
        to="/categories"
      />

      <span aria-hidden className="h-px w-full bg-rule" />

      <RankSection
        footnote={restNote(composition.tags, '篇')}
        group={composition.tags}
        label="标签"
        to="/tags"
      />
    </Panel>
  );
};

/** 排行段占位：与 RankBars 同网格（名称 / 槽 / 计数）。行数 = 契约 RANK_TAKE。 */
const RankRowsSkeleton = ({ rows }: { rows: number }) => (
  <div
    className="
      grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-x-3
      gap-y-2
    "
  >
    {Array.from({ length: rows }, (_, index) => (
      <div
        className="col-span-3 grid grid-cols-subgrid items-center"
        key={index}
      >
        <Skeleton className="h-[1.55em] w-full text-base" />
        <div className="h-2.5 w-full animate-pulse bg-rule" />
        <Skeleton className="h-[1.55em] w-6 text-base" />
      </div>
    ))}
  </div>
);

/**
 * 与真实构成卡同构的骨架：卡头 + 两段排行（分类 5 行 / 标签 6 行，与 API 的
 * RANK_TAKE 一致）+ 尾注位。落地时卡高与真实逐段相等。
 */
export const CompositionCardSkeleton = ({
  className,
}: {
  className?: string;
}) => (
  <Panel
    aria-hidden
    className={cn(
      `
        flex animate-content-in flex-col gap-4 p-4
        md:p-5
      `,
      className,
    )}
  >
    <div className="flex items-baseline justify-between gap-3">
      <Skeleton className="h-[1.45em] w-24 text-xs" />
      <Skeleton className="h-[1.45em] w-12 text-2xs" />
    </div>

    <section className="grid gap-2.5">
      <Skeleton className="h-[1.45em] w-40 text-xs" />
      <RankRowsSkeleton rows={5} />
      <Skeleton className="h-[1.45em] w-48 text-2xs" />
    </section>

    <span aria-hidden className="h-px w-full bg-rule" />

    <section className="grid gap-2.5">
      <Skeleton className="h-[1.45em] w-36 text-xs" />
      <RankRowsSkeleton rows={6} />
      <Skeleton className="h-[1.45em] w-44 text-2xs" />
    </section>
  </Panel>
);
