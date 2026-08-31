import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Disc3, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import {
  invalidateMusicAfterMutation,
  musicDetailOptions,
} from '@/app/server-state/music.js';
import { formatDateTime, formatDuration } from '@/lib/format.js';
import { toastError } from '@/lib/toast.js';
import { usePlayerStore } from '@/store/player.js';
import { Button, buttonClass } from '@/ui/button.js';
import { Skeleton, StatusReadout } from '@/ui/feedback.js';
import { AssetImage } from '@/ui/image.js';
import { ConfirmDialog } from '@/ui/overlay.js';
import {
  MetaLine,
  PageBody,
  PageHeader,
  Panel,
  SectionLabel,
} from '@/ui/surface.js';

import { EditMusicDialog } from './edit-dialog.js';

const Row = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <div className="grid grid-cols-[6rem_1fr] items-baseline gap-3 py-2">
    <dt className="font-mono text-2xs text-ink-dim">{label}</dt>
    <dd className="m-0 text-base text-ink">{children}</dd>
  </div>
);

const DetailSkeleton = () => (
  <PageBody>
    {/* 与真实详情同构：页头位 + 方封面 + 播放面板 + 元数据面板 */}
    <div className="grid animate-content-in gap-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-10 shrink-0 rounded-control" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="ml-auto h-7 w-20 rounded-full" />
      </div>
      <Skeleton className="mx-auto aspect-square w-full max-w-72 rounded-panel" />
      <div
        className="
          grid gap-2 rounded-panel border border-rule bg-case-raised p-4
        "
      >
        <Skeleton className="h-[1.45em] w-12 text-2xs" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-control" />
          <Skeleton className="h-[1.45em] w-20 text-2xs" />
        </div>
      </div>
      <div
        className="
          grid gap-2 rounded-panel border border-rule bg-case-raised p-4
        "
      >
        <Skeleton className="h-[1.45em] w-16 text-2xs" />
        <div className="divide-y divide-rule">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="flex items-center justify-between gap-4 py-2.5"
              key={index}
            >
              <Skeleton className="h-[1.45em] w-10 text-2xs" />
              <Skeleton className="h-[1.55em] w-32 text-base" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </PageBody>
);

export const MusicDetailPage = () => {
  const { musicId } = useParams({ strict: false }) as { musicId: string };
  const id = Number(musicId);
  const enabled = Number.isSafeInteger(id) && id > 0;
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const status = usePlayerStore((s) => s.status);
  const playlist = usePlayerStore((s) => s.playlist);
  const toggle = usePlayerStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const removeTrack = usePlayerStore((s) => s.removeTrack);
  const [editingOpen, setEditingOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const detailQuery = useQuery({ ...musicDetailOptions(id), enabled });

  const removeMutation = useMutation({
    mutationFn: () => apiClient.music.remove(id),
    onSuccess: async () => {
      removeTrack(id);
      toast.success('已从音乐库删除。');
      await invalidateMusicAfterMutation();
      await navigate({ to: '/music' });
    },
    onError: (removeError) => {
      toastError(removeError);
      setConfirmDelete(false);
    },
  });

  if (!enabled || detailQuery.isFetching) {
    return <DetailSkeleton />;
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <PageBody>
        <div className="grid justify-items-center gap-4 py-16 text-center">
          <p className="text-md text-ink-dim">无法加载这首音乐。</p>
          <Button onPress={() => void detailQuery.refetch()}>重试</Button>
        </div>
      </PageBody>
    );
  }

  const music = detailQuery.data;
  const isCurrent = currentTrack?.id === music.id;
  const isPlaying = isCurrent && status === 'playing';

  const togglePlayback = () => {
    if (isCurrent) {
      toggle();
      return;
    }
    // 点播即播这首（L-15）：当前队列里有它就按原位播；没有（含队列为
    // 空）就把它插到队首再播——不再让 player 把 findIndex=-1 钳成 0 而
    // 在其他队列播放中点播时播错歌。
    const index = playlist.findIndex((track) => track.id === music.id);
    if (index === -1) {
      play([music, ...playlist], 0);
      return;
    }
    play(playlist, index);
  };

  return (
    <PageBody>
      <PageHeader
        actions={
          <StatusReadout
            label={music.inActivity ? '已被动态引用' : '未进入动态'}
            tone={music.inActivity ? 'busy' : 'ok'}
          />
        }
        leading={
          <Link
            aria-label="返回音乐库"
            className={buttonClass({
              className: 'size-10 px-0',
              tone: 'ghost',
            })}
            to="/music"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        }
        title={music.title}
      />

      <div className="mt-5 grid gap-4">
        <div
          className="
            mx-auto grid aspect-square w-full max-w-72 place-items-center
            overflow-hidden rounded-panel border border-rule bg-case-raised
          "
        >
          {music.cover ? (
            <AssetImage
              alt=""
              className="size-full object-cover"
              src={music.cover}
            />
          ) : (
            <Disc3 aria-hidden className="size-10 text-ink-dim" />
          )}
        </div>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>播放</SectionLabel>
          <div className="flex items-center gap-2">
            <Button
              icon={isPlaying ? <Disc3 aria-hidden /> : undefined}
              onPress={togglePlayback}
              tone="solid"
            >
              {isPlaying ? '暂停' : '播放'}
            </Button>
            <span className="font-mono text-2xs text-ink-dim">
              {isCurrent ? (isPlaying ? '播放中' : '已暂停') : '尚未播放'}
            </span>
          </div>
        </Panel>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>元数据</SectionLabel>
          <dl className="m-0 divide-y divide-rule">
            <Row label="标题">{music.title}</Row>
            <Row label="艺术家">{music.artist || '未知艺术家'}</Row>
            <Row label="专辑">{music.album || '未知专辑'}</Row>
            <Row label="时长">{formatDuration(music.seconds)}</Row>
            <Row label="上传于">{formatDateTime(music.createdAt)}</Row>
            <Row label="被动态引用">
              {music.inActivity
                ? `是（${String(music.activityCount)} 条动态）`
                : '否'}
            </Row>
          </dl>
        </Panel>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>资产</SectionLabel>
          <div className="m-0 divide-y divide-rule">
            <div className="grid gap-1 py-2">
              <MetaLine>
                <span>音源</span>
                <span className="ml-auto font-mono text-xs">
                  {music.sourceAsset?.deliveryUrl ?? music.src}
                </span>
              </MetaLine>
              {music.sourceAsset ? (
                <Link
                  className="
                    text-base text-accent-text
                    hover:underline
                  "
                  params={{ assetId: String(music.sourceAsset.id) }}
                  to="/assets/$assetId"
                >
                  查看音源资产 #{String(music.sourceAsset.id)}
                </Link>
              ) : null}
            </div>
            <div className="grid gap-1 py-2">
              <MetaLine>
                <span>封面</span>
                <span className="ml-auto font-mono text-xs">{music.cover}</span>
              </MetaLine>
              {music.coverAsset ? (
                <Link
                  className="
                    text-base text-accent-text
                    hover:underline
                  "
                  params={{ assetId: String(music.coverAsset.id) }}
                  to="/assets/$assetId"
                >
                  查看封面资产 #{String(music.coverAsset.id)}
                </Link>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel className="grid gap-3 p-4">
          <SectionLabel>操作</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Pencil aria-hidden />}
              onPress={() => {
                setEditingOpen(true);
              }}
              tone="quiet"
            >
              编辑
            </Button>
            <Button
              icon={<Trash2 aria-hidden />}
              isDisabled={removeMutation.isPending}
              onPress={() => {
                setConfirmDelete(true);
              }}
              tone="warnish"
            >
              删除
            </Button>
          </div>
        </Panel>
      </div>

      <EditMusicDialog
        music={music}
        onClose={() => setEditingOpen(false)}
        open={editingOpen}
      />

      <ConfirmDialog
        confirmLabel="删除音乐"
        isDestructive
        isOpen={confirmDelete}
        message={`「${music.title}」的记录会被删除；音源与封面资产会保留在资产库，可稍后到资产库清理。`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void removeMutation.mutate()}
        title={`删除「${music.title}」？`}
      />
    </PageBody>
  );
};
