import type { MusicTrack } from '@grey-flowers/contracts';

import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { ArrowLeft, ExternalLink, Loader2, Music2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { IMAGE_ACCEPT_MAP } from '@/lib/media-accept.js';
import {
  Alert,
  AppDialog,
  AssetImage,
  Button,
  buttonClass,
  FieldLabel,
  IconButton,
} from '@/ui/index.js';

import { ActivityEditor } from './activity-editor.js';
import {
  ImageStrip,
  MAX_IMAGES,
  toImageItem,
  type ComposerImage,
} from './image-strip.js';
import { MusicPickerDialog } from './music-picker.js';

const MAX_MUSIC = 12;
const CONTENT_LIMIT = 8192;
const CONTENT_WARN_AT = 7900;

export const ActivityComposePage = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { activityId?: string };
  const editingId = params.activityId
    ? Number.parseInt(params.activityId, 10) || null
    : null;

  const [content, setContent] = useState('');
  const [images, setImages] = useState<ComposerImage[]>([]);
  const [music, setMusic] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(editingId !== null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showLightbox, setShowLightBox] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 编辑：路由参数一变就回加载态（React 官方「按输入调整 state」模式）。
  const [prevEditingId, setPrevEditingId] = useState(editingId);
  if (prevEditingId !== editingId) {
    setPrevEditingId(editingId);
    setLoading(editingId !== null);
    setLoadError('');
  }

  // 编辑模式：拉取并预填。
  useEffect(() => {
    if (editingId === null) return;
    let cancelled = false;
    apiClient.activities
      .detail(editingId)
      .then((activity) => {
        if (cancelled) return;
        setContent(activity.content);
        setImages(
          activity.images.map((image) => ({
            assetId: image.assetId,
            error: '',
            file: null,
            id: crypto.randomUUID(),
            progress: 1,
            status: 'committed',
            url: image.url,
          })),
        );
        setMusic(activity.music);
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(apiErrorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingId]);

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
    const batch = files.slice(0, slots).map((file) => ({
      assetId: null,
      error: '',
      file,
      id: crypto.randomUUID(),
      progress: 0,
      status: 'uploading' as const,
      url: '',
    }));
    setImages((current) => [...current, ...batch]);
    for (const item of batch) uploadOne(item.id, item.file);
  };

  const toggleAsset = (asset: { id: number; deliveryUrl: string }) => {
    setImages((current) => {
      if (current.some((image) => image.assetId === asset.id)) {
        return current.filter((image) => image.assetId !== asset.id);
      }
      if (current.length >= MAX_IMAGES) return current;
      return [
        ...current,
        {
          assetId: asset.id,
          error: '',
          file: null,
          id: crypto.randomUUID(),
          progress: 1,
          status: 'committed',
          url: asset.deliveryUrl,
        },
      ];
    });
  };

  const removeImage = (id: string) => {
    setImages((current) => current.filter((image) => image.id !== id));
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

  const atImageLimit = images.length >= MAX_IMAGES;

  const hasUploading = images.some((image) => image.status === 'uploading');
  const committedImages = images.filter(
    (image) => image.status === 'committed',
  );
  const canSubmit =
    !loading &&
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
      if (editingId !== null) {
        await apiClient.activities.update(editingId, input);
        toast.success('动态已更新。');
      } else {
        await apiClient.activities.create(input);
        toast.success('动态已发布。');
      }
      await navigate({ to: '/activities' });
    } catch (cause) {
      setError(apiErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const contentNearLimit = content.length >= CONTENT_WARN_AT;

  // 整页都是投放区：图片拖到任意位置都会进图库，不再被浏览器接管。
  // dragActive 用根元素的 enter/leave 自己追踪 —— react-dropzone 只在
  // dragleave 时复位 isDragActive，drop 不复位，直接用它做遮罩会卡住。
  const {
    getInputProps,
    getRootProps,
    open: openFilePicker,
  } = useDropzone({
    accept: IMAGE_ACCEPT_MAP,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: (event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setDragActive(false);
      }
    },
    onDrop: (acceptedFiles) => {
      addUploads(acceptedFiles);
      setDragActive(false);
    },
  });

  const showDropOverlay = dragActive && dragIndex === null;
  const selectedAssetIds = assetOpen ? new Set<number>() : undefined;
  if (selectedAssetIds) {
    for (const image of images) {
      if (image.assetId !== null) selectedAssetIds.add(image.assetId);
    }
  }

  const resources = (
    <>
      <ImageStrip
        atLimit={atImageLimit}
        dragIndex={dragIndex}
        images={images}
        onDragIndexChange={setDragIndex}
        onOpenAssets={() => setAssetOpen(true)}
        onOpenFilePicker={() => openFilePicker()}
        onPreview={(index) => {
          setLightbox(index);
          setShowLightBox(true);
        }}
        onRemove={removeImage}
        onReorder={reorderImage}
        onRetry={(id) => {
          const image = images.find((item) => item.id === id);
          if (!image?.file) return;
          patchImage(id, {
            error: '',
            progress: 0,
            status: 'uploading',
          });
          uploadOne(id, image.file);
        }}
      />

      <section
        className="
          grid gap-2 border-t border-rule p-4
          md:px-5
        "
      >
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>
            音乐（{music.length} / {MAX_MUSIC}）
          </FieldLabel>
          <Button
            icon={<Music2 aria-hidden />}
            isDisabled={music.length >= MAX_MUSIC}
            onPress={() => setMusicPickerOpen(true)}
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
              md:grid-cols-3 md:gap-3 md:divide-y-0 md:rounded-none md:border-0
              md:bg-transparent
            "
          >
            {music.map((track) => (
              <li
                className="
                  flex items-center gap-3 px-3 py-2
                  md:rounded-panel md:border md:border-rule md:bg-case-raised
                  md:p-3
                "
                key={track.id}
              >
                <span
                  className="
                    grid size-9 shrink-0 place-items-center overflow-hidden
                    rounded-control bg-well
                    md:size-12
                  "
                >
                  {track.cover ? (
                    <AssetImage
                      alt=""
                      className="size-full object-cover"
                      src={track.cover}
                    />
                  ) : (
                    <Music2 aria-hidden className="size-4 text-ink-dim" />
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
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <div
          className="
            px-4
            md:px-5
          "
        >
          <Alert>{error}</Alert>
        </div>
      ) : null}
    </>
  );

  return (
    <div {...getRootProps()} className="flex h-full min-h-0 flex-col bg-paper">
      <input {...getInputProps()} />
      <header
        className="
          relative z-10 flex min-h-12 shrink-0 items-center justify-between
          gap-3 bg-case px-2 pt-[env(safe-area-inset-top)] shadow-case-down
          md:border-b md:border-rule md:px-3 md:shadow-none
        "
      >
        <div className="flex min-w-0 items-center gap-1">
          <Link
            aria-label="返回动态列表"
            className="
              grid size-9 shrink-0 place-items-center rounded-control
              text-ink-dim transition-colors
              hover:bg-accent-wash hover:text-accent-text
            "
            to="/activities"
          >
            <ArrowLeft aria-hidden className="size-4.5" />
          </Link>
          <span className="truncate text-base font-bold text-ink-strong">
            {editingId !== null ? '编辑动态' : '发布动态'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              'font-mono text-2xs',
              contentNearLimit ? 'text-danger-text' : 'text-ink-dim',
            )}
          >
            {content.length} / {CONTENT_LIMIT}
          </span>
          <Button
            isDisabled={!canSubmit}
            isLoading={submitting}
            onPress={() => void submit()}
            size="md"
            tone="solid"
          >
            {editingId !== null ? '保存' : '发布'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="grid h-full flex-1 place-items-center text-ink-dim">
            <Loader2 aria-hidden className="size-5 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="grid h-full flex-1 place-items-center p-6">
            <div className="grid max-w-sm justify-items-center gap-4 text-center">
              <p className="text-md text-ink">{loadError}</p>
              <Link
                className={buttonClass()}
                onClick={() => void navigate({ to: '/activities' })}
                to="/activities"
              >
                <ArrowLeft aria-hidden className="size-4" />
                返回动态列表
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ActivityEditor
              onChange={setContent}
              onSubmit={() => void submit()}
              value={content}
            />
            <aside
              aria-label="动态资源"
              className="
                max-h-[46dvh] shrink-0 overflow-y-auto bg-case shadow-case-up
              "
            >
              {resources}
            </aside>
          </>
        )}
      </div>

      <AnimatePresence>
        {showDropOverlay ? (
          <motion.div
            className="
              pointer-events-none fixed inset-0 z-40 grid place-items-center
              bg-scrim/40
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span
              className="
                rounded-panel bg-case-raised px-6 py-3 font-mono text-base
                text-ink-strong shadow-float
              "
            >
              松开以添加图片
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MusicPickerDialog
        isOpen={musicPickerOpen}
        onConfirm={(tracks) => setMusic(tracks.slice(0, MAX_MUSIC))}
        onOpenChange={setMusicPickerOpen}
        selected={music}
      />

      <AssetPickerDialog
        onClose={() => setAssetOpen(false)}
        onDone={() => setAssetOpen(false)}
        onSelect={toggleAsset}
        open={assetOpen}
        purpose="ACTIVITY_IMAGE"
        selectionCount={images.length}
        selectedAssetIds={selectedAssetIds}
        title="选择动态图片"
      />

      <AppDialog
        isOpen={showLightbox}
        onOpenChange={(open) => {
          if (!open) setShowLightBox(false);
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
                icon={<ExternalLink aria-hidden />}
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
    </div>
  );
};
