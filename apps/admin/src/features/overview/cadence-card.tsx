import type { OverviewCalendarData } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { CloudOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import {
  Button,
  CalendarHeatmap,
  EmptyState,
  Panel,
  SectionLabel,
  Skeleton,
} from '@/ui/index.js';

/** 骨架照抄热力图的三段结构（读数行 / 网格 / 无），落地时不跳。 */
const HeatmapSkeleton = () => (
  <div aria-hidden="true" className="grid gap-2.5">
    <div className="flex items-baseline justify-between gap-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-24 w-full rounded-control" />
  </div>
);

/**
 * 发布节奏：近 12 个月的逐日发布密度。
 *
 * 它和趋势柱图不是一回事 —— 柱图看的是近 14/30 天的量，这张看的是一整年的分布。
 * 「今年断更过没有」「哪几个月最勤」只有这张答得了，而且不需要点任何东西。
 *
 * 单独一次请求：365 天的数据比 /overview 重，不该拖慢首屏的读数抽屉。
 */
export const CadenceCard = ({ className }: { className?: string }) => {
  const [data, setData] = useState<OverviewCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiClient.overview
      .calendar()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载发布节奏，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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

      {loading ? (
        <HeatmapSkeleton />
      ) : error ? (
        <EmptyState
          action={
            <Button
              onPress={() => {
                setLoading(true);
                setError('');
                setReloadKey((current) => current + 1);
              }}
            >
              重试
            </Button>
          }
          icon={<CloudOff aria-hidden="true" />}
          title="没能连上发布节奏"
        >
          {error}
        </EmptyState>
      ) : data ? (
        <CalendarHeatmap
          ariaLabel={`近 12 个月逐日发布量，文章 ${data.articlesTotal} 篇、动态 ${data.activitiesTotal} 条。用方向键逐日读数。`}
          days={data.days}
        />
      ) : null}
    </Panel>
  );
};
