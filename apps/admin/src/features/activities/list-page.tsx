import type { ActivityAdmin, ActivityListData } from '@grey-flowers/contracts';

import { useNavigate } from '@tanstack/react-router';
import { CloudOff, MessageSquareText, PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { usePlayerStore } from '@/store/player.js';
import { Button } from '@/ui/button.js';
import { EmptyState, Skeleton } from '@/ui/feedback.js';
import { SearchInput } from '@/ui/form.js';
import { ConfirmDialog } from '@/ui/overlay.js';
import { Paginator } from '@/ui/paginator.js';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface.js';

import { ActivityCard } from './activity-card.js';

const PAGE_SIZE = 10;

/**
 * 与真实动态卡同构的骨架（取最常见形态：两行预览 + 双图网格 + 元数据行）。
 * 图片数 0–3 不定，无法逐像素预测卡高 —— 双图是分布中心，落地跳动最小。
 */
const ActivityCardSkeleton = () => (
  <div
    aria-hidden
    className="grid gap-3 rounded-panel border border-rule bg-case-raised p-4"
  >
    <div className="grid gap-1.5">
      <Skeleton className="h-[1.625em] w-full text-base" />
      <Skeleton className="h-[1.625em] w-2/3 text-base" />
    </div>
    <div className="grid grid-cols-2 gap-1">
      <Skeleton className="aspect-square w-full rounded-control" />
      <Skeleton className="aspect-square w-full rounded-control" />
    </div>
    <MetaLine>
      <Skeleton className="h-[1.45em] w-40 text-2xs" />
      <Skeleton className="ml-auto h-[1.45em] w-20 text-2xs" />
    </MetaLine>
  </div>
);

export const ActivitiesPage = () => {
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const removeTrack = usePlayerStore((s) => s.removeTrack);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<ActivityListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const deleteDialog = useDialog<ActivityAdmin>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${debouncedQuery}|${String(page)}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.activities
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载动态，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasQuery = debouncedQuery.length > 0;

  const handlePlayTrack = (activity: ActivityAdmin, index: number) => {
    const track = activity.music[index];
    if (!track) return;
    if (currentTrack?.id === track.id) {
      toggle();
      return;
    }
    // 把这条动态的音乐整组作为播放列表入队（点播队列，跨路由常驻）。
    play(activity.music, index);
  };

  const openCreate = () => {
    void navigate({ to: '/activities/new' });
  };

  const openEdit = (activity: ActivityAdmin) => {
    void navigate({
      params: { activityId: String(activity.id) },
      to: '/activities/$activityId/edit',
    });
  };

  const remove = async () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    try {
      await apiClient.activities.remove(target.id);
      for (const track of target.music) removeTrack(track.id);
      setReloadKey((current) => current + 1);
      toast.success('动态已删除。');
    } catch (cause) {
      toastError(cause);
    }
  };

  return (
    <PageBody scroll="child" width="narrow">
      <PageHeader
        actions={
          <div className="flex w-full items-center justify-between">
            <SearchInput
              className="
                hidden w-64
                md:block
              "
              label="搜索动态"
              onChange={setQuery}
              placeholder="搜索动态内容…"
              value={query}
            />
            <Button
              className="
                hidden
                md:flex
              "
              icon={<PenLine aria-hidden />}
              onPress={openCreate}
              tone="solid"
            >
              发动态
            </Button>
          </div>
        }
        description="动态一经发布即刻公开；图片与音乐来自受管资产/音乐库。"
        title="动态"
      />

      <div className="mt-5 flex items-center gap-2">
        <SearchInput
          className="
            min-w-0 flex-1
            md:hidden
          "
          label="搜索动态"
          onChange={setQuery}
          placeholder="搜索动态内容…"
          value={query}
        />
      </div>

      <section
        aria-busy={loading}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading ? (
          <div className="grid animate-content-in gap-3" key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <ActivityCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => setReloadKey((current) => current + 1)}>
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上动态"
          >
            {' '}
            {error}
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasQuery ? (
                <Button onPress={() => setQuery('')}>清除搜索</Button>
              ) : (
                <Button
                  icon={<PenLine aria-hidden />}
                  onPress={openCreate}
                  tone="solid"
                >
                  发布第一条动态
                </Button>
              )
            }
            icon={<MessageSquareText aria-hidden />}
            title={hasQuery ? '没有匹配的动态' : '还没有动态'}
          >
            {hasQuery
              ? '换一个关键词，或清除搜索看看全部。'
              : '轻量写作，配图或音乐，按下 Cmd/Ctrl+Enter 发布。'}
          </EmptyState>
        ) : (
          <div className="grid animate-content-in gap-3" key="content">
            {data?.items.map((activity) => (
              <ActivityCard
                activity={activity}
                key={activity.id}
                onDelete={() => deleteDialog.open(activity)}
                onEdit={() => openEdit(activity)}
                onPlayTrack={(index) => handlePlayTrack(activity, index)}
                playingTrackId={
                  status === 'playing' ? (currentTrack?.id ?? null) : null
                }
              />
            ))}
          </div>
        )}
      </section>

      {data ? (
        <Paginator
          className="mt-5"
          onChange={setPage}
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="条"
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="删除动态"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? '这条动态会被删除；图片与音乐资产会保留在资产库，可稍后到资产库清理。'
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={
          deleteDialog.data ? `删除动态 #${String(deleteDialog.data.id)}？` : ''
        }
      />
    </PageBody>
  );
};
