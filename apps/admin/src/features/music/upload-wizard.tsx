import type { MusicParseData } from '@grey-flowers/contracts';

import { useNavigate } from '@tanstack/react-router';
import { cn } from 'cnfast';
import { FileUp, ImagePlus, Upload } from 'lucide-react';
import { useState } from 'react';
import { Form, ProgressBar } from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient } from '@/app/api/index.js';
import { AssetPickerDialog } from '@/features/articles/editor/asset-picker.js';
import { assetErrorMessage } from '@/features/assets/display.js';
import { apiErrorMessage } from '@/lib/error-message.js';
import { formatDuration } from '@/lib/format.js';
import { AUDIO_ACCEPT } from '@/lib/media-accept.js';
import {
  Alert,
  AssetImage,
  Button,
  FieldLabel,
  MetaLine,
  Panel,
  TextField,
} from '@/ui/index.js';

type Phase = 'idle' | 'uploading' | 'parsing' | 'ready';

interface WizForm {
  album: string;
  artist: string;
  cover: string;
  coverAssetId: number | null;
  seconds: number;
  title: string;
}

const EMPTY_FORM: WizForm = {
  album: '',
  artist: '',
  cover: '',
  coverAssetId: null,
  seconds: 0,
  title: '',
};

export const UploadWizard = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<WizForm>(EMPTY_FORM);
  const [sourceAssetId, setSourceAssetId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const applyParse = (parsed: MusicParseData) => {
    setForm({
      album: parsed.album,
      artist: parsed.artist,
      cover: parsed.cover ?? '',
      coverAssetId: parsed.coverAssetId,
      seconds: parsed.seconds,
      title: parsed.title,
    });
    setSourceAssetId(parsed.sourceAssetId);
  };

  const startWithFile = async (target: File) => {
    if (!target.type.startsWith('audio/')) {
      setError('请选择音频文件。');
      return;
    }
    setFile(target);
    setPhase('uploading');
    setProgress(0);
    setError('');
    setSaveError('');

    try {
      // 1. 音源先作为受管资产上传（进度真实可感知）。
      const asset = await apiClient.assets.upload(
        { file: target, purpose: 'MUSIC_SOURCE' },
        setProgress,
      );
      // 2. 服务端读回对象解析元数据 + 提取内嵌封面。
      setPhase('parsing');
      const parsed = await apiClient.music.parse(asset.id);
      applyParse(parsed);
      setPhase('ready');
    } catch (cause) {
      setError(assetErrorMessage(cause));
      setPhase('idle');
    }
  };

  const canSave =
    phase === 'ready' &&
    form.title.trim().length > 0 &&
    form.cover.trim().length > 0 &&
    sourceAssetId !== null;

  const save = async () => {
    if (!canSave || sourceAssetId === null) return;
    setSaving(true);
    setSaveError('');
    try {
      await apiClient.music.create({
        album: form.album.trim(),
        artist: form.artist.trim(),
        sourceAssetId,
        title: form.title.trim(),
        // 选了受管封面则交资产；否则以外部 URL 为准。
        ...(form.coverAssetId === null
          ? { cover: form.cover.trim() }
            : { coverAssetId: form.coverAssetId }),
      });
      toast.success('已加入音乐库。');
      await navigate({ to: '/music' });
    } catch (cause) {
      setSaveError(apiErrorMessage(cause));
      setSaving(false);
    }
  };

  const isBusy = phase === 'uploading' || phase === 'parsing';

  return (
    <div className="grid gap-5">
      <Panel className="p-5">
        <div className="grid gap-4">
          <label
            className={cn(
              'flex min-h-12 cursor-pointer items-center gap-3 rounded-control',
              `
                border border-dashed border-edge bg-well px-3 text-base
                text-ink-dim
              `,
              `
                transition-colors
                hover:border-edge-hover
              `,
              `
                focus-within:outline-2 focus-within:outline-offset-2
                focus-within:outline-focus
              `,
              isBusy && 'pointer-events-none opacity-60',
            )}
            htmlFor="music-file-input"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) void startWithFile(dropped);
            }}
          >
            <FileUp
              aria-hidden="true"
              className="size-4 shrink-0 text-accent-text"
            />
            <span className="truncate">
              {phase === 'uploading' || phase === 'parsing'
                ? file?.name
                : '拖入音频文件，或点击选择'}
            </span>
            <span className="ml-auto shrink-0 font-mono text-2xs">
              {phase === 'parsing'
                ? '正在解析元数据…'
                : file
                  ? `已选择 · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                  : 'MP3 / FLAC / WAV / OGG / AAC'}
            </span>
            <input
              accept={AUDIO_ACCEPT}
              className="sr-only"
              id="music-file-input"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) void startWithFile(selected);
              }}
              type="file"
            />
          </label>

          {phase === 'uploading' ? (
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
              <FieldLabel>时长（服务端解析，只读）</FieldLabel>
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
                icon={<ImagePlus aria-hidden="true" />}
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
                icon={<Upload aria-hidden="true" />}
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
