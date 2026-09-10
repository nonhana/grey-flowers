import type { ActivityAdmin, ActivityListQuery } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CloudOff, MessageSquareText, PenLine } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';

import { apiClient } from '@/app/api/index';
import {
  activityListOptions,
  invalidateActivitiesAfterMutation,
} from '@/app/server-state/modules/activities';
import { useDialog } from '@/hooks/use-dialog';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
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
  const search = useSearch({ from: '/activities/' });
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const removeTrack = usePlayerStore((s) => s.removeTrack);

  const page = search.page ?? 1;
  const deleteDialog = useDialog<ActivityAdmin>();

  const navigateSearch = useSearchNavigation('/activities', search);

  const [draft, setDraft] = useState(() => search.search ?? '');
  // 300ms 防抖提交：replace + 页码一并重置。
  const commitSearch = useDebouncedCallback((value: string) => {
    navigateSearch(
      { page: undefined, search: value.trim() || undefined },
      true,
    );
  }, 300);

  useEffect(() => () => commitSearch.cancel(), [commitSearch]);

  const listQuery: ActivityListQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: search.search,
  };
  const activitiesQuery = useQuery(activityListOptions(listQuery));
  const data = activitiesQuery.data;
  const loading = activitiesQuery.isPending;
  const busy = activitiesQuery.isFetching;
  const error = activitiesQuery.error;

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasQuery = search.search !== undefined;

  // 越界钳制：页码超界时渲染骨架，effect 同步回最后有效页。
  const clamping =
    items.length === 0 && page > 1 && total > 0 && totalPages < page;

  const syncClampedPage = useEffectEvent(() => {
    navigateSearch({ page: totalPages > 1 ? totalPages : undefined }, true);
  });

  useEffect(() => {
    if (clamping) syncClampedPage();
  }, [clamping]);

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
              onChange={(value) => {
                setDraft(value);
                commitSearch(value);
              }}
              placeholder="搜索动态内容…"
              value={draft}
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
          onChange={(value) => {
            setDraft(value);
            commitSearch(value);
          }}
          placeholder="搜索动态内容…"
          value={draft}
        />
      </div>

      <section
        aria-busy={busy}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading || clamping ? (
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
        ) : items.length === 0 ? (
          <EmptyState
            action={
              hasQuery ? (
                <Button
                  onPress={() => {
                    setDraft('');
                    navigateSearch(
                      { page: undefined, search: undefined },
                      true,
                    );
                  }}
                >
                  清除搜索
                </Button>
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
            {items.map((activity) => (
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

      {!loading ? (
        <Paginator
          className="mt-5"
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
          page={page}
          total={total}
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
