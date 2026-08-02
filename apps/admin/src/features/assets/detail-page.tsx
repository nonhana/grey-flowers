import type { AssetDetailData } from '@grey-flowers/contracts';

import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  Copy,
  Music2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  Text,
} from 'react-aria-components';

import { apiClient } from '../../app/api/index.js';
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
  | { kind: 'error'; message: string }
  | { kind: 'loading' }
  | { kind: 'ready'; data: AssetDetailData };

type ConfirmAction = 'cleanup' | 'delete' | null;

function MetadataRow({
  label,
  children,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className="
        grid grid-cols-[112px_1fr] items-baseline gap-3 py-2
        max-[480px]:grid-cols-[96px_1fr]
      "
    >
      <dt className="font-mono text-[0.72rem] text-ink-faint">{label}</dt>
      <dd className="m-0 text-[0.9rem] text-ink">{children}</dd>
    </div>
  );
}

function ReferenceRow({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[0.9rem] text-ink-muted">{label}</span>
      <span
        className={`
          font-mono text-[0.86rem] tabular-nums
          ${count > 0 ? 'text-danger-text' : 'text-ink-faint'}
        `}
      >
        {count}
      </span>
    </div>
  );
}

function BaseConfirmDialog({
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <ModalOverlay
      className="
        fixed inset-0 z-50 grid place-items-center bg-black/30 p-4
        backdrop-blur-[2px]
      "
      isDismissable
      isOpen={open}
      onOpenChange={onCancel}
    >
      <Modal
        className="
          w-full max-w-100 rounded-panel border border-edge bg-surface
          p-[clamp(20px,5vw,28px)] shadow-panel
        "
      >
        <Dialog className="grid gap-4 outline-none">
          <Heading className="m-0 text-[1.1rem] text-ink-strong">
            {title}
          </Heading>
          <Text className="m-0 text-[0.92rem] leading-[1.6] text-ink-muted">
            {message}
          </Text>
          <div className="flex items-center justify-end gap-2">
            <Button
              className="
                min-h-10.5 rounded-control border border-edge bg-surface px-3.5
                font-mono text-[0.82rem] text-ink outline-none
                hover:border-input-hover-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
              "
              onPress={onCancel}
            >
              取消
            </Button>
            <Button
              className="
                flex min-h-10.5 items-center justify-center gap-2
                rounded-control border border-transparent bg-danger px-3.5
                font-mono text-[0.82rem] text-on-primary outline-none
                hover:bg-danger-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                [&_svg]:size-4
              "
              onPress={onConfirm}
            >
              <Trash2 aria-hidden="true" />
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function AssetsDetailPage({ assetId }: { assetId: string }) {
  const id = Number(assetId);
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });

    apiClient.assets
      .detail(id)
      .then((data) => {
        if (!cancelled) setState({ kind: 'ready', data });
      })
      .catch(() => {
        if (!cancelled)
          setState({ kind: 'error', message: '无法加载该资产。' });
      });

    return () => {
      cancelled = true;
    };
  }, [id, version]);

  async function runAction(action: 'cleanup' | 'delete' | 'restore') {
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
      setVersion((current) => current + 1);
    } catch (cause) {
      setActionError(assetErrorMessage(cause));
      if (action !== 'restore') setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  async function copyDeliveryUrl() {
    if (state.kind !== 'ready') return;

    await navigator.clipboard.writeText(state.data.asset.deliveryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto grid w-[min(100%-32px,760px)] gap-4 py-6">
        <div className="h-5 w-24 animate-pulse rounded-sm bg-edge" />
        <div className="h-56 animate-pulse rounded-panel bg-edge" />
        <div className="grid gap-2">
          <div className="h-4 w-1/2 animate-pulse rounded-sm bg-edge" />
          <div className="h-4 w-1/3 animate-pulse rounded-sm bg-edge" />
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto grid w-[min(100%-32px,760px)] gap-4 py-6">
        <p className="text-ink-muted">{state.message}</p>
        <Button
          className="
            min-h-10.5 rounded-control border border-edge bg-surface px-3.5
            font-mono text-[0.82rem] text-ink outline-none
            hover:border-input-hover-edge
            focus-visible:outline-[3px] focus-visible:outline-offset-2
            focus-visible:outline-focus-outline
          "
          onPress={() => setVersion((current) => current + 1)}
        >
          重试
        </Button>
      </div>
    );
  }

  const { asset, references } = state.data;
  const isAudio = asset.mediaType === 'AUDIO';
  const referenced = references.total > 0;

  return (
    <div
      className="
        mx-auto w-[min(100%-32px,760px)] py-6
        max-[480px]:w-[min(100%-24px,760px)]
      "
    >
      <div className="grid gap-5">
        <div className="grid gap-3">
          <Link
            className="
              inline-flex w-fit items-center gap-1.5 text-[0.86rem]
              text-ink-muted outline-none
              hover:text-brand
              focus-visible:outline-[3px] focus-visible:outline-offset-2
              focus-visible:outline-focus-outline
              [&_svg]:size-4
            "
            to="/assets"
          >
            <ArrowLeft aria-hidden="true" />
            返回资产库
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="m-0 font-mono text-[0.7rem] text-ink-faint">
                ASSET #{asset.id}
              </p>
              <h1 className="m-0 text-[1.5rem] leading-[1.2] text-ink-strong">
                {purposeLabels[asset.purpose]}
              </h1>
            </div>
            <span
              className={`
                font-mono text-[0.72rem]
                ${asset.status === 'AVAILABLE' ? 'text-brand' : asset.status === 'PENDING_CLEANUP' ? 'text-warning' : 'text-danger'}`}
            >
              {statusLabels[asset.status]}
            </span>
          </div>
        </div>

        <div
          className="
            grid place-items-center overflow-hidden rounded-panel border
            border-edge bg-surface
          "
        >
          {isAudio ? (
            <div className="grid w-full gap-3 p-5">
              <div className="grid h-40 place-items-center">
                <Music2 aria-hidden="true" className="size-10 text-ink-faint" />
              </div>
              <audio
                className="w-full"
                controls
                preload="metadata"
                src={asset.deliveryUrl}
              />
            </div>
          ) : (
            <img
              alt={purposeLabels[asset.purpose]}
              className="max-h-105 w-full object-contain"
              src={asset.deliveryUrl}
            />
          )}
        </div>

        <section
          className="
            grid gap-3 rounded-panel border border-edge bg-surface
            p-[clamp(16px,4vw,24px)]
          "
        >
          <Heading className="m-0 font-mono text-[0.82rem] text-ink-soft">
            元数据
          </Heading>
          <dl className="m-0 divide-y divide-edge">
            <MetadataRow label="用途">
              {purposeLabels[asset.purpose]}
            </MetadataRow>
            <MetadataRow label="类型">
              {mediaTypeLabels[asset.mediaType]}
            </MetadataRow>
            <MetadataRow label="MIME">{asset.mimeType}</MetadataRow>
            <MetadataRow label="大小">
              {formatBytes(asset.byteSize)}
            </MetadataRow>
            {!isAudio && asset.width && asset.height ? (
              <MetadataRow label="尺寸">
                {asset.width} × {asset.height} px
              </MetadataRow>
            ) : null}
            {asset.durationMs !== undefined ? (
              <MetadataRow label="时长">
                {formatDurationMs(asset.durationMs)}
              </MetadataRow>
            ) : null}
            <MetadataRow label="保存于">
              {formatDateTime(asset.createdAt)}
            </MetadataRow>
            <MetadataRow label="更新于">
              {formatDateTime(asset.updatedAt)}
            </MetadataRow>
          </dl>
        </section>

        <section
          className="
            grid gap-3 rounded-panel border border-edge bg-surface
            p-[clamp(16px,4vw,24px)]
          "
        >
          <Heading className="m-0 font-mono text-[0.82rem] text-ink-soft">
            公开地址
          </Heading>
          <div className="flex items-center gap-2">
            <code
              className="
                min-w-0 flex-1 truncate rounded-control border border-input-edge
                bg-input px-3 py-2.5 text-[0.82rem] text-primary-ink
              "
            >
              {asset.deliveryUrl}
            </code>
            <Button
              aria-label="复制公开地址"
              className="
                grid size-10.5 shrink-0 place-items-center rounded-control
                border border-edge bg-transparent text-ink-soft outline-none
                hover:border-input-hover-edge hover:text-brand
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                [&_svg]:size-4
              "
              onPress={() => void copyDeliveryUrl()}
            >
              {copied ? (
                <Check aria-hidden="true" className="text-brand" />
              ) : (
                <Copy aria-hidden="true" />
              )}
            </Button>
          </div>
        </section>

        <section
          className="
            grid gap-3 rounded-panel border border-edge bg-surface
            p-[clamp(16px,4vw,24px)]
          "
        >
          <Heading className="m-0 font-mono text-[0.82rem] text-ink-soft">
            引用状态
          </Heading>
          <div className="m-0 divide-y divide-edge">
            <ReferenceRow count={references.articleCovers} label="文章封面" />
            <ReferenceRow
              count={references.articleInlineAssets}
              label="正文插图"
            />
            <ReferenceRow count={references.categoryCovers} label="分类封面" />
            <ReferenceRow count={references.musicSources} label="音乐音源" />
            <ReferenceRow count={references.musicCovers} label="音乐封面" />
            <ReferenceRow count={references.activityImages} label="动态图片" />
            <div className="flex items-center justify-between py-2">
              <span className="text-[0.9rem] text-ink-strong">合计引用</span>
              <span
                className={`
                  font-mono text-[0.9rem] tabular-nums
                  ${referenced ? 'text-danger-text' : 'text-brand'}
                `}
              >
                {references.total}
              </span>
            </div>
          </div>
          <Text
            className={`
              text-[0.86rem]
              ${referenced ? 'text-danger-text' : 'text-ink-muted'}
            `}
          >
            {referenced
              ? '该资产仍被引用，不能标记或删除。'
              : '零引用，可以在安全条件下标记或删除。'}
          </Text>
        </section>

        {asset.status !== 'DELETED' ? (
          <section
            className="
              grid gap-3 rounded-panel border border-danger-edge bg-danger-soft
              p-[clamp(16px,4vw,24px)]
            "
          >
            <div
              className="
                flex items-center gap-2 font-mono text-[0.82rem] text-danger-ink
                [&_svg]:size-4
              "
            >
              <ShieldAlert aria-hidden="true" />
              危险操作
            </div>
            {actionError ? (
              <p
                className="
                  border-l-[3px] border-l-danger-edge bg-danger-soft px-2.5 py-2
                  text-[0.86rem] text-danger-ink
                "
                role="alert"
              >
                {actionError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {asset.status === 'AVAILABLE' ? (
                <Button
                  className="
                    flex min-h-10.5 items-center justify-center gap-2
                    rounded-control border border-danger-edge bg-surface px-3.5
                    font-mono text-[0.82rem] text-danger-text outline-none
                    hover:bg-danger
                    focus-visible:outline-[3px] focus-visible:outline-offset-2
                    focus-visible:outline-focus-outline
                    [&_svg]:size-4
                  "
                  isDisabled={referenced || busy}
                  onPress={() => setConfirm('cleanup')}
                >
                  标记清理
                </Button>
              ) : (
                <>
                  <Button
                    className="
                      flex min-h-10.5 items-center justify-center gap-2
                      rounded-control border border-edge bg-surface px-3.5
                      font-mono text-[0.82rem] text-ink outline-none
                      hover:border-input-hover-edge
                      focus-visible:outline-[3px] focus-visible:outline-offset-2
                      focus-visible:outline-focus-outline
                    "
                    isDisabled={busy}
                    onPress={() => void runAction('restore')}
                  >
                    恢复
                  </Button>
                  <Button
                    className="
                      flex min-h-10.5 items-center justify-center gap-2
                      rounded-control border border-danger-edge bg-surface
                      px-3.5 font-mono text-[0.82rem] text-danger-text
                      outline-none
                      hover:bg-danger
                      focus-visible:outline-[3px] focus-visible:outline-offset-2
                      focus-visible:outline-focus-outline
                      [&_svg]:size-4
                    "
                    isDisabled={referenced || busy}
                    onPress={() => setConfirm('delete')}
                  >
                    <Trash2 aria-hidden="true" />
                    彻底删除
                  </Button>
                </>
              )}
              {referenced ? (
                <Text className="text-[0.8rem] text-danger-text">
                  存在引用时不能执行危险操作
                </Text>
              ) : null}
            </div>
          </section>
        ) : (
          <section
            className="
              grid gap-2 rounded-panel border border-edge bg-surface
              p-[clamp(16px,4vw,24px)]
            "
          >
            <Text className="text-[0.88rem] text-ink-muted">
              该资产已删除，R2 对象已被移除。
            </Text>
          </section>
        )}
      </div>

      <BaseConfirmDialog
        confirmLabel="确认标记"
        message="标记后资产将进入“待清理”状态：不可再关联新的内容；删除前必须保持零引用。此操作可随时通过“恢复”撤销。"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runAction('cleanup')}
        open={confirm === 'cleanup'}
        title="标记为待清理？"
      />
      <BaseConfirmDialog
        confirmLabel="确认删除"
        message="彻底删除不可撤销：将立即移除 R2 中的对象，并把该资产的记录标记为已删除。"
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runAction('delete')}
        open={confirm === 'delete'}
        title="彻底删除该资产？"
      />
    </div>
  );
}
