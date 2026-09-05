import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { CloudOff } from 'lucide-react';
import { Fragment } from 'react';

import { overviewCalendarOptions } from '@/app/server-state/overview.js';
import { Button } from '@/ui/button.js';
import { CalendarHeatmap } from '@/ui/charts/calendar-heatmap.js';
import { EmptyState, Skeleton } from '@/ui/feedback.js';
import { Panel, SectionLabel } from '@/ui/surface.js';

const HeatmapSkeleton = () => (
  <div aria-hidden className="grid gap-2.5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Skeleton className="h-[1.6em] w-32 text-md" />
      <Skeleton className="h-[1.45em] w-24 text-2xs" />
    </div>
    <div className="gf-scroll-x min-w-0">
      <div
        className="grid gap-0.75"
        style={{
          gridTemplateColumns: 'repeat(53, minmax(9px, 1fr))',
          gridTemplateRows: 'auto repeat(7, minmax(0, 1fr))',
          gridAutoFlow: 'column',
        }}
      >
        {Array.from({ length: 53 }, (_, column) => (
          <Fragment key={column}>
            <span aria-hidden className="h-[1.45em] text-2xs" />
            {Array.from({ length: 7 }, (_, row) => (
              <div
                aria-hidden
                className="aspect-square w-full animate-pulse bg-rule"
                key={row}
              />
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  </div>
);

export const CadenceCard = ({ className }: { className?: string }) => {
  const { data, error, isFetching, refetch } = useQuery(
    overviewCalendarOptions(),
  );

  return (
    <Panel
      className={cn(
        `
          flex flex-col gap-3 p-4
          md:p-5
        `,
        className,
      )}
    >
      <div
        className="
          flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1
        "
      >
        <SectionLabel>发布节奏 · 近 12 个月</SectionLabel>
        {data ? (
          <span className="font-mono text-2xs text-ink-dim">
            文章 {data.articlesTotal} · 动态 {data.activitiesTotal} · 峰值{' '}
            {data.peak}
          </span>
        ) : null}
      </div>

      {isFetching ? (
        <HeatmapSkeleton />
      ) : error ? (
        <EmptyState
          action={<Button onPress={() => void refetch()}>重试</Button>}
          icon={<CloudOff aria-hidden />}
          title="没能连上发布节奏"
        >
          无法加载发布节奏，请稍后重试。
        </EmptyState>
      ) : data ? (
        <CalendarHeatmap
          ariaLabel={`近 12 个月逐日发布量，文章 ${data.articlesTotal} 篇、动态 ${data.activitiesTotal} 条`}
          days={data.days}
        />
      ) : null}
    </Panel>
  );
};
