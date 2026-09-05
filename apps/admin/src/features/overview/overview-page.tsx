import { useQuery } from '@tanstack/react-query';
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

import { overviewCountsOptions } from '@/app/server-state/overview';
import { formatCount, formatHours } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { EmptyState } from '@/ui/feedback';
import { PageBody, PageHeader } from '@/ui/surface';

import { CadenceCard } from './cadence-card';
import { CompositionCard, CompositionCardSkeleton } from './composition-card';
import { PendingPanel, PendingPanelSkeleton } from './pending-panel';
import {
  ReadoutCell,
  ReadoutDrawer,
  ReadoutDrawerSkeleton,
} from './readout-drawer';
import { StorageCard, StorageCardSkeleton } from './storage-card';
import { TrendCard } from './trend-card';

export const OverviewPage = () => {
  const { data, error, isFetching, refetch } = useQuery(
    overviewCountsOptions(),
  );

  return (
    <PageBody scroll="child" width="wide">
      <div
        className="
          flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain
        "
      >
        <PageHeader
          actions={
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
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
          description="最近的花园有什么新事情呢？"
          title="运营概览"
        />

        <section aria-label="关键计数" aria-busy={isFetching}>
          {isFetching ? (
            <ReadoutDrawerSkeleton />
          ) : error ? (
            <EmptyState
              action={<Button onPress={() => void refetch()}>重试</Button>}
              icon={<CloudOff aria-hidden />}
              title="没能连上概览"
            >
              无法加载概览，请稍后重试。
            </EmptyState>
          ) : data?.counts ? (
            <ReadoutDrawer>
              <ReadoutCell
                icon={<FileText aria-hidden />}
                label="文章"
                secondary={`草稿 ${data.counts.articles.drafts} · 已发布 ${formatCount(data.counts.articles.wordTotal)}字`}
                value={formatCount(data.counts.articles.published)}
              />
              <ReadoutCell
                icon={<Send aria-hidden />}
                label="动态"
                secondary={`近 30 天 ${data.counts.activities.last30d}`}
                value={formatCount(data.counts.activities.total)}
              />
              <ReadoutCell
                icon={<MessagesSquare aria-hidden />}
                label="评论"
                secondary={`父 ${data.counts.comments.parents} · 子 ${data.counts.comments.children}`}
                value={formatCount(data.counts.comments.total)}
              />
              <ReadoutCell
                icon={<Users aria-hidden />}
                label="用户"
                secondary={`近 30 天 ${data.counts.users.joined30d}`}
                value={formatCount(data.counts.users.total)}
              />
              <ReadoutCell
                icon={<Images aria-hidden />}
                label="资产"
                secondary={`图片 ${data.counts.assets.images} · 音频 ${data.counts.assets.audio} · 待清理 ${data.counts.assets.pendingCleanup}`}
                value={formatCount(data.counts.assets.total)}
              />
              <ReadoutCell
                icon={<Music2 aria-hidden />}
                label="音乐"
                secondary={`缺元数据 ${data.counts.music.missingMetadata} · 总长 ${formatHours(data.counts.music.secondsTotal)}`}
                value={formatCount(data.counts.music.total)}
              />
            </ReadoutDrawer>
          ) : null}
        </section>

        {isFetching ? (
          <PendingPanelSkeleton />
        ) : data ? (
          <PendingPanel className="animate-content-in" items={data.pending} />
        ) : null}

        <div
          className="
            grid gap-3
            xl:grid-cols-12
          "
        >
          <TrendCard
            className="
              min-h-72
              xl:col-span-7
            "
          />
          {isFetching ? (
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

        <div
          className="
            grid gap-3
            xl:grid-cols-12
          "
        >
          <CadenceCard className="xl:col-span-8" />
          {isFetching ? (
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
