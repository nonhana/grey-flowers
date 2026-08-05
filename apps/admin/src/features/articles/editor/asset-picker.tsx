import type { AssetDto, AssetPurpose } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { Check, ImageUp, Images } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';

import { apiClient, isApiRequestError } from '@/app/api/index.js';
import { formatBytes } from '@/lib/format.js';
import {
  Alert,
  AppDialog,
  AssetImage,
  Button,
  EmptyState,
  Skeleton,
  Spinner,
} from '@/ui/index.js';

const ASSET_PAGE_SIZE = 12;

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
  const [items, setItems] = useState<AssetDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 打开对话框时重置列表态（渲染期、受条件保护地调整 state）
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setItems([]);
      setTotal(0);
      setPage(1);
      setLoading(true);
      setError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    apiClient.assets
      .list({
        page: 1,
        pageSize: ASSET_PAGE_SIZE,
        purpose,
        status: 'AVAILABLE',
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setPage(1);
        setTotal(data.total);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          isApiRequestError(loadError) ? loadError.message : '资产加载失败。',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, purpose]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.assets.list({
        page: nextPage,
        pageSize: ASSET_PAGE_SIZE,
        purpose,
        status: 'AVAILABLE',
      });
      setItems((current) => [...current, ...data.items]);
      setPage(nextPage);
      setTotal(data.total);
    } catch (loadError) {
      setError(
        isApiRequestError(loadError) ? loadError.message : '资产加载失败。',
      );
    } finally {
      setLoading(false);
    }
  };

  const upload = async (file: File) => {
    setUploading(0);
    setError(null);
    try {
      const asset = await apiClient.assets.upload(
        { file, purpose },
        (progress) => setUploading(Math.round(progress * 100)),
      );
      onSelect(asset);
    } catch (uploadError) {
      setError(
        isApiRequestError(uploadError) ? uploadError.message : '上传失败。',
      );
    } finally {
      setUploading(null);
    }
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
            icon={<ImageUp aria-hidden="true" />}
            isLoading={uploading !== null}
            onPress={() => fileInputRef.current?.click()}
            tone="solid"
          >
            {uploading === null ? '上传新图片' : `上传中 ${String(uploading)}%`}
          </Button>
          <input
            accept="image/png,image/jpeg,image/gif,image/webp"
            aria-hidden="true"
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

        {loading && items.length === 0 ? (
          <ul
            className="
              grid grid-cols-3 gap-3
              sm:grid-cols-4
            "
          >
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index}>
                <Skeleton className="aspect-square w-full" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Images aria-hidden="true" />}
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
                        aria-hidden="true"
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

        {items.length > 0 && items.length < total ? (
          <Button isDisabled={loading} onPress={() => void loadMore()}>
            加载更多（{items.length}/{total}）
          </Button>
        ) : null}

        {loading && items.length > 0 ? (
          <Spinner className="justify-self-center" label="加载中" />
        ) : null}
      </div>
    </AppDialog>
  );
};
