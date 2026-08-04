import type { MusicAdmin } from '@grey-flowers/contracts';

import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Disc3, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDateTime, formatDuration } from '@/lib/format.js';
import {
  Alert,
  AssetImage,
  Button,
  buttonClass,
  ConfirmDialog,
  MetaLine,
  PageBody,
  PageHeader,
  Panel,
  SectionLabel,
  Skeleton,
  StatusReadout,
} from '@/ui/index.js';

import { EditMusicDialog } from './edit-dialog.js';
import { audioPlayer, useAudioPlayer } from './player/audio-player-store.js';

type DetailState =
  | { data: MusicAdmin; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' };

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

export const MusicDetailPage = () => {
  const { musicId } = useParams({ strict: false }) as { musicId: string };
  const id = Number(musicId);
  const navigate = useNavigate();
  const player = useAudioPlayer();
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [editingOpen, setEditingOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;

    apiClient.music
      .detail(id)
      .then((data) => {
        if (!cancelled) setState({ data, kind: 'ready' });
      })
      .catch(() => {
        if (!cancelled)
          setState({ kind: 'error', message: '无法加载这首音乐。' });
      });

    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (state.kind === 'loading') {
    return (
      <PageBody>
        <div className="grid gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </PageBody>
    );
  }

  if (state.kind === 'error') {
    return (
      <PageBody>
        <div className="grid justify-items-center gap-4 py-16 text-center">
          <p className="text-md text-ink-dim">{state.message}</p>
          <Button onPress={() => setVersion((current) => current + 1)}>
            重试
          </Button>
        </div>
      </PageBody>
    );
  }

  const music = state.data;
  const isCurrent = player.currentTrack?.id === music.id;
  const isPlaying = isCurrent && player.status === 'playing';

  const togglePlayback = () => {
    if (isCurrent) {
      audioPlayer.toggle();
      return;
    }
    const queue = player.playlist.length > 0 ? player.playlist : [music];
    audioPlayer.play(
      queue,
      queue.findIndex((track) => track.id === music.id),
    );
  };

  const remove = async () => {
    setBusy(true);
    setActionError('');
    try {
      await apiClient.music.remove(id);
      audioPlayer.removeTrack(id);
      await navigate({ to: '/music' });
    } catch (removeError) {
      setActionError(apiErrorMessage(removeError));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
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
            <ArrowLeft aria-hidden="true" className="size-4" />
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
            <Disc3 aria-hidden="true" className="size-10 text-ink-dim" />
          )}
        </div>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>播放</SectionLabel>
          <div className="flex items-center gap-2">
            <Button
              icon={isPlaying ? <Disc3 aria-hidden="true" /> : undefined}
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
                ? `是（动态 #${String(music.activityId)}）`
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
          {actionError ? <Alert>{actionError}</Alert> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              icon={<Pencil aria-hidden="true" />}
              onPress={() => {
                setActionError('');
                setEditingOpen(true);
              }}
              tone="quiet"
            >
              编辑
            </Button>
            <Button
              icon={<Trash2 aria-hidden="true" />}
              isDisabled={busy}
              onPress={() => {
                setActionError('');
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
        onSaved={() => setVersion((current) => current + 1)}
        open={editingOpen}
      />

      <ConfirmDialog
        confirmLabel="删除音乐"
        isDestructive
        isOpen={confirmDelete}
        message={`「${music.title}」的记录会被删除；音源与封面资产会保留在资产库，可稍后到资产库清理。`}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
        title={`删除「${music.title}」？`}
      />
    </PageBody>
  );
};
