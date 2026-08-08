import type {
  OverviewTrendData,
  OverviewTrendDays,
  OverviewTrendMetric,
} from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import {
  Button,
  EmptyState,
  FilterChip,
  Panel,
  SectionLabel,
  Skeleton,
  TrendPlot,
} from '@/ui/index.js';

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

/** 读数行的量词。「24 篇」读得出来，「24」读不出来。 */
const METRIC_UNITS: Record<OverviewTrendMetric, string> = {
  activities: '条',
  articles: '篇',
  comments: '条',
  users: '人',
};

const DAYS_OPTIONS: readonly OverviewTrendDays[] = ['7', '14', '30'];

/** 加载骨架照抄真实图表的三段结构（读数行 / 图区 / 日期行），落地时不跳。 */
const PlotSkeleton = () => (
  <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-2.5">
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

/**
 * 趋势卡：一张逐日柱状图，度量（文章/评论/动态/用户）与天数（7/14/30）图内切换。
 * 计数与趋势是两次独立请求，本卡只负责自己的加载/失败/空数据态。
 * Panel 是纵向 flex，图表区 flex-1 撑满父级剩余高度（桌面一屏无底部空白）。
 *
 * TrendPlot 按 metric|days 换 key：换的是同一批柱子的值，重挂载让入场编排重演，
 * 同时把悬停/键盘游标一并归位到最新一天——切了度量还停在旧游标上是错的。
 */
export const TrendCard = ({ className }: { className?: string }) => {
  const [metric, setMetric] = useState<OverviewTrendMetric>('articles');
  const [days, setDays] = useState<OverviewTrendDays>('14');
  const [data, setData] = useState<OverviewTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `${metric}|${days}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.overview
      .trends({ days, metric })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载趋势，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [metric, days, reloadKey]);

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
        {/* 七个 chip 在窄屏里换行会把卡头顶成两层；改成单行横滚（轨道不可见）。
            子项必须 shrink-0，否则 flex 会先把 chip 压扁成竖排字，再谈溢出。 */}
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
          <span
            aria-hidden="true"
            className="mx-0.5 h-4 w-px shrink-0 bg-rule"
          />
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
        {loading ? (
          <PlotSkeleton />
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => setReloadKey((current) => current + 1)}>
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden="true" />}
            title="没能连上趋势"
          >
            {error}
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
