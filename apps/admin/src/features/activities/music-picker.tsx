import type { MusicListData, MusicTrack } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { Check, Disc3, ListMusic } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { useDerivedReset } from '@/hooks/use-derived-reset.js';
import { formatDuration } from '@/lib/format.js';
import {
  AppDialog,
  AssetImage,
  Button,
  EmptyState,
  Paginator,
  SearchInput,
  Skeleton,
  StatusReadout,
} from '@/ui/index.js';

const PAGE_SIZE = 20;
const SELECT_LIMIT = 10;

/**
 * 与真实选择行同构：封面 44px + 标题/艺术家两段 + 时长位。
 * 行高与真实相等（封面主导），数据落地时列表不跳。
 */
const MusicRowSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex w-full items-center gap-3 rounded-control p-2"
  >
    <Skeleton className="size-11 shrink-0 rounded-control" />
    <span className="min-w-0 flex-1">
      <Skeleton className="h-[1.55em] w-1/3 text-base" />
      <Skeleton className="h-[1.45em] w-1/2 text-2xs" />
    </span>
    <Skeleton className="h-[1.45em] w-10 shrink-0 text-2xs" />
  </div>
);

export const MusicPickerDialog = ({
  isOpen,
  onConfirm,
  onOpenChange,
  selected,
}: {
  isOpen: boolean;
  onConfirm: (tracks: MusicTrack[]) => void;
  onOpenChange: (open: boolean) => void;
  selected: MusicTrack[];
}) => {
  const [selection, setSelection] = useState<Map<number, MusicTrack>>(
    new Map(),
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MusicListData | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // 打开时以当前已选种子重建选择集；渲染期受条件保护地重置（React 官方模式）。
  useDerivedReset(isOpen, () => {
    if (isOpen) {
      setSelection(new Map(selected.map((track) => [track.id, track])));
      setQuery('');
      setDebouncedQuery('');
      setPage(1);
    }
  });

  // 搜索防抖 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    apiClient.music
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(debouncedQuery ? { search: debouncedQuery } : {}),
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError('');
        }
      })
      .catch(() => {
        if (!cancelled) setError('无法加载音乐库，请稍后重试。');
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, page, isOpen, reloadKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const atLimit = selection.size >= SELECT_LIMIT;

  const toggleTrack = (track: MusicTrack) => {
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(track.id)) {
        next.delete(track.id);
      } else if (!atLimit) {
        next.set(track.id, track);
      }
      return next;
    });
  };

  const confirm = () => {
    onConfirm([...selection.values()]);
    onOpenChange(false);
  };

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title="选择音乐"
    >
      <div className="grid gap-4">
        <SearchInput
          label="搜索音乐"
          onChange={setQuery}
          placeholder="搜索标题、艺术家、专辑…"
          value={query}
        />

        <div className="grid gap-1">
          {error ? (
            <EmptyState
              action={
                <Button onPress={() => setReloadKey((current) => current + 1)}>
                  重试
                </Button>
              }
              icon={<Disc3 aria-hidden="true" />}
              title="没能连上音乐库"
            >
              {error}
            </EmptyState>
          ) : !data ? (
            <div className="grid animate-content-in gap-1">
              {Array.from({ length: 5 }, (_, index) => (
                <MusicRowSkeleton key={index} />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={<ListMusic aria-hidden="true" />}
              title={debouncedQuery ? '没有匹配的音乐' : '音乐库是空的'}
            >
              {debouncedQuery
                ? '换一个关键词试试。'
                : '先去音乐库上传一首音乐，再回来关联到这里。'}
            </EmptyState>
          ) : (
            <ul
              className="
                m-0 list-none divide-y divide-rule rounded-panel border
                border-rule bg-case-raised p-1
                md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:rounded-none
                md:border-0 md:bg-transparent md:p-0
              "
            >
              {data.items.map((music) => {
                const isSelected = selection.has(music.id);
                const cover = music.coverAsset?.deliveryUrl ?? music.cover;
                return (
                  <li className="min-w-0" key={music.id}>
                    <button
                      className={cn(
                        `
                          flex w-full items-center gap-3 rounded-control p-2
                          text-left transition-colors
                        `,
                        `
                          hover:bg-accent-wash
                          md:h-full md:rounded-panel md:border md:border-rule
                          md:bg-case-raised md:p-3
                        `,
                        isSelected &&
                          `
                            bg-accent-wash
                            md:border-accent-rule
                          `,
                      )}
                      onClick={() => toggleTrack(music)}
                      type="button"
                    >
                      <span
                        className="
                          grid size-11 shrink-0 place-items-center
                          overflow-hidden rounded-control bg-well
                          md:size-14
                        "
                      >
                        {cover ? (
                          <AssetImage
                            alt=""
                            className="size-full object-cover"
                            src={cover}
                          />
                        ) : (
                          <Disc3
                            aria-hidden="true"
                            className="size-5 text-ink-dim"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base text-ink-strong">
                          {music.title}
                        </span>
                        <span
                          className="
                            block truncate font-mono text-2xs text-ink-dim
                          "
                        >
                          {music.artist || '未知艺术家'} ·
                          {music.album || '未知专辑'}
                        </span>
                      </span>
                      {music.inActivity ? (
                        <StatusReadout label="动态中" tone="busy" />
                      ) : null}
                      <span className="shrink-0 font-mono text-2xs text-ink-dim">
                        {formatDuration(music.seconds)}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          `
                            grid size-5 shrink-0 place-items-center rounded-full
                            border
                          `,
                          isSelected
                            ? 'border-accent bg-accent text-accent-on'
                            : 'border-edge text-transparent',
                        )}
                      >
                        <Check className="size-3" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-2xs text-ink-dim">
            已选 {selection.size} / {SELECT_LIMIT}
          </span>
          <div className="flex items-center gap-2">
            {data && data.total > PAGE_SIZE ? (
              <Paginator
                onChange={setPage}
                page={page}
                totalPages={totalPages}
              />
            ) : null}
            <Button onPress={() => onOpenChange(false)}>取消</Button>
            <Button
              isDisabled={selection.size === 0}
              onPress={confirm}
              tone="solid"
            >
              确定
            </Button>
          </div>
        </div>
      </div>
    </AppDialog>
  );
};
