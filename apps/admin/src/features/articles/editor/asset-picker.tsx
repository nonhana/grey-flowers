import type { AssetDto, AssetPurpose } from '@grey-flowers/contracts';

import { ImageUp, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components';

import { apiClient, isApiRequestError } from '../../../app/api/index.js';
import { formatBytes } from '../../assets/display.js';

const ASSET_PAGE_SIZE = 12;

interface AssetPickerDialogProps {
  articleId?: string;
  onClose: () => void;
  onSelect: (asset: AssetDto) => void;
  open: boolean;
  purpose: AssetPurpose;
  title: string;
}

export function AssetPickerDialog({
  onClose,
  onSelect,
  open,
  purpose,
  title,
}: AssetPickerDialogProps) {
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

  const loadPage = async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.assets.list({
        page: nextPage,
        pageSize: ASSET_PAGE_SIZE,
        purpose,
        status: 'AVAILABLE',
      });
      setItems((current) =>
        nextPage === 1 ? data.items : [...current, ...data.items],
      );
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
        setLoading(false);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          isApiRequestError(loadError) ? loadError.message : '资产加载失败。',
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, purpose]);

  async function handleUpload(file: File) {
    setUploading(0);
    setError(null);
    try {
      const asset = await apiClient.assets.upload(
        { file, purpose },
        (progress) => setUploading(Math.round(progress * 100)),
      );
      setItems((current) => [asset, ...current]);
      setTotal((current) => current + 1);
      onSelect(asset);
    } catch (uploadError) {
      setError(
        isApiRequestError(uploadError) ? uploadError.message : '上传失败。',
      );
    } finally {
      setUploading(null);
    }
  }

  return (
    <ModalOverlay
      className="
        fixed inset-0 z-50 grid place-items-end bg-black/40 p-0
        md:place-items-center md:p-6
      "
      isDismissable
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal
        className="
          max-h-[88vh] w-full max-w-lg overflow-hidden rounded-panel border
          border-edge bg-surface shadow-panel outline-none
          md:max-w-xl
        "
      >
        <Dialog aria-label={title} className="outline-none">
          <div
            className="
              flex items-center justify-between border-b border-edge px-5 py-3.5
            "
          >
            <Heading className="font-mono text-[0.9rem] text-ink-strong">
              {title}
            </Heading>
            <Button
              aria-label="关闭"
              className="
                grid size-9 place-items-center rounded-control text-ink-faint
                hover:bg-accent
              "
              onPress={onClose}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="grid max-h-[calc(88vh-140px)] gap-4 overflow-auto p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="
                  flex min-h-10.5 items-center gap-2 rounded-control border
                  border-transparent bg-primary px-3.5 font-mono text-[0.82rem]
                  text-on-primary transition-colors
                  hover:bg-primary-deep
                "
                onPress={() => fileInputRef.current?.click()}
              >
                <ImageUp aria-hidden="true" />
                {uploading === null ? '上传新图片' : `上传中 ${uploading}%`}
              </Button>
              <input
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                  event.target.value = '';
                }}
              />
              {loading ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : null}
            </div>

            {error ? (
              <p
                className="
                  border-l-[3px] border-l-danger-edge bg-danger-soft px-2.5 py-2
                  text-[0.85rem] text-danger-ink
                "
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {items.length === 0 && !loading ? (
              <p className="text-[0.9rem] text-ink-muted">
                暂无可用资产，先上传一张图片。
              </p>
            ) : (
              <ul
                className="
                  grid grid-cols-3 gap-3
                  sm:grid-cols-4
                "
              >
                {items.map((asset) => (
                  <li key={asset.id}>
                    <Button
                      className="
                        group grid w-full gap-1.5 rounded-control border
                        border-edge bg-canvas p-1.5 text-left transition-colors
                        outline-none
                        hover:border-accent-hover-edge
                        focus-visible:outline-[3px]
                        focus-visible:outline-offset-2
                        focus-visible:outline-focus-outline
                      "
                      onPress={() => onSelect(asset)}
                    >
                      <span
                        className="
                          grid aspect-square place-items-center overflow-hidden
                          rounded-sm bg-input
                        "
                      >
                        <img
                          alt={asset.storageKey}
                          className="object-cover"
                          src={asset.deliveryUrl}
                        />
                      </span>
                      <span
                        className="
                          px-0.5 font-mono text-[0.68rem] text-ink-faint
                        "
                      >
                        {formatBytes(asset.byteSize)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {items.length < total ? (
              <Button
                className="
                  min-h-10.5 rounded-control border border-edge font-mono
                  text-[0.82rem] text-ink-soft
                  hover:bg-accent
                "
                isDisabled={loading}
                onPress={() => void loadPage(page + 1)}
              >
                加载更多（{items.length}/{total}）
              </Button>
            ) : null}
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
