import type {
  OverviewComposition,
  OverviewRankGroup,
} from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ChevronRight } from 'lucide-react';

import { RankBars } from '@/ui/charts/rank-bars.js';
import { Skeleton } from '@/ui/feedback.js';
import { Panel, SectionLabel } from '@/ui/surface.js';

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

const restNote = (group: OverviewRankGroup, unit: string) =>
  group.restCount > 0
    ? `其余 ${group.totalItems - group.items.length} 个 · ${group.restCount} ${unit}`
    : '';

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
