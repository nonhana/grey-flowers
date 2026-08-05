import type {
  ActivityAdmin,
  ActivityImageItem,
  MusicTrack,
} from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ImagePlus,
  Music2,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ProgressBar } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { IMAGE_ACCEPT } from '@/lib/media-accept.js';
import {
  Alert,
  AppDialog,
  AssetImage,
  Button,
  FieldLabel,
  IconButton,
  controlClass,
} from '@/ui/index.js';

import { MusicPickerDialog } from './music-picker.js';

const MAX_IMAGES = 9;
const MAX_MUSIC = 12;
const CONTENT_LIMIT = 8192;
const CONTENT_WARN_AT = 7900;
const TEXTAREA_MAX_HEIGHT = 320;

interface ComposerImage {
  assetId: number | null;
  error: string;
  file: File | null;
  id: string;
  progress: number;
  status: 'committed' | 'error' | 'uploading';
  url: string;
}

const toImageItem = (image: ComposerImage): ActivityImageItem =>
  image.assetId !== null ? { assetId: image.assetId } : { url: image.url };

export const ActivityComposer = ({
  editing,
  isOpen,
  onOpenChange,
  onSaved,
}: {
  editing: ActivityAdmin | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (activity: ActivityAdmin) => void;
}) => {
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ComposerImage[]>([]);
  const [music, setMusic] = useState<MusicTrack[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardInset = useKeyboardInset();

  // 打开时按模式预填 / 清空；渲染期受条件保护地调整 state（React 官方模式）。
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setContent(editing?.content ?? '');
      setImages(
        editing
          ? editing.images.map((image) => ({
              assetId: image.assetId,
              error: '',
              file: null,
              id: crypto.randomUUID(),
              progress: 1,
              status: 'committed' as const,
              url: image.url,
            }))
          : [],
      );
      setMusic(editing ? editing.music : []);
      setError('');
      setSubmitting(false);
    }
  }

  // textarea 自动增高：内容变化后把高度收敛到内容高度（封顶）。
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [content]);

  const patchImage = (id: string, patch: Partial<ComposerImage>) => {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, ...patch } : image,
      ),
    );
  };

  const uploadOne = (id: string, file: File) => {
    void apiClient.assets
      .upload({ file, purpose: 'ACTIVITY_IMAGE' }, (progress) =>
        patchImage(id, { progress }),
      )
      .then((asset) =>
        patchImage(id, {
          assetId: asset.id,
          progress: 1,
          status: 'committed',
          url: asset.deliveryUrl,
        }),
      )
      .catch(() => patchImage(id, { error: '上传失败', status: 'error' }));
  };

  const addUploads = (files: File[]) => {
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) return;
    const batch: ComposerImage[] = files.slice(0, slots).map((file) => ({
      assetId: null,
      error: '',
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'uploading',
      url: '',
    }));
    setImages((current) => [...current, ...batch]);
    for (const item of batch) uploadOne(item.id, item.file as File);
  };

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
  };

  const moveImage = (index: number, delta: -1 | 1) => {
    setImages((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reorderImage = (from: number, to: number) => {
    setImages((current) => {
      if (from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const hasUploading = images.some((image) => image.status === 'uploading');
  const committedImages = images.filter(
    (image) => image.status === 'committed',
  );
  const canSubmit =
    !hasUploading &&
    (content.trim().length > 0 ||
      committedImages.length > 0 ||
      music.length > 0) &&
    content.length <= CONTENT_LIMIT;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    const input = {
      content,
      images: committedImages.map(toImageItem),
      musicIds: music.map((track) => track.id),
    };
    try {
      const saved = editing
        ? await apiClient.activities.update(editing.id, input)
        : await apiClient.activities.create(input);
      onSaved(saved);
      onOpenChange(false);
      toast.success(editing ? '动态已更新。' : '动态已发布。');
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void submit();
    }
  };

  const contentOverflow = content.length > CONTENT_LIMIT;
  const contentNearLimit = content.length >= CONTENT_WARN_AT;

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="lg"
      title={editing ? '编辑动态' : '发布动态'}
    >
      <div className="grid gap-5">
        <div
          className="grid gap-1.5"
          onDragOver={(event) => {
            if (images.length >= MAX_IMAGES) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const files = Array.from(event.dataTransfer.files).filter((file) =>
              file.type.startsWith('image/'),
            );
            if (files.length > 0) addUploads(files);
          }}
        >
          <span className="flex items-center justify-between gap-3">
            <FieldLabel>正文</FieldLabel>
            <span
              className={cn(
                'font-mono text-2xs',
                contentNearLimit ? 'text-danger-text' : 'text-ink-dim',
              )}
            >
              {content.length} / {CONTENT_LIMIT}
            </span>
          </span>
          <textarea
            className={cn(controlClass, 'resize-none leading-relaxed')}
            maxLength={CONTENT_LIMIT}
            onInput={(event) => {
              setContent(event.currentTarget.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="分享此刻…"
            ref={textareaRef}
            rows={3}
            value={content}
          />
          {contentNearLimit ? (
            <p className="text-xs/relaxed text-danger-text">
              快接近上限了（8 192 字符）。
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>
              图片（
              {committedImages.length +
                images.filter((i) => i.status !== 'committed').length}{' '}
              / {MAX_IMAGES}）
            </FieldLabel>
            <label
              className={cn(
                `
                  inline-flex min-h-9 cursor-pointer items-center gap-1.5
                  rounded-control
                `,
                'px-2.5 font-mono text-xs text-accent-text transition-colors',
                `
                  focus-within:outline-2 focus-within:outline-offset-2
                  hover:bg-accent-wash
                `,
                `
                  focus-within:outline-focus
                  disabled:opacity-55
                `,
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const files = Array.from(event.dataTransfer.files).filter(
                  (file) => file.type.startsWith('image/'),
                );
                if (files.length > 0) addUploads(files);
              }}
            >
              <ImagePlus aria-hidden="true" className="size-4" />
              添加图片
              <input
                accept={IMAGE_ACCEPT}
                className="sr-only"
                disabled={images.length >= MAX_IMAGES}
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  addUploads(files);
                  event.currentTarget.value = '';
                }}
                type="file"
              />
            </label>
          </div>

          {images.length === 0 ? (
            <div
              className="
                grid min-h-20 place-items-center rounded-panel border
                border-dashed border-edge bg-well text-2xs text-ink-dim
              "
            >
              上传第 1 张图片，或拖拽图片到此处（最多 9 张，可排序、可点开预览）
            </div>
          ) : (
            <ul
              className="
                m-0 grid list-none grid-cols-3 gap-2
                sm:grid-cols-5
              "
            >
              {images.map((image, index) => (
                <li
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-panel',
                    'border border-rule bg-well',
                    image.status === 'error' && 'border-danger-rule',
                  )}
                  draggable={image.status === 'committed'}
                  key={image.id}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(event) => {
                    if (dragIndex !== null) event.preventDefault();
                  }}
                  onDragStart={() => setDragIndex(index)}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null) reorderImage(dragIndex, index);
                  }}
                >
                  {image.status === 'committed' ? (
                    <>
                      <button
                        aria-label="预览图片"
                        className="size-full"
                        onClick={() => setLightbox(index)}
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
                          absolute top-1 left-1 rounded-control bg-scrim/60
                          px-1.5 py-0.5 font-mono text-2xs text-ink-strong
                        "
                      >
                        {index + 1}
                      </span>
                      <span
                        className="
                          pointer-events-none absolute inset-x-0 bottom-0 hidden
                          justify-end gap-1 bg-scrim/60 p-1
                          group-focus-within:flex
                          group-hover:flex
                        "
                      >
                        <IconButton
                          className="pointer-events-auto"
                          isDisabled={index === 0}
                          label="前移"
                          onPress={() => moveImage(index, -1)}
                          size="sm"
                        >
                          <ArrowUp aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          className="pointer-events-auto"
                          isDisabled={index === images.length - 1}
                          label="后移"
                          onPress={() => moveImage(index, 1)}
                          size="sm"
                        >
                          <ArrowDown aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          className="pointer-events-auto"
                          label="移除"
                          onPress={() => removeImage(image.id)}
                          size="sm"
                          tone="warnish"
                        >
                          <Trash2 aria-hidden="true" />
                        </IconButton>
                      </span>
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
                            <div
                              className="
                                h-1 overflow-hidden rounded-full bg-rule
                              "
                            >
                              <div
                                className="
                                  h-full rounded-full bg-accent
                                  transition-[width] duration-150
                                "
                                style={{ width: `${String(percentage ?? 0)}%` }}
                              />
                            </div>
                            <span
                              className="
                                text-center font-mono text-xs text-ink-dim
                              "
                            >
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
                        <Button
                          onPress={() => {
                            patchImage(image.id, {
                              error: '',
                              progress: 0,
                              status: 'uploading',
                            });
                            uploadOne(image.id, image.file as File);
                          }}
                          size="sm"
                        >
                          重试
                        </Button>
                        <Button
                          onPress={() => removeImage(image.id)}
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
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>
              音乐（{music.length} / {MAX_MUSIC}）
            </FieldLabel>
            <Button
              icon={<Music2 aria-hidden="true" />}
              isDisabled={music.length >= MAX_MUSIC}
              onPress={() => setPickerOpen(true)}
              size="sm"
            >
              添加音乐
            </Button>
          </div>
          {music.length === 0 ? (
            <p className="text-xs text-ink-dim">
              从音乐库挑选音乐关联到这条动态。
            </p>
          ) : (
            <ul
              className="
                m-0 grid list-none divide-y divide-rule rounded-panel border
                border-rule bg-case-raised
              "
            >
              {music.map((track) => (
                <li
                  className="flex items-center gap-3 px-3 py-2"
                  key={track.id}
                >
                  <span
                    className="
                      grid size-9 shrink-0 place-items-center overflow-hidden
                      rounded-control bg-well
                    "
                  >
                    {track.cover ? (
                      <AssetImage
                        alt=""
                        className="size-full object-cover"
                        src={track.cover}
                      />
                    ) : (
                      <Music2
                        aria-hidden="true"
                        className="size-4 text-ink-dim"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-ink-strong">
                      {track.title}
                    </span>
                    <span className="block truncate font-mono text-2xs text-ink-dim">
                      {track.artist || '未知艺术家'} ·{' '}
                      {formatDuration(track.seconds)}
                    </span>
                  </span>
                  <IconButton
                    label={`移除 ${track.title}`}
                    onPress={() =>
                      setMusic((current) =>
                        current.filter((item) => item.id !== track.id),
                      )
                    }
                    size="sm"
                    tone="warnish"
                  >
                    <Trash2 aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? <Alert>{error}</Alert> : null}

        <div
          className="flex items-center justify-end gap-2"
          style={{
            paddingBottom: `max(0px, ${keyboardInset}px)`,
          }}
        >
          <Button isDisabled={submitting} onPress={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            isDisabled={!canSubmit}
            isLoading={submitting}
            onPress={() => void submit()}
            tone="solid"
          >
            发布
          </Button>
        </div>
      </div>

      <MusicPickerDialog
        isOpen={pickerOpen}
        onConfirm={(tracks) => setMusic(tracks.slice(0, MAX_MUSIC))}
        onOpenChange={setPickerOpen}
        selected={music}
      />

      <AppDialog
        isOpen={lightbox !== null}
        onOpenChange={(open) => {
          if (!open) setLightbox(null);
        }}
        size="lg"
        title={`图片 ${lightbox !== null ? lightbox + 1 : ''}`}
      >
        {lightbox !== null && images[lightbox] ? (
          <div className="grid gap-3">
            <img
              alt="动态图片预览"
              className="max-h-[70dvh] w-full rounded-sheet object-contain"
              src={images[lightbox]?.url}
            />
            <div className="flex justify-end">
              <Button
                icon={<ExternalLink aria-hidden="true" />}
                onPress={() =>
                  window.open(images[lightbox]?.url, '_blank', 'noopener')
                }
                size="sm"
                tone="ghost"
              >
                在新标签打开原图
              </Button>
            </div>
          </div>
        ) : null}
      </AppDialog>
    </AppDialog>
  );
};
