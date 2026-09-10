import type { MusicAdmin, MusicListQuery } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { cn } from 'cn';
import { CloudOff, Disc3, Music2, Upload } from 'lucide-react';
import { useEffect, useEffectEvent, useState } from 'react';
import { toast } from 'sonner';
import { useDebouncedCallback } from 'use-debounce';

import { apiClient } from '@/app/api/index';
import {
  invalidateMusicAfterMutation,
  musicListOptions,
} from '@/app/server-state/modules/music';
import { useDialog } from '@/hooks/use-dialog';
import { useSearchNavigation } from '@/hooks/use-search-navigation';
import { toastError } from '@/lib/toast';
import { usePlayerStore } from '@/store/player';
import { Button } from '@/ui/button';
import { EmptyState, Skeleton } from '@/ui/feedback';
import { FilterChip, SearchInput } from '@/ui/form';
import { ConfirmDialog } from '@/ui/overlay';
import { Paginator } from '@/ui/paginator';
import { PageBody, PageHeader } from '@/ui/surface';

import { EditMusicDialog } from './edit-dialog';
import { MusicCard } from './music-card';

const PAGE_SIZE = 12;
/* 网格撑满列表区，行高 minmax(min-content,1fr) 均分剩余高度；溢出时回落到
   内容高照常滚动。与资产库同构，卡片封面区吸收增长。 */
const GRID_CLASS =
  'grid h-full grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] auto-rows-[minmax(min-content,1fr)] gap-3';

/**
 * 与真实音乐卡同构的骨架：封面区（min-h-[10.5rem]、随行高吸收增长）+
 * 标题行 + 三段元数据 + 底部操作位（三个 sm 按钮 32px 主导）。
 * 块高按真实字号的 line-height 取 em。
 */
const MusicCardSkeleton = () => (
  <div
    aria-hidden
    className="
      flex h-full flex-col overflow-hidden rounded-panel border border-rule
      bg-case-raised
    "
  >
    <Skeleton className="min-h-42 w-full flex-1 rounded-none" />
    <div className="grid gap-1 px-3 py-2.5">
      <Skeleton className="h-[1.6em] w-4/5 text-md" />
      <Skeleton className="h-[1.45em] w-3/5 text-2xs" />
      <Skeleton className="h-[1.45em] w-2/5 text-2xs" />
    </div>
    <div className="mt-auto flex gap-1.5 px-3 pb-2.5">
      <Skeleton className="size-8 rounded-control" />
      <Skeleton className="size-8 rounded-control" />
      <Skeleton className="size-8 rounded-control" />
    </div>
  </div>
);

export const MusicLibraryPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: '/music/' });
  const incomplete = search.incomplete === true;
  const page = search.page ?? 1;
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const editDialog = useDialog<MusicAdmin>();
  const deleteDialog = useDialog<MusicAdmin>();

  const navigateSearch = useSearchNavigation('/music', search);

  const [draft, setDraft] = useState(() => search.search ?? '');
  const commitQuery = useDebouncedCallback((value: string) => {
    navigateSearch(
      { page: undefined, search: value.trim() || undefined },
      true,
    );
  }, 300);

  useEffect(() => () => commitQuery.cancel(), [commitQuery]);

  const listQuery: MusicListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(search.search ? { search: search.search } : {}),
    ...(incomplete ? { incomplete: 'true' } : {}),
  };
  const musicQuery = useQuery(musicListOptions(listQuery));
  const data = musicQuery.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const loading = musicQuery.isPending;
  const busy = musicQuery.isFetching;
  const error = musicQuery.error;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasQuery = search.search !== undefined;

  const clamping =
    items.length === 0 && page > 1 && total > 0 && totalPages < page;

  const syncClampedPage = useEffectEvent(() => {
    navigateSearch({ page: totalPages > 1 ? totalPages : undefined }, true);
  });

  useEffect(() => {
    if (clamping) syncClampedPage();
  }, [clamping]);

  const removeMutation = useMutation({
    mutationFn: (target: MusicAdmin) => apiClient.music.remove(target.id),
    onSuccess: async (_data, target) => {
      usePlayerStore.getState().removeTrack(target.id);
      toast.success('已从音乐库删除。');
      await invalidateMusicAfterMutation();
    },
    onError: (removeError) => {
      toastError(removeError);
    },
  });

  const handlePlayToggle = (index: number) => {
    if (!data) return;
    const track = data.items[index];
    if (!track) return;
    if (currentTrack?.id === track.id) {
      toggle();
    } else {
      // 把当前筛选结果整页作为播放列表入队。
      play(data.items, index);
    }
  };

  const remove = () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    removeMutation.mutate(target);
  };

  return (
    <PageBody scroll="child" width="wide">
      <PageHeader
        actions={
          <SearchInput
            className="
              hidden w-64
              md:block
            "
            label="搜索音乐"
            onChange={(value) => {
              setDraft(value);
              commitQuery(value);
            }}
            placeholder="搜索标题、艺术家、专辑…"
            value={draft}
          />
        }
        description="音源与封面都是受管资产；删除音乐不会删除它们。"
        title="音乐库"
      />

      <div className="mt-5 flex items-center gap-2">
        <Button
          icon={<Upload aria-hidden />}
          onPress={() => void navigate({ to: '/music/upload' })}
          tone="solid"
        >
          上传音乐
        </Button>
        <FilterChip
          isSelected={incomplete}
          onPress={() => {
            navigateSearch({
              incomplete: incomplete ? undefined : true,
              page: undefined,
            });
          }}
        >
          缺元数据
        </FilterChip>
        <SearchInput
          className="
            min-w-0 flex-1
            md:hidden
          "
          label="搜索音乐"
          onChange={(value) => {
            setDraft(value);
            commitQuery(value);
          }}
          placeholder="搜索标题、艺术家、专辑…"
          value={draft}
        />
      </div>

      <section
        aria-busy={busy}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading || clamping ? (
          <div className={cn(GRID_CLASS, 'animate-content-in')} key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <MusicCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => void musicQuery.refetch()}>重试</Button>
            }
            icon={<CloudOff aria-hidden />}
            title="没能连上音乐库"
          >
            无法加载音乐库，请稍后重试。
          </EmptyState>
        ) : data && data.items.length === 0 ? (
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
              ) : incomplete ? (
                <Button
                  onPress={() =>
                    navigateSearch(
                      {
                        incomplete: undefined,
                        page: undefined,
                        search: undefined,
                      },
                      true,
                    )
                  }
                >
                  查看全部
                </Button>
              ) : (
                <Button
                  icon={<Upload aria-hidden />}
                  onPress={() => void navigate({ to: '/music/upload' })}
                  tone="solid"
                >
                  上传第一首音乐
                </Button>
              )
            }
            icon={
              hasQuery || incomplete ? (
                <Music2 aria-hidden />
              ) : (
                <Disc3 aria-hidden />
              )
            }
            title={
              hasQuery
                ? '没有匹配的音乐'
                : incomplete
                  ? '没有缺元数据的音乐'
                  : '音乐库是空的'
            }
          >
            {hasQuery
              ? '换一个关键词，或清除搜索看看全部。'
              : incomplete
                ? '所有曲目都有艺术家与专辑信息。'
                : '上传音频时会自动解析标题、艺术家、专辑与内嵌封面。'}
          </EmptyState>
        ) : (
          <div className={cn(GRID_CLASS, 'animate-content-in')} key="content">
            {data?.items.map((music, index) => (
              <MusicCard
                isCurrent={currentTrack?.id === music.id}
                isPlaying={status === 'playing'}
                key={music.id}
                music={music}
                onDelete={() => deleteDialog.open(music)}
                onEdit={() => editDialog.open(music)}
                onPlayToggle={() => handlePlayToggle(index)}
              />
            ))}
          </div>
        )}
      </section>

      {data ? (
        <Paginator
          className="mt-5"
          onChange={(next) =>
            navigateSearch({ page: next > 1 ? next : undefined })
          }
          page={page}
          total={data.total}
          totalPages={totalPages}
          unit="首"
        />
      ) : null}

      <EditMusicDialog
        music={editDialog.data}
        onClose={editDialog.dismiss}
        onExited={editDialog.clear}
        open={editDialog.isOpen}
      />

      <ConfirmDialog
        confirmLabel="删除音乐"
        isDestructive
        isOpen={deleteDialog.isOpen}
        message={
          deleteDialog.data
            ? `「${deleteDialog.data.title}」的记录会被删除；音源与封面资产会保留在资产库，可稍后到资产库清理。`
            : ''
        }
        onCancel={deleteDialog.dismiss}
        onConfirm={() => void remove()}
        onExited={deleteDialog.clear}
        title={deleteDialog.data ? `删除「${deleteDialog.data.title}」？` : ''}
      />
    </PageBody>
  );
};
