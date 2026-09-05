import type { ActivityAdmin, MusicTrack } from '@grey-flowers/contracts';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowLeft, ExternalLink, Loader2, Music2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import {
  activityDetailOptions,
  invalidateActivitiesAfterMutation,
} from '@/app/server-state/activities.js';
import { markAssetsStale } from '@/app/server-state/assets.js';
import { AssetPickerDialog } from '@/features/assets/asset-picker.js';
import { usePasteFiles } from '@/hooks/use-paste-files.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { fileMatchesAccept, IMAGE_ACCEPT_MAP } from '@/lib/media-accept.js';
import { uploadSizeError } from '@/lib/upload-limits.js';
import { Button, buttonClass, IconButton } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';
import { FieldLabel } from '@/ui/form.js';
import { AssetImage } from '@/ui/image.js';
import { AppDialog } from '@/ui/overlay.js';

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

const toComposerImage = (activity: ActivityAdmin): ComposerImage[] =>
  activity.images.map((image) => ({
    assetId: image.assetId,
    error: '',
    file: null,
    id: crypto.randomUUID(),
    progress: 1,
    status: 'committed',
    url: image.url,
  }));

/** 单次编辑会话的编写器：以传入 activity 惰性初始化，路由换 id 由外层 key 重建。 */
const ActivityComposer = ({ activity }: { activity: ActivityAdmin | null }) => {
  const navigate = useNavigate();
  const editingId = activity?.id ?? null;
  // 卸载守卫（L-19）：卸载后的迟到上传结果不再触碰任何状态。
  const disposedRef = useRef(false);
  useEffect(() => {
    return () => {
      disposedRef.current = true;
    };
  }, []);
  const [content, setContent] = useState(activity?.content ?? '');
  const [images, setImages] = useState<ComposerImage[]>(
    activity ? toComposerImage(activity) : [],
  );
  const [music, setMusic] = useState<MusicTrack[]>(activity?.music ?? []);
  const [error, setError] = useState('');
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const submitMutation = useMutation({
    mutationFn: (input: {
      content: string;
      images: ReturnType<typeof toImageItem>[];
      musicIds: number[];
    }) =>
      editingId !== null
        ? apiClient.activities.update(editingId, input)
        : apiClient.activities.create(input),
    onSuccess: async (_data) => {
      // 动态创建/编辑已落库：相关图片资产记录已存在，音乐/评论投影随 activities 失效。
      markAssetsStale();
      await invalidateActivitiesAfterMutation();
      toast.success(editingId !== null ? '动态已更新。' : '动态已发布。');
      await navigate({ to: '/activities' });
    },
    onError: (cause) => {
      setError(apiErrorMessage(cause));
    },
  });

  const patchImage = (id: string, patch: Partial<ComposerImage>) => {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, ...patch } : image,
      ),
    );
  };

  const uploadOne = (id: string, file: File) => {
    void apiClient.assets
      .upload({ file, purpose: 'ACTIVITY_IMAGE' }, (progress) => {
        if (disposedRef.current) return;
        patchImage(id, { progress });
      })
      .then((asset) => {
        if (disposedRef.current) return;
        setImages((current) => {
          // 插入前校验图片仍在列表：已被用户移除的槽位不复活（L-19）。
          if (!current.some((image) => image.id === id)) return current;
          return current.map((image) =>
            image.id === id
              ? {
                  ...image,
                  assetId: asset.id,
                  progress: 1,
                  status: 'committed',
                  url: asset.deliveryUrl,
                }
              : image,
          );
        });
      })
      .catch(() => {
        if (disposedRef.current) return;
        patchImage(id, { error: '上传失败', status: 'error' });
      });
  };

  const addUploads = (files: File[]) => {
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) return;
    // 选入即校验（M15）：0 字节/超限图片直接拒收，不等必败请求；
    // dropzone 拖入与剪贴板粘贴两个入口都汇到这里。
    const sized = files.filter(
      (file) => uploadSizeError(file, 'ACTIVITY_IMAGE') === null,
    );
    if (sized.length < files.length) {
      setError('部分图片为空文件或超出 20 MB 上限，已拒收。');
    }
    const batch = sized.slice(0, slots).map((file) => ({
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
    !hasUploading &&
    (content.trim().length > 0 ||
      committedImages.length > 0 ||
      music.length > 0) &&
    content.length <= CONTENT_LIMIT;

  const submit = () => {
    if (!canSubmit || submitMutation.isPending) return;
    setError('');
    submitMutation.mutate({
      content,
      images: committedImages.map(toImageItem),
      musicIds: music.map((track) => track.id),
    });
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

  // 剪贴板只允许粘贴图片
  usePasteFiles({
    enabled: true,
    onFiles: (files) => {
      const imageFiles = files.filter((file) =>
        fileMatchesAccept(IMAGE_ACCEPT_MAP, file),
      );
      if (imageFiles.length > 0) addUploads(imageFiles);
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
            isLoading={submitMutation.isPending}
            onPress={() => void submit()}
            size="md"
            tone="solid"
          >
            {editingId !== null ? '保存' : '发布'}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
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

/**
 * 外层只负责 route id 与 detail 数据分派：
 * 编辑态先展示加载/错误，就绪后以 key={activityId} 挂载编写器，
 * 表单初值全部来自 query data —— 不同编辑路由之间没有草稿串扰。
 */
export const ActivityComposePage = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { activityId?: string };
  // 路由 id 严格解析（M14）三分支：无 id（/activities/new）=新建；有 id
  // 但非 /^\d+$/ 或 ≤0（如 /activities/0/edit）=内联无效态（复用 loadError
  // 的视觉结构），不再静默变新建；合法 id=编辑。
  const rawId = params.activityId ?? null;
  const editingId =
    rawId !== null && /^\d+$/.test(rawId) && Number(rawId) > 0
      ? Number(rawId)
      : null;
  const invalid = rawId !== null && editingId === null;

  const detailQuery = useQuery({
    // enabled 关闭时 id 不参与请求；key 需要 number，用 0 占位且永不激活。
    ...activityDetailOptions(editingId ?? 0),
    enabled: editingId !== null,
  });

  if (invalid) {
    return (
      <div className="grid h-full flex-1 place-items-center p-6">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <p className="text-md text-ink">链接无效：找不到这条动态。</p>
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
    );
  }
  if (editingId === null) {
    return <ActivityComposer activity={null} />;
  }

  if (detailQuery.isPending && detailQuery.isFetching) {
    return (
      <div className="grid h-full flex-1 place-items-center text-ink-dim">
        <Loader2 aria-hidden className="size-5 animate-spin" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <div className="grid h-full flex-1 place-items-center p-6">
        <div className="grid max-w-sm justify-items-center gap-4 text-center">
          <p className="text-md text-ink">
            {apiErrorMessage(detailQuery.error) || '无法加载这条动态。'}
          </p>
          <div className="flex items-center gap-2">
            <Button onPress={() => void detailQuery.refetch()}>重试</Button>
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
      </div>
    );
  }

  return <ActivityComposer activity={detailQuery.data} key={editingId} />;
};
