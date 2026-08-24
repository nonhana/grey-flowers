import type { OverviewData } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import {
  CloudOff,
  FileText,
  Images,
  MessagesSquare,
  Music2,
  Send,
  SquarePen,
  Upload,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { formatCount, formatHours } from '@/lib/format.js';
import { Button, buttonClass } from '@/ui/button.js';
import { EmptyState } from '@/ui/feedback.js';
import { PageBody, PageHeader } from '@/ui/surface.js';

import { CadenceCard } from './cadence-card.js';
import {
  CompositionCard,
  CompositionCardSkeleton,
} from './composition-card.js';
import { PendingPanel, PendingPanelSkeleton } from './pending-panel.js';
import {
  ReadoutCell,
  ReadoutDrawer,
  ReadoutDrawerSkeleton,
} from './readout-drawer.js';
import { StorageCard, StorageCardSkeleton } from './storage-card.js';
import { TrendCard } from './trend-card.js';

/** 运营概览：计数抽屉 + 待办带 + 趋势图，三条横带布局；计数与趋势独立请求、错误互不阻塞。 */
export const OverviewPage = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const requestKey = `counts|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.overview
      .get()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载概览，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const counts = data?.counts;

  return (
    <PageBody scroll="child" width="wide">
      {/* 唯一的滚动所有者：移动端整页滚动；桌面内容恰好一屏（趋势图 flex-1 填满剩余，
          底部无需滚动条）。 */}
      <div
        className="
          flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain
        "
      >
        <PageHeader
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className={buttonClass({ tone: 'solid' })}
                to="/articles/new"
              >
                <SquarePen aria-hidden className="size-4" />
                新建文章
              </Link>
              <Link
                className={buttonClass({ tone: 'quiet' })}
                to="/activities/new"
              >
                <Send aria-hidden className="size-4" />
                发布动态
              </Link>
              <Link className={buttonClass({ tone: 'quiet' })} to="/assets">
                <Upload aria-hidden className="size-4" />
                上传资产
              </Link>
              <Link
                className={buttonClass({ tone: 'quiet' })}
                to="/music/upload"
              >
                <Music2 aria-hidden className="size-4" />
                上传音乐
              </Link>
            </div>
          }
          description="全站态势：关键计数、近 N 天新增趋势与待处理事项。"
          title="运营概览"
        />

        <section aria-label="关键计数" aria-busy={loading}>
          {loading ? (
            <ReadoutDrawerSkeleton />
          ) : error ? (
            <EmptyState
              action={
                <Button onPress={() => setReloadKey((current) => current + 1)}>
                  重试
                </Button>
              }
              icon={<CloudOff aria-hidden />}
              title="没能连上概览"
            >
              {error}
            </EmptyState>
          ) : counts ? (
            <ReadoutDrawer>
              <ReadoutCell
                icon={<FileText aria-hidden />}
                label="文章"
                secondary={`草稿 ${counts.articles.drafts} · 已发布 ${formatCount(counts.articles.wordTotal)}字`}
                value={formatCount(counts.articles.published)}
              />
              <ReadoutCell
                icon={<Send aria-hidden />}
                label="动态"
                secondary={`近 30 天 ${counts.activities.last30d}`}
                value={formatCount(counts.activities.total)}
              />
              <ReadoutCell
                icon={<MessagesSquare aria-hidden />}
                label="评论"
                secondary={`父 ${counts.comments.parents} · 子 ${counts.comments.children}`}
                value={formatCount(counts.comments.total)}
              />
              <ReadoutCell
                icon={<Users aria-hidden />}
                label="用户"
                secondary={`近 30 天 ${counts.users.joined30d}`}
                value={formatCount(counts.users.total)}
              />
              <ReadoutCell
                icon={<Images aria-hidden />}
                label="资产"
                secondary={`图片 ${counts.assets.images} · 音频 ${counts.assets.audio} · 待清理 ${counts.assets.pendingCleanup}`}
                value={formatCount(counts.assets.total)}
              />
              <ReadoutCell
                icon={<Music2 aria-hidden />}
                label="音乐"
                secondary={`缺元数据 ${counts.music.missingMetadata} · 总长 ${formatHours(counts.music.secondsTotal)}`}
                value={formatCount(counts.music.total)}
              />
            </ReadoutDrawer>
          ) : null}
        </section>

        {loading ? (
          <PendingPanelSkeleton />
        ) : data ? (
          <PendingPanel className="animate-content-in" items={data.pending} />
        ) : null}

        {/* 逐日新增 7 / 内容构成 5：柱图不再贪婪吃满视口，它只是四张图之一。 */}
        <div
          className="
            grid gap-3
            xl:grid-cols-12
          "
        >
          {/* 不再固定高度：grid 行会把它拉到和右侧内容构成一样高，
              柱图的 flex-1 图区顺势填满 —— 两卡等高，右列不再留一片空。 */}
          <TrendCard
            className="
              min-h-72
              xl:col-span-7
            "
          />
          {loading ? (
            <CompositionCardSkeleton className="xl:col-span-5" />
          ) : data ? (
            <CompositionCard
              className="
                animate-content-in
                xl:col-span-5
              "
              composition={data.composition}
            />
          ) : null}
        </div>

        {/* 发布节奏 8 / 存储构成 4 */}
        <div
          className="
            grid gap-3
            xl:grid-cols-12
          "
        >
          <CadenceCard className="xl:col-span-8" />
          {loading ? (
            <StorageCardSkeleton className="xl:col-span-4" />
          ) : data ? (
            <StorageCard
              className="
                animate-content-in
                xl:col-span-4
              "
              storage={data.storage}
            />
          ) : null}
        </div>
      </div>
    </PageBody>
  );
};
