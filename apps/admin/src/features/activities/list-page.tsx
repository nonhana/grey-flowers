import type { ActivityAdmin, ActivityListQuery } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CloudOff, MessageSquareText, PenLine } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index';
import {
  activityListOptions,
  invalidateActivitiesAfterMutation,
} from '@/app/server-state/activities';
import { useDebouncedCommit } from '@/hooks/use-debounced-commit';
import { useDialog } from '@/hooks/use-dialog';
import { toastError } from '@/lib/toast';
import { usePlayerStore } from '@/store/player';
import { Button } from '@/ui/button';
import { EmptyState, Skeleton } from '@/ui/feedback';
import { SearchInput } from '@/ui/form';
import { ConfirmDialog } from '@/ui/overlay';
import { Paginator } from '@/ui/paginator';
import { MetaLine, PageBody, PageHeader } from '@/ui/surface';

import { ActivityCard } from './activity-card';

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
      <Skeleton className="h-[1.6em] w-3/4 text-md" />
      <Skeleton className="h-[1.45em] w-full text-2xs" />
    </div>
    <div className="grid grid-cols-2 gap-1">
      <Skeleton className="aspect-square w-full rounded-control" />
      <Skeleton className="aspect-square w-full rounded-control" />
    </div>
    <MetaLine>
      <Skeleton className="h-[1.45em] w-2/5 text-2xs" />
      <Skeleton className="h-[1.45em] w-1/5 text-2xs" />
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
  const [page, setPage] = useState(1);
  const deleteDialog = useDialog<ActivityAdmin>();

  // 300ms 搜索提交：提交值一变，页码在渲染期回到第 1 页。
  const committedQuery = useDebouncedCommit(query, 300);
  const [prevCommitted, setPrevCommitted] = useState(committedQuery);
  if (prevCommitted !== committedQuery) {
    setPrevCommitted(committedQuery);
    setPage(1);
  }

  const listQuery: ActivityListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(committedQuery ? { search: committedQuery } : {}),
  };
  const activitiesQuery = useQuery(activityListOptions(listQuery));
  const data = activitiesQuery.data;
  const loading = activitiesQuery.isFetching;
  const error = activitiesQuery.error;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasQuery = committedQuery.length > 0;

  const removeMutation = useMutation({
    mutationFn: (target: ActivityAdmin) =>
      apiClient.activities.remove(target.id),
    onSuccess: async (_data, target) => {
      for (const track of target.music) removeTrack(track.id);
      toast.success('动态已删除。');
      await invalidateActivitiesAfterMutation();
    },
    onError: (cause) => {
      toastError(cause);
    },
  });

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

  const remove = () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    removeMutation.mutate(target);
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
              <Button onPress={() => void activitiesQuery.refetch()}>
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上动态"
          >
            无法加载动态，请稍后重试。
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
