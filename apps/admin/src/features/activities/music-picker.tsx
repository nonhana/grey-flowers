import type { MusicListQuery, MusicTrack } from '@grey-flowers/contracts';

import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { Check, Disc3, ListMusic } from 'lucide-react';
import { useState } from 'react';
import { useDebounce } from 'use-debounce';

import { musicPickerOptions } from '@/app/server-state/modules/music';
import { formatDuration } from '@/lib/format';
import { Button } from '@/ui/button';
import { EmptyState, Skeleton, StatusReadout } from '@/ui/feedback';
import { SearchInput } from '@/ui/form';
import { AssetImage } from '@/ui/image';
import { AppDialog } from '@/ui/overlay';
import { Paginator } from '@/ui/paginator';

const PAGE_SIZE = 20;

const MusicRowSkeleton = () => (
  <div
    aria-hidden
    className="flex w-full items-center gap-3 rounded-control p-2"
  >
    <Skeleton className="size-11 shrink-0 rounded-control" />
    <span className="min-w-0 flex-1">
      <Skeleton className="h-[1.45em] w-3/5 text-base" />
      <Skeleton className="mt-1 h-[1.45em] w-2/5 text-2xs" />
    </span>
    <Skeleton className="h-[1.45em] w-10 shrink-0 text-2xs" />
  </div>
);

/** session-keyed 内层：搜索框与 300ms 防抖住在会话组件里，挂载即从空查询开始，重开不发注定被丢弃的请求；选择集随会话播种，确认前一直保留 */
const MusicPickerBody = ({
  isOpen,
  maxSelection,
  onConfirm,
  onOpenChange,
  selected,
  session,
}: {
  isOpen: boolean;
  maxSelection: number;
  onConfirm: (tracks: MusicTrack[]) => void;
  onOpenChange: (open: boolean) => void;
  selected: MusicTrack[];
  session: number;
}) => {
  const [selection, setSelection] = useState<Map<number, MusicTrack>>(
    new Map(selected.map((track) => [track.id, track])),
  );
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const committedQuery = useDebounce(query, 300)[0];
  const [prevCommitted, setPrevCommitted] = useState(committedQuery);
  if (prevCommitted !== committedQuery) {
    setPrevCommitted(committedQuery);
    setPage(1);
  }

  const listQuery: MusicListQuery = {
    page,
    pageSize: PAGE_SIZE,
    ...(committedQuery ? { search: committedQuery } : {}),
  };
  const pickerQuery = useQuery({
    ...musicPickerOptions(session, listQuery),
    enabled: isOpen,
  });
  const data = pickerQuery.data;
  const error = pickerQuery.error ? '无法加载音乐库，请稍后重试。' : '';

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const atLimit = selection.size >= maxSelection;

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
              <Button onPress={() => void pickerQuery.refetch()}>重试</Button>
            }
            icon={<Disc3 aria-hidden />}
            title="没能连上音乐库"
          >
            {error}
          </EmptyState>
        ) : pickerQuery.isPending && pickerQuery.isFetching ? (
          <div className="grid animate-content-in gap-1">
            {Array.from({ length: 5 }, (_, index) => (
              <MusicRowSkeleton key={index} />
            ))}
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={<ListMusic aria-hidden />}
            title={committedQuery ? '没有匹配的音乐' : '音乐库是空的'}
          >
            {committedQuery
              ? '换一个关键词试试。'
              : '先去音乐库上传一首音乐，再回来关联到这里。'}
          </EmptyState>
        ) : data ? (
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
                        grid size-11 shrink-0 place-items-center overflow-hidden
                        rounded-control bg-well
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
                        <Disc3 aria-hidden className="size-5 text-ink-dim" />
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
                      aria-hidden
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
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-2xs text-ink-dim">
          已选 {selection.size} / {maxSelection}
        </span>
        <div className="flex items-center gap-2">
          {data && data.total > PAGE_SIZE ? (
            <Paginator onChange={setPage} page={page} totalPages={totalPages} />
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
  );
};

export const MusicPickerDialog = ({
  isOpen,
  maxSelection,
  onConfirm,
  onOpenChange,
  selected,
}: {
  isOpen: boolean;
  maxSelection: number;
  onConfirm: (tracks: MusicTrack[]) => void;
  onOpenChange: (open: boolean) => void;
  selected: MusicTrack[];
}) => {
  // 每次 open 产生新的 session 作内层 key：重开即拿到全新的搜索/页码/选择状态，退出动画期间旧会话不污染新会话
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen && !wasOpen) {
    setWasOpen(true);
    setSession((current) => current + 1);
  } else if (!isOpen && wasOpen) {
    setWasOpen(false);
  }

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title="选择音乐"
    >
      <MusicPickerBody
        isOpen={isOpen}
        key={session}
        maxSelection={maxSelection}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        selected={selected}
        session={session}
      />
    </AppDialog>
  );
};
