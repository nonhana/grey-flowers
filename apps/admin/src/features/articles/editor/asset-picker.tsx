import type { AssetDto, AssetPurpose } from '@grey-flowers/contracts';

import { useInfiniteQuery } from '@tanstack/react-query';
import { cn } from 'cnfast';
import { Check, ImageUp, Images } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';

import { apiClient, isApiRequestError } from '@/app/api/index.js';
import {
  assetsPickerOptions,
  markAssetsStale,
} from '@/app/server-state/assets.js';
import { formatBytes } from '@/lib/format.js';
import { Button } from '@/ui/button.js';
import { Alert, EmptyState, Skeleton, Spinner } from '@/ui/feedback.js';
import { AssetImage } from '@/ui/image.js';
import { AppDialog } from '@/ui/overlay.js';

export const AssetPickerDialog = ({
  onClose,
  onDone,
  onSelect,
  open,
  purpose,
  selectionCount,
  selectedAssetIds,
  title,
}: {
  onClose: () => void;
  /** 提供后在底部渲染「完成（已选 N）」按钮，供多选场景关闭对话框。 */
  onDone?: () => void;
  onSelect: (asset: AssetDto) => void;
  open: boolean;
  purpose: AssetPurpose;
  selectionCount?: number;
  selectedAssetIds?: ReadonlySet<number>;
  title: string;
}) => {
  // 每次 open 产生新的 session：session 进入 query key，重开永远是全新列表，
  // 关闭动画期间/快速重开都不会让旧会话的结果或错误闪现。
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSession((current) => current + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickerQuery = useInfiniteQuery({
    ...assetsPickerOptions(purpose, session),
    enabled: open,
  });
  const items = pickerQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const total = pickerQuery.data?.pages[0]?.total ?? 0;

  const error =
    uploadError ??
    (pickerQuery.error
      ? isApiRequestError(pickerQuery.error)
        ? pickerQuery.error.message
        : '资产加载失败。'
      : null);

  const upload = async (file: File) => {
    setUploadError(null);
    setUploading(0);
    try {
      const asset = await apiClient.assets.upload(
        { file, purpose },
        (progress) => setUploading(Math.round(progress * 100)),
      );
      markAssetsStale();
      onSelect(asset);
    } catch (uploadError) {
      setUploadError(
        isApiRequestError(uploadError) ? uploadError.message : '上传失败。',
      );
    }
    setUploading(null);
  };

  return (
    <AppDialog
      footer={
        onDone ? (
          <Button onPress={onDone} tone="solid">
            完成（已选 {selectionCount ?? 0}）
          </Button>
        ) : undefined
      }
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      size="lg"
      title={title}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            icon={<ImageUp aria-hidden />}
            isLoading={uploading !== null}
            onPress={() => fileInputRef.current?.click()}
            tone="solid"
          >
            {uploading === null ? '上传新图片' : `上传中 ${String(uploading)}%`}
          </Button>
          <input
            accept="image/png,image/jpeg,image/gif,image/webp"
            aria-hidden
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
            ref={fileInputRef}
            tabIndex={-1}
            type="file"
          />
        </div>

        {error ? <Alert>{error}</Alert> : null}

        {pickerQuery.isPending && pickerQuery.isFetching ? (
          <ul
            className="
              grid animate-content-in grid-cols-3 gap-3
              sm:grid-cols-4
            "
          >
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index}>
                {/* 与真实条目同构：描边容器 + 方图 + 体积位 */}
                <div
                  aria-hidden
                  className="
                    grid w-full gap-1.5 rounded-control border border-rule
                    bg-well p-1.5
                  "
                >
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <Skeleton className="h-[1.45em] w-2/3 text-2xs" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Images aria-hidden />}
            title="这个用途下还没有资产"
          >
            用上面的按钮传一张，它会立刻被选中并插入。
          </EmptyState>
        ) : (
          <ul
            className="
              grid grid-cols-3 gap-3
              sm:grid-cols-4
            "
          >
            {items.map((asset) => {
              const isSelected = selectedAssetIds?.has(asset.id) ?? false;
              return (
                <li key={asset.id}>
                  <AriaButton
                    aria-pressed={isSelected}
                    className={cn(
                      `
                        relative grid w-full gap-1.5 rounded-control border
                        p-1.5 text-left transition-colors
                      `,
                      `
                        border-rule bg-well
                        hover:border-accent-rule hover:bg-accent-wash
                      `,
                      isSelected && 'border-accent bg-accent-wash',
                    )}
                    onPress={() => onSelect(asset)}
                  >
                    <span
                      className="
                        grid aspect-square place-items-center overflow-hidden
                        rounded-control bg-canvas
                      "
                    >
                      <AssetImage
                        alt=""
                        className="size-full object-cover"
                        src={asset.deliveryUrl}
                      />
                    </span>
                    {isSelected ? (
                      <span
                        aria-hidden
                        className="
                          absolute top-2 right-2 grid size-6 place-items-center
                          rounded-full border border-accent bg-accent
                          text-accent-on shadow-sm
                        "
                      >
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                    <span className="px-0.5 font-mono text-2xs text-ink-dim">
                      {formatBytes(asset.byteSize)}
                    </span>
                  </AriaButton>
                </li>
              );
            })}
          </ul>
        )}

        {items.length > 0 && pickerQuery.hasNextPage ? (
          <Button
            isDisabled={pickerQuery.isFetching}
            onPress={() => void pickerQuery.fetchNextPage()}
          >
            加载更多（{items.length}/{total}）
          </Button>
        ) : null}

        {pickerQuery.isFetching && items.length > 0 ? (
          <Spinner className="justify-self-center" label="加载中" />
        ) : null}
      </div>
    </AppDialog>
  );
};
