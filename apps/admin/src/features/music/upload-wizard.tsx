import type * as MusicMetadata from 'music-metadata';

import { useNavigate } from '@tanstack/react-router';
import { FileUp, ImagePlus, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Form, ProgressBar } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { markAssetsStale } from '@/app/server-state/assets.js';
import { invalidateMusicAfterMutation } from '@/app/server-state/music.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { AUDIO_ACCEPT_MAP } from '@/lib/media-accept.js';
import { Button } from '@/ui/button.js';
import { Alert } from '@/ui/feedback.js';
import { FileDrop } from '@/ui/file-drop.js';
import { FieldLabel, TextField } from '@/ui/form.js';
import { AssetImage } from '@/ui/image.js';
import { MetaLine, Panel } from '@/ui/surface.js';

type Phase = 'idle' | 'parsing' | 'ready';

interface WizForm {
  album: string;
  artist: string;
  cover: string;
  coverAssetId: number | null;
  seconds: number;
  title: string;
}

interface EmbeddedCover {
  blob: Blob;
  objectUrl: string;
}

const EMPTY_FORM: WizForm = {
  album: '',
  artist: '',
  cover: '',
  coverAssetId: null,
  seconds: 0,
  title: '',
};

const fallbackTitle = (name: string) =>
  name.replace(/\.[^/.]+$/, '') || '未命名';

// music-metadata 体积大且多数上传页访问者未必拖文件（交接 P2）：
// 不随上传页静态加载，改为解析前动态 import；拖入/聚焦 dropzone 时预取以抵消等待。
let parserPromise: Promise<typeof MusicMetadata> | null = null;
const prefetchParser = () => (parserPromise ??= import('music-metadata'));

export const UploadWizard = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<WizForm>(EMPTY_FORM);
  const [embeddedCover, setEmbeddedCover] = useState<EmbeddedCover | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // 内嵌封面 objectURL 跟随组件生命周期释放。
  useEffect(() => {
    return () => {
      if (embeddedCover) URL.revokeObjectURL(embeddedCover.objectUrl);
    };
  }, [embeddedCover]);

  /** 解析唯一一次：发生在客户端（拖入即解析），服务端不再解析媒体。 */
  const startWithFile = async (target: File) => {
    const isAudio =
      target.type.startsWith('audio/') ||
      /\.(mp3|flac|wav|ogg|aac)$/i.test(target.name);
    if (!isAudio) {
      setError('请选择音频文件。');
      return;
    }
    setFile(target);
    setPhase('parsing');
    setProgress(0);
    setError('');
    setSaveError('');

    const degrade = (title: string) => {
      setForm({
        album: '',
        artist: '',
        cover: '',
        coverAssetId: null,
        seconds: 0,
        title,
      });
      setEmbeddedCover(null);
      setPhase('ready');
    };

    try {
      const { parseBlob } = await prefetchParser();
      const { common, format } = await parseBlob(target);
      const picture = common.picture?.[0];
      const embedded = picture
        ? (() => {
            const blob = new Blob([picture.data.slice()], {
              type: picture.format,
            });
            return { blob, objectUrl: URL.createObjectURL(blob) };
          })()
        : null;

      setForm({
        album: common.album ?? '',
        artist: common.artist ?? '',
        cover: embedded?.objectUrl ?? '',
        coverAssetId: null,
        seconds:
          typeof format.duration === 'number' && format.duration > 0
            ? Math.round(format.duration)
            : 0,
        title: common.title?.trim() || fallbackTitle(target.name),
      });
      setEmbeddedCover(embedded);
      setPhase('ready');
    } catch {
      // 不可解析：降级为文件名标题，仍可手动补全后保存。
      degrade(fallbackTitle(target.name));
      setError('未能解析文件元数据，已用文件名作为标题，可手动补全。');
    }
  };

  const canSave =
    phase === 'ready' &&
    form.title.trim().length > 0 &&
    form.cover.trim().length > 0;

  const save = async () => {
    if (!canSave || !file) return;
    setSaving(true);
    setSaveError('');
    setProgress(0);

    const uploadCover = async () => {
      if (!embeddedCover) return null;
      const coverFile = new File([embeddedCover.blob], 'cover', {
        type: embeddedCover.blob.type,
      });
      return apiClient.assets.upload({
        file: coverFile,
        purpose: 'MUSIC_COVER',
      });
    };

    try {
      // 音源直传（进度真实可感知）与内嵌封面上传并行。
      const [sourceAsset, coverAsset] = await Promise.all([
        apiClient.assets.upload(
          { file, purpose: 'MUSIC_SOURCE' },
          setProgress,
          { durationMs: form.seconds * 1000 },
        ),
        uploadCover(),
      ]);

      const coverAssetId =
        form.coverAssetId ?? (coverAsset ? coverAsset.id : null);

      await apiClient.music.create({
        album: form.album.trim(),
        artist: form.artist.trim(),
        seconds: form.seconds,
        sourceAssetId: sourceAsset.id,
        title: form.title.trim(),
        // 解析出的内嵌封面或资源库封面走受管资产；否则以外部 URL 为准。
        ...(coverAssetId === null
          ? { cover: form.cover.trim() }
          : { coverAssetId }),
      });

      if (embeddedCover) URL.revokeObjectURL(embeddedCover.objectUrl);
      // 音源/封面资产记录与音乐记录都已落库：标记资产缓存过期并失效音乐家族，
      // 音乐库列表在导航回来时自动拿到新数据。
      markAssetsStale();
      await invalidateMusicAfterMutation();
      toast.success('已加入音乐库。');
      await navigate({ to: '/music' });
    } catch (cause) {
      setSaveError(apiErrorMessage(cause));
      setSaving(false);
    }
  };

  const isParsing = phase === 'parsing';

  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <div className="grid gap-4">
          <div
            // 拖入/聚焦时预取 music-metadata parser，打开文件后的解析等待最小化
            onDragEnter={() => void prefetchParser()}
            onPointerEnter={() => void prefetchParser()}
          >
            <FileDrop
              accept={AUDIO_ACCEPT_MAP}
              busy={isParsing || saving}
              onFile={(target) => void startWithFile(target)}
              onRejected={() => setError('请选择音频文件。')}
            >
              <FileUp
                aria-hidden
                className="size-4 shrink-0 text-accent-text"
              />
              <span className="truncate">
                {isParsing || saving ? file?.name : '拖入音频文件，或点击选择'}
              </span>
              <span className="ml-auto shrink-0 font-mono text-2xs">
                {isParsing
                  ? '正在解析元数据…'
                  : file
                    ? `已选择 · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : 'MP3 / FLAC / WAV / OGG / AAC'}
              </span>
            </FileDrop>
          </div>

          {saving ? (
            <ProgressBar
              aria-label="上传进度"
              className="grid gap-1.5"
              value={progress * 100}
            >
              {({ percentage }) => (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-rule">
                    <div
                      className="
                        h-full rounded-full bg-accent transition-[width]
                        duration-150
                      "
                      style={{ width: `${String(percentage ?? 0)}%` }}
                    />
                  </div>
                  <span className="font-mono text-2xs text-ink-dim">
                    上传音源 {Math.round(percentage ?? 0)}%
                  </span>
                </>
              )}
            </ProgressBar>
          ) : null}

          {error ? <Alert>{error}</Alert> : null}
        </div>
      </Panel>

      {phase === 'ready' ? (
        <Panel className="p-5">
          <Form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <TextField
              isRequired
              label="标题"
              onChange={(value) =>
                setForm((current) => ({ ...current, title: value }))
              }
              placeholder="输入音乐标题"
              value={form.title}
            />
            <TextField
              label="艺术家"
              onChange={(value) =>
                setForm((current) => ({ ...current, artist: value }))
              }
              placeholder="输入艺术家名称"
              value={form.artist}
            />
            <TextField
              label="专辑"
              onChange={(value) =>
                setForm((current) => ({ ...current, album: value }))
              }
              placeholder="输入专辑名称"
              value={form.album}
            />
            <div className="grid gap-2">
              <FieldLabel>时长（已从文件解析）</FieldLabel>
              <p className="font-mono text-base text-ink">
                {formatDuration(form.seconds)}
              </p>
            </div>

            <div className="grid gap-2">
              <FieldLabel>封面</FieldLabel>
              {form.cover ? (
                <div
                  className="
                    overflow-hidden rounded-control border border-rule bg-well
                  "
                >
                  <AssetImage
                    alt="封面预览"
                    className="aspect-video w-full object-cover"
                    src={form.cover}
                  />
                </div>
              ) : (
                <Alert tone="warn">
                  这个文件没有内嵌封面。请上传一张封面后才能保存。
                </Alert>
              )}
              <Button
                icon={<ImagePlus aria-hidden />}
                onPress={() => setPickerOpen(true)}
                size="sm"
              >
                {form.cover ? '更换封面' : '上传封面'}
              </Button>
            </div>

            <MetaLine>
              <span>音源</span>
              <span className="truncate">{file?.name ?? ''}</span>
            </MetaLine>

            {saveError ? <Alert>{saveError}</Alert> : null}

            <div className="flex justify-end">
              <Button
                icon={<Upload aria-hidden />}
                isDisabled={!canSave}
                isLoading={saving}
                tone="solid"
                type="submit"
              >
                {saving ? '正在保存' : '保存到音乐库'}
              </Button>
            </div>
          </Form>
        </Panel>
      ) : null}

      <AssetPickerDialog
        onClose={() => setPickerOpen(false)}
        onSelect={(asset) => {
          setForm((current) => ({
            ...current,
            cover: asset.deliveryUrl,
            coverAssetId: asset.id,
          }));
          setPickerOpen(false);
        }}
        open={pickerOpen}
        purpose="MUSIC_COVER"
        title="选择音乐封面"
      />
    </div>
  );
};
