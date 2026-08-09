import type { MusicAdmin, MusicListData } from '@grey-flowers/contracts';

import { useNavigate, useSearch } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { CloudOff, Disc3, Music2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { usePlayerStore } from '@/store/player.js';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FilterChip,
  MetaLine,
  PageBody,
  PageHeader,
  Paginator,
  SearchInput,
  Skeleton,
} from '@/ui/index.js';

import { EditMusicDialog } from './edit-dialog.js';
import { MusicCard } from './music-card.js';

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
      flex h-full flex-col overflow-hidden rounded-panel border
      border-rule bg-case-raised
    "
  >
    <Skeleton className="min-h-[10.5rem] w-full flex-1 rounded-none" />
    <div className="grid gap-1 px-3 py-2.5">
      <Skeleton className="h-[1.55em] w-1/2 text-base" />
      <MetaLine>
        <Skeleton className="h-[1.45em] w-20 text-2xs" />
        <Skeleton className="h-[1.45em] w-24 text-2xs" />
        <Skeleton className="ml-auto h-[1.45em] w-10 text-2xs" />
      </MetaLine>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <Skeleton className="h-[1.45em] w-14 text-2xs" />
        <span className="flex shrink-0 gap-1.5">
          <Skeleton className="size-8 rounded-control" />
          <Skeleton className="size-8 rounded-control" />
          <Skeleton className="size-8 rounded-control" />
        </span>
      </div>
    </div>
  </div>
);

export const MusicLibraryPage = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { incomplete?: unknown };
  const incomplete = search.incomplete === true;
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<MusicListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const editDialog = useDialog<MusicAdmin>();
  const deleteDialog = useDialog<MusicAdmin>();

  // 搜索防抖 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // 请求条件一变就在渲染期切回加载态（React 官方的「按输入调整 state」模式）。
  const requestKey = `${debouncedQuery}|${String(incomplete)}|${String(page)}|${String(reloadKey)}`;
  useDerivedReset(requestKey, () => {
    setLoading(true);
    setError('');
  });

  useEffect(() => {
    let cancelled = false;

    apiClient.music
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
        ...(incomplete ? { incomplete: 'true' } : {}),
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError('无法加载音乐库，请稍后重试。');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, reloadKey, incomplete]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasQuery = debouncedQuery.length > 0;

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

  const remove = async () => {
    const target = deleteDialog.data;
    if (!target) return;
    deleteDialog.dismiss();
    try {
      await apiClient.music.remove(target.id);
      usePlayerStore.getState().removeTrack(target.id);
      setReloadKey((current) => current + 1);
      toast.success('已从音乐库删除。');
    } catch (removeError) {
      toastError(removeError);
    }
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
            onChange={setQuery}
            placeholder="搜索标题、艺术家、专辑…"
            value={query}
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
            setPage(1);
            void navigate({
              search: incomplete ? {} : { incomplete: true },
              to: '/music',
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
          onChange={setQuery}
          placeholder="搜索标题、艺术家、专辑…"
          value={query}
        />
      </div>

      <section
        aria-busy={loading}
        className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {loading ? (
          <div className={cn(GRID_CLASS, 'animate-content-in')} key="skeleton">
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <MusicCardSkeleton key={index} />
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
            title="没能连上音乐库"
          >
            {error}
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasQuery ? (
                <Button onPress={() => setQuery('')}>清除搜索</Button>
              ) : incomplete ? (
                <Button
                  onPress={() => void navigate({ search: {}, to: '/music' })}
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
          onChange={setPage}
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
        onSaved={() => setReloadKey((current) => current + 1)}
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
