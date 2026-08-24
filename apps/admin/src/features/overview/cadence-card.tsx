import type { OverviewCalendarData } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { CloudOff } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { Button } from '@/ui/button.js';
import { CalendarHeatmap } from '@/ui/charts.js';
import { EmptyState, Skeleton } from '@/ui/feedback.js';
import { Panel, SectionLabel } from '@/ui/surface.js';

/** 骨架同 53 列 × auto+7 行网格，卡宽变化时与真实同比例伸缩，任何视口高度一致。 */
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
            {/* 月份标签格：只占行高，不画条 —— 真实标签也只有首列有字。 */}
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

/**
 * 发布节奏：近一年的逐日分布（柱图看量，这张看分布/断更）。
 * 单独一次请求，不拖慢首屏读数抽屉。
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
          icon={<CloudOff aria-hidden />}
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
