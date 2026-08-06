import type { MusicAdmin, MusicListData } from '@grey-flowers/contracts';

import { useNavigate } from '@tanstack/react-router';
import { CloudOff, Disc3, Music2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useDialog } from '@/hooks/use-dialog.js';
import { toastError } from '@/lib/toast.js';
import { usePlayerStore } from '@/store/player.js';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  PageBody,
  PageHeader,
  SearchInput,
  Skeleton,
} from '@/ui/index.js';

import { EditMusicDialog } from './edit-dialog.js';
import { MusicCard } from './music-card.js';

const PAGE_SIZE = 12;
const GRID_CLASS = 'grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3';

const CardSkeleton = () => (
  <div
    className="
      grid overflow-hidden rounded-panel border border-rule bg-case-raised
    "
  >
    <Skeleton className="aspect-4/3 w-full rounded-none" />
    <div className="grid gap-2 px-3 py-2.5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const MusicLibraryPage = () => {
  const navigate = useNavigate();
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
  const requestKey = `${debouncedQuery}|${String(page)}|${String(reloadKey)}`;
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey);
  if (prevRequestKey !== requestKey) {
    setPrevRequestKey(requestKey);
    setLoading(true);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;

    apiClient.music
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
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
  }, [debouncedQuery, page, reloadKey]);

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
    <PageBody width="wide">
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
          icon={<Upload aria-hidden="true" />}
          onPress={() => void navigate({ to: '/music/upload' })}
          tone="solid"
        >
          上传音乐
        </Button>
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

      <section aria-busy={loading} className="mt-5">
        {loading ? (
          <div className={GRID_CLASS}>
            {Array.from({ length: 6 }, (_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            action={
              <Button onPress={() => setReloadKey((current) => current + 1)}>
                重试
              </Button>
            }
            icon={<CloudOff aria-hidden="true" />}
            title="没能连上音乐库"
          >
            {error}
          </EmptyState>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            action={
              hasQuery ? (
                <Button onPress={() => setQuery('')}>清除搜索</Button>
              ) : (
                <Button
                  icon={<Upload aria-hidden="true" />}
                  onPress={() => void navigate({ to: '/music/upload' })}
                  tone="solid"
                >
                  上传第一首音乐
                </Button>
              )
            }
            icon={
              hasQuery ? (
                <Music2 aria-hidden="true" />
              ) : (
                <Disc3 aria-hidden="true" />
              )
            }
            title={hasQuery ? '没有匹配的音乐' : '音乐库是空的'}
          >
            {hasQuery
              ? '换一个关键词，或清除搜索看看全部。'
              : '上传音频时会自动解析标题、艺术家、专辑与内嵌封面。'}
          </EmptyState>
        ) : (
          <div className={GRID_CLASS}>
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

      {data && data.total > PAGE_SIZE ? (
        <nav
          aria-label="分页"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <span className="font-mono text-xs text-ink-dim">
            共 {data.total} 首 · 第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <Button
              isDisabled={page <= 1}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              size="sm"
            >
              上一页
            </Button>
            <Button
              isDisabled={page >= totalPages}
              onPress={() => setPage((current) => current + 1)}
              size="sm"
            >
              下一页
            </Button>
          </div>
        </nav>
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
        title={
          deleteDialog.data ? `删除「${deleteDialog.data.title}」？` : ''
        }
      />
    </PageBody>
  );
};
