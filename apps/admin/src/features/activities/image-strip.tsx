import type { ActivityImageItem } from '@grey-flowers/contracts';

import { cn } from 'cn';
import { ImagePlus, Images, X } from 'lucide-react';
import { ProgressBar } from 'react-aria-components';

import { Button, IconButton } from '@/ui/button';
import { FieldLabel } from '@/ui/form';
import { AssetImage } from '@/ui/image';

export const MAX_IMAGES = 9;

export interface ComposerImage {
  assetId: number | null;
  error: string;
  file: File | null;
  id: string;
  progress: number;
  status: 'committed' | 'error' | 'uploading';
  url: string;
}

export const toImageItem = (image: ComposerImage): ActivityImageItem =>
  image.assetId !== null ? { assetId: image.assetId } : { url: image.url };

export const ImageStrip = ({
  atLimit,
  dragIndex,
  images,
  onDragIndexChange,
  onOpenAssets,
  onOpenFilePicker,
  onPreview,
  onRemove,
  onReorder,
  onRetry,
}: {
  atLimit: boolean;
  dragIndex: number | null;
  images: ComposerImage[];
  onDragIndexChange: (index: number | null) => void;
  onOpenAssets: () => void;
  onOpenFilePicker: () => void;
  onPreview: (index: number) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onRetry: (id: string) => void;
}) => {
  const committedCount = images.filter(
    (image) => image.status === 'committed',
  ).length;
  const activeCount = images.length;

  return (
    <section
      className="
        grid gap-2 p-4
        md:px-5
      "
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>
          图片（{committedCount} / {MAX_IMAGES}，已加 {activeCount}）
        </FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            icon={<Images aria-hidden />}
            isDisabled={atLimit}
            onPress={onOpenAssets}
            size="sm"
          >
            从资产库
          </Button>
          <Button
            icon={<ImagePlus aria-hidden />}
            isDisabled={atLimit}
            onPress={onOpenFilePicker}
            size="sm"
          >
            上传图片
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-xs/relaxed text-ink-dim">
          把图片拖到页面任意位置即可上传，或点上面的按钮。最多 {MAX_IMAGES}{' '}
          张，可排序、可点开预览。
        </p>
      ) : (
        <ul
          className="
            flex snap-x snap-mandatory list-none gap-2 overflow-x-auto
            overscroll-x-contain pb-1
          "
          // 缩略图重排是自己拖的 DOM 节点，别让外层 dropzone 把它当成文件拖放。
          onDragEnter={(event) => event.stopPropagation()}
          onDragLeave={(event) => event.stopPropagation()}
          onDragOver={(event) => event.stopPropagation()}
          onDrop={(event) => event.stopPropagation()}
        >
          {images.map((image, index) => (
            <li
              className={cn(
                `
                  relative size-28 shrink-0 snap-start overflow-hidden
                  rounded-panel
                `,
                'border border-rule bg-well',
                image.status === 'error' && 'border-danger-rule',
              )}
              draggable={image.status === 'committed'}
              key={image.id}
              onDragEnd={() => onDragIndexChange(null)}
              onDragOver={(event) => {
                if (dragIndex !== null) event.preventDefault();
              }}
              onDragStart={() => onDragIndexChange(index)}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) onReorder(dragIndex, index);
              }}
            >
              {image.status === 'committed' ? (
                <>
                  <button
                    aria-label="预览图片"
                    className="size-full"
                    onClick={() => onPreview(index)}
                    type="button"
                  >
                    <AssetImage
                      alt=""
                      className="size-full object-cover"
                      src={image.url}
                    />
                  </button>
                  <span
                    className="
                      absolute top-1 left-1 rounded-control bg-scrim/60 px-1.5
                      py-0.5 font-mono text-2xs text-ink-strong
                    "
                  >
                    {index + 1}
                  </span>
                  <IconButton
                    className="
                      absolute top-1 right-1 border-transparent
                      bg-case-raised/90 text-ink shadow-sm
                      hover:not-disabled:bg-danger-wash
                    "
                    label={`移除第 ${index + 1} 张图片`}
                    onPress={() => onRemove(image.id)}
                    size="sm"
                  >
                    <X aria-hidden />
                  </IconButton>
                </>
              ) : image.status === 'uploading' ? (
                <div
                  className="
                    absolute inset-0 grid place-content-center gap-1.5 p-2
                  "
                >
                  <ProgressBar
                    aria-label="上传进度"
                    className="grid w-full gap-1"
                    value={image.progress * 100}
                  >
                    {({ percentage }) => (
                      <>
                        <div className="h-1 overflow-hidden rounded-full bg-rule">
                          <div
                            className="
                              h-full rounded-full bg-accent transition-[width]
                              duration-150
                            "
                            style={{ width: `${String(percentage ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-center font-mono text-xs text-ink-dim">
                          {Math.round(percentage ?? 0)}%
                        </span>
                      </>
                    )}
                  </ProgressBar>
                </div>
              ) : (
                <div
                  className="
                    absolute inset-0 grid place-content-center gap-1.5
                    bg-danger-wash p-2 text-center
                  "
                >
                  <span className="text-xs text-danger-text">
                    {image.error}
                  </span>
                  <div className="flex justify-center gap-1">
                    <Button onPress={() => onRetry(image.id)} size="sm">
                      重试
                    </Button>
                    <Button
                      onPress={() => onRemove(image.id)}
                      size="sm"
                      tone="warnish"
                    >
                      移除
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
