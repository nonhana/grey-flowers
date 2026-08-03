import type { AssetPurpose } from '@grey-flowers/contracts';

import { cn } from 'cnfast';
import { FileUp, Upload } from 'lucide-react';
import { useState } from 'react';
import {
  ProgressBar,
  RadioButton,
  RadioField,
  RadioGroup,
} from 'react-aria-components';

import { apiClient } from '@/app/api/index.js';
import { Alert, AppDialog, Button, FieldLabel } from '@/ui/index.js';

import { assetErrorMessage, purposeLabels, purposeOptions } from './display.js';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac';

type Phase = 'idle' | 'uploading' | 'error';

export const UploadDialog = ({
  onUploaded,
  open,
  setOpen,
}: {
  onUploaded: () => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) => {
  const [purpose, setPurpose] = useState<AssetPurpose | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  // 对话框关闭后重置表单：在渲染期、受条件保护地调整 state（React 官方推荐模式）
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setPurpose(null);
      setFile(null);
      setProgress(0);
      setPhase('idle');
      setError('');
    }
  }

  const accept = purpose === 'MUSIC_SOURCE' ? AUDIO_ACCEPT : IMAGE_ACCEPT;
  const canSubmit = purpose !== null && file !== null && phase !== 'uploading';

  const submit = async () => {
    if (purpose === null || file === null) return;

    setPhase('uploading');
    setProgress(0);
    setError('');

    try {
      await apiClient.assets.upload({ file, purpose }, setProgress);
      onUploaded();
      setOpen(false);
    } catch (cause) {
      setError(assetErrorMessage(cause));
      setPhase('error');
    }
  };

  return (
    <AppDialog isOpen={open} onOpenChange={setOpen} size="md" title="上传资产">
      <div className="grid gap-5">
        <div className="grid gap-2">
          <FieldLabel>用途</FieldLabel>
          <RadioGroup
            aria-label="上传用途"
            className="grid grid-cols-2 gap-2"
            onChange={(value) => {
              setPurpose(value as AssetPurpose);
              setPhase('idle');
              setError('');
            }}
            value={purpose ?? undefined}
          >
            {purposeOptions.map((option) => (
              <RadioField
                className={cn(
                  `
                    flex min-h-11 cursor-pointer items-center gap-2
                    rounded-control
                  `,
                  `
                    border border-edge bg-well px-3 text-base text-ink
                    outline-none
                  `,
                  `
                    transition-colors
                    hover:border-edge-hover
                  `,
                  `
                    focus-within:outline-2 focus-within:outline-offset-2
                    focus-within:outline-focus
                  `,
                  `
                    data-selected:border-accent-rule
                    data-selected:bg-accent-wash
                  `,
                  'data-selected:text-accent-text',
                )}
                key={option}
                value={option}
              >
                <RadioButton className="sr-only" />
                {purposeLabels[option]}
              </RadioField>
            ))}
          </RadioGroup>
          <p className="text-xs/relaxed text-ink-dim">
            用途决定了允许的文件类型与大小上限，之后不能更改。
          </p>
        </div>

        <div className="grid gap-2">
          <FieldLabel>文件</FieldLabel>
          <label
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-control',
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
            )}
            htmlFor="asset-file-input"
          >
            <FileUp
              aria-hidden="true"
              className="size-4 shrink-0 text-accent-text"
            />
            <span className="truncate">
              {file ? file.name : '选择要上传的文件'}
            </span>
            <span className="ml-auto shrink-0 font-mono text-2xs">
              {file
                ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                : accept.startsWith('audio')
                  ? '音频'
                  : '图片'}
            </span>
            <input
              accept={accept}
              className="sr-only"
              id="asset-file-input"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPhase('idle');
                setError('');
              }}
              type="file"
            />
          </label>
        </div>

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
                  {Math.round(percentage ?? 0)}%
                </span>
              </>
            )}
          </ProgressBar>
        ) : null}

        {phase === 'error' ? <Alert>{error}</Alert> : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            isDisabled={phase === 'uploading'}
            onPress={() => setOpen(false)}
          >
            取消
          </Button>
          <Button
            icon={<Upload aria-hidden="true" />}
            isDisabled={!canSubmit}
            isLoading={phase === 'uploading'}
            onPress={() => void submit()}
            tone="solid"
          >
            {phase === 'error' ? '重试' : '上传'}
          </Button>
        </div>
      </div>
    </AppDialog>
  );
};
