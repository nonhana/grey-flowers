import type { AssetDetailData } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { ArrowLeft, Check, Copy, Music2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { apiClient } from '@/app/api/index.js';
import {
  Alert,
  AssetImage,
  Button,
  buttonClass,
  ConfirmDialog,
  IconButton,
  PageBody,
  PageHeader,
  Panel,
  SectionLabel,
  Skeleton,
  StatusReadout,
} from '@/ui/index.js';

import {
  assetErrorMessage,
  formatBytes,
  formatDateTime,
  formatDurationMs,
  mediaTypeLabels,
  purposeLabels,
  statusLabels,
} from './display.js';

type DetailState =
  | { data: AssetDetailData; kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'loading' };

type ConfirmAction = 'cleanup' | 'delete' | null;

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

const ReferenceRow = ({ count, label }: { count: number; label: string }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-base text-ink-dim">{label}</span>
    <span
      className={cn(
        'font-mono text-base tabular-nums',
        count > 0 ? 'text-accent-text' : 'text-ink-dim',
      )}
    >
      {count}
    </span>
  </div>
);

export const AssetsDetailPage = ({ assetId }: { assetId: string }) => {
  const id = Number(assetId);
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  useEffect(() => {
    let cancelled = false;

    apiClient.assets
      .detail(id)
      .then((data) => {
        if (!cancelled) setState({ data, kind: 'ready' });
      })
      .catch(() => {
        if (!cancelled)
          setState({ kind: 'error', message: '无法加载该资产。' });
      });

    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const runAction = async (action: 'cleanup' | 'delete' | 'restore') => {
    setBusy(true);
    setActionError('');

    try {
      if (action === 'cleanup') {
        await apiClient.assets.setStatus(id, 'PENDING_CLEANUP');
      } else if (action === 'restore') {
        await apiClient.assets.setStatus(id, 'AVAILABLE');
      } else {
        await apiClient.assets.remove(id);
      }
      setConfirm(null);
      setState({ kind: 'loading' });
      setVersion((current) => current + 1);
    } catch (cause) {
      setActionError(assetErrorMessage(cause));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const copyDeliveryUrl = async () => {
    if (state.kind !== 'ready') return;
    await navigator.clipboard.writeText(state.data.asset.deliveryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (state.kind === 'loading') {
    return (
      <PageBody>
        <div className="grid gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-56 w-full" />
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

  const { asset, references } = state.data;
  const isAudio = asset.mediaType === 'AUDIO';
  const referenced = references.total > 0;

  return (
    <PageBody>
      <PageHeader
        actions={
          <StatusReadout
            label={statusLabels[asset.status]}
            tone={
              asset.status === 'AVAILABLE'
                ? 'ok'
                : asset.status === 'PENDING_CLEANUP'
                  ? 'warn'
                  : 'err'
            }
          />
        }
        leading={
          <Link
            aria-label="返回资产库"
            className={buttonClass({
              className: 'size-10 px-0',
              tone: 'ghost',
            })}
            to="/assets"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        }
        title={purposeLabels[asset.purpose]}
      />

      <div className="mt-5 grid gap-4">
        <div
          className="
            grid place-items-center overflow-hidden rounded-panel border
            border-rule bg-case-raised
          "
        >
          {isAudio ? (
            <div className="grid w-full gap-3 p-5">
              <div className="grid h-32 place-items-center">
                <Music2 aria-hidden="true" className="size-9 text-ink-dim" />
              </div>
              <audio
                className="w-full"
                controls
                preload="metadata"
                src={asset.deliveryUrl}
              />
            </div>
          ) : (
            <AssetImage
              alt={purposeLabels[asset.purpose]}
              className="max-h-104 w-full object-contain"
              src={asset.deliveryUrl}
            />
          )}
        </div>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>公开地址</SectionLabel>
          <div className="flex items-center gap-2">
            <code
              className="
                min-w-0 flex-1 truncate rounded-control bg-well px-3 py-2.5
                font-mono text-xs text-ink
              "
            >
              {asset.deliveryUrl}
            </code>
            <IconButton
              label={copied ? '已复制' : '复制公开地址'}
              onPress={() => void copyDeliveryUrl()}
              tone="quiet"
            >
              {copied ? (
                <Check aria-hidden="true" className="text-accent-text" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </IconButton>
          </div>
        </Panel>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>元数据</SectionLabel>
          <dl className="m-0 divide-y divide-rule">
            <Row label="用途">{purposeLabels[asset.purpose]}</Row>
            <Row label="类型">{mediaTypeLabels[asset.mediaType]}</Row>
            <Row label="MIME">
              <span className="font-mono text-xs">{asset.mimeType}</span>
            </Row>
            <Row label="大小">{formatBytes(asset.byteSize)}</Row>
            {!isAudio && asset.width && asset.height ? (
              <Row label="尺寸">
                {asset.width} × {asset.height} px
              </Row>
            ) : null}
            {asset.durationMs === undefined ? null : (
              <Row label="时长">{formatDurationMs(asset.durationMs)}</Row>
            )}
            <Row label="保存于">{formatDateTime(asset.createdAt)}</Row>
            <Row label="更新于">{formatDateTime(asset.updatedAt)}</Row>
          </dl>
        </Panel>

        <Panel className="grid gap-2 p-4">
          <SectionLabel>引用</SectionLabel>
          <div className="m-0 divide-y divide-rule">
            <ReferenceRow count={references.articleCovers} label="文章封面" />
            <ReferenceRow
              count={references.articleInlineAssets}
              label="正文插图"
            />
            <ReferenceRow count={references.categoryCovers} label="分类封面" />
            <ReferenceRow count={references.musicSources} label="音乐音源" />
            <ReferenceRow count={references.musicCovers} label="音乐封面" />
            <ReferenceRow count={references.activityImages} label="动态图片" />
          </div>
          <p className="text-base/relaxed text-ink-dim">
            {referenced
              ? `还有 ${String(references.total)} 处在用这个资产，所以不能标记清理或删除。`
              : '没有任何地方在引用它，可以安全地标记清理或删除。'}
          </p>
        </Panel>

        {asset.status === 'DELETED' ? (
          <Panel className="p-4">
            <p className="text-base text-ink-dim">
              这个资产已经删除，R2 上的对象也已移除。
            </p>
          </Panel>
        ) : (
          <Panel className="grid gap-3 p-4">
            <SectionLabel>危险操作</SectionLabel>
            {actionError ? <Alert>{actionError}</Alert> : null}
            <div className="flex flex-wrap items-center gap-2">
              {asset.status === 'AVAILABLE' ? (
                <Button
                  isDisabled={referenced || busy}
                  onPress={() => setConfirm('cleanup')}
                  tone="warnish"
                >
                  标记为待清理
                </Button>
              ) : (
                <>
                  <Button
                    isDisabled={busy}
                    onPress={() => void runAction('restore')}
                  >
                    恢复为可用
                  </Button>
                  <Button
                    icon={<Trash2 aria-hidden="true" />}
                    isDisabled={referenced || busy}
                    onPress={() => setConfirm('delete')}
                    tone="warnish"
                  >
                    彻底删除
                  </Button>
                </>
              )}
            </div>
          </Panel>
        )}
      </div>

      <ConfirmDialog
        confirmLabel="标记为待清理"
        isOpen={confirm === 'cleanup'}
        message="待清理的资产不能再被新的内容引用，但已有引用不受影响。随时可以恢复。"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runAction('cleanup')}
        title="标记为待清理？"
      />
      <ConfirmDialog
        confirmLabel="彻底删除"
        isDestructive
        isOpen={confirm === 'delete'}
        message="R2 上的文件会立即移除，记录标记为已删除。此操作不可撤销。"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runAction('delete')}
        title="彻底删除这个资产？"
      />
    </PageBody>
  );
};
