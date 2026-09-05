import type {
  OverviewTrendDays,
  OverviewTrendMetric,
} from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { CloudOff } from 'lucide-react';
import { useState } from 'react';

import { overviewTrendOptions } from '@/app/server-state/overview.js';
import { Button } from '@/ui/button.js';
import { TrendPlot } from '@/ui/charts/trend-plot.js';
import { EmptyState, Skeleton } from '@/ui/feedback.js';
import { FilterChip } from '@/ui/form.js';
import { Panel, SectionLabel } from '@/ui/surface.js';

const METRIC_OPTIONS: readonly OverviewTrendMetric[] = [
  'articles',
  'comments',
  'activities',
  'users',
];

const METRIC_LABELS: Record<OverviewTrendMetric, string> = {
  activities: '动态',
  articles: '文章',
  comments: '评论',
  users: '用户',
};

const METRIC_UNITS: Record<OverviewTrendMetric, string> = {
  activities: '条',
  articles: '篇',
  comments: '条',
  users: '人',
};

const DAYS_OPTIONS: readonly OverviewTrendDays[] = ['7', '14', '30'];

const PlotSkeleton = () => (
  <div aria-hidden className="flex min-h-0 flex-1 flex-col gap-2.5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Skeleton className="h-[1.6em] w-24 text-md" />
      <Skeleton className="h-[1.45em] w-40 text-2xs" />
    </div>
    <div className="flex min-h-0 flex-1 gap-2">
      <span className="w-9 shrink-0" />
      <Skeleton className="min-h-32 flex-1 rounded-control" />
    </div>
    <div className="flex gap-2">
      <span className="w-9 shrink-0" />
      <Skeleton className="h-[1.45em] flex-1 text-2xs" />
    </div>
  </div>
);

export const TrendCard = ({ className }: { className?: string }) => {
  const [metric, setMetric] = useState<OverviewTrendMetric>('articles');
  const [days, setDays] = useState<OverviewTrendDays>('14');
  const { data, error, isFetching, refetch } = useQuery(
    overviewTrendOptions({ days, metric }),
  );

  return (
    <Panel
      className={cn(
        `
          flex min-h-0 flex-1 flex-col gap-3 p-4
          md:p-5
        `,
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <SectionLabel>逐日新增</SectionLabel>
        <div
          className="
            -mx-1 gf-scroll-x flex items-center gap-1.5 px-1
            *:shrink-0
          "
        >
          {METRIC_OPTIONS.map((option) => (
            <FilterChip
              isSelected={metric === option}
              key={option}
              onPress={() => setMetric(option)}
            >
              {METRIC_LABELS[option]}
            </FilterChip>
          ))}
          <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-rule" />
          {DAYS_OPTIONS.map((option) => (
            <FilterChip
              isSelected={days === option}
              key={option}
              onPress={() => setDays(option)}
            >
              {option} 天
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {isFetching ? (
          <PlotSkeleton />
        ) : error ? (
          <EmptyState
            action={<Button onPress={() => void refetch()}>重试</Button>}
            icon={<CloudOff aria-hidden />}
            title="没能连上趋势"
          >
            无法加载趋势，请稍后重试。
          </EmptyState>
        ) : data ? (
          <TrendPlot
            ariaLabel={`近 ${data.days} 天${METRIC_LABELS[data.metric]}逐日新增，共 ${data.total} ${METRIC_UNITS[data.metric]}。用左右方向键逐日读数。`}
            key={`${data.metric}|${data.days}`}
            points={data.points}
            unit={METRIC_UNITS[data.metric]}
          />
        ) : null}
      </div>
    </Panel>
  );
};
