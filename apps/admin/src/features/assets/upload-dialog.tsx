import type { AssetPurpose } from '@grey-flowers/contracts';

import { FileUp, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  Heading,
  Modal,
  ModalOverlay,
  ProgressBar,
  RadioButton,
  RadioField,
  RadioGroup,
  Text,
} from 'react-aria-components';

import { apiClient } from '../../app/api/index.js';
import { assetErrorMessage, purposeLabels, purposeOptions } from './display.js';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/aac';

type Phase = 'idle' | 'uploading' | 'error';

export function UploadDialog({
  onUploaded,
  open,
  setOpen,
}: {
  onUploaded: () => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
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

  const canSubmit = purpose !== null && file !== null && phase !== 'uploading';

  async function submit() {
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
  }

  const accept = purpose === 'MUSIC_SOURCE' ? AUDIO_ACCEPT : IMAGE_ACCEPT;

  return (
    <ModalOverlay
      className="
        fixed inset-0 z-50 grid place-items-end bg-black/30 backdrop-blur-[2px]
        sm:place-items-center sm:p-4
      "
      isDismissable
      isOpen={open}
      onOpenChange={setOpen}
    >
      <Modal
        className="
          max-h-[92vh] w-full overflow-y-auto rounded-panel border border-edge
          bg-surface p-[clamp(20px,5vw,32px)] shadow-panel
          sm:max-w-115
        "
        isDismissable
      >
        <Dialog className="grid gap-5.5 outline-none">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="m-0 font-mono text-[0.7rem] text-ink-faint">
                UPLOAD ASSET
              </p>
              <Heading className="m-0 text-[1.4rem] leading-[1.2] text-ink-strong">
                上传资产
              </Heading>
            </div>
            <Button
              aria-label="关闭"
              className="
                grid size-8.5 place-items-center rounded-control border
                border-edge bg-transparent text-ink-soft outline-none
                hover:border-input-hover-edge hover:text-ink
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                [&_svg]:size-4
              "
              onPress={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="grid gap-2">
            <Text className="font-mono text-[0.78rem] text-ink-soft">
              用途（必选）
            </Text>
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
                  className="
                    flex min-h-11 cursor-pointer items-center gap-2
                    rounded-control border border-input-edge bg-input px-3
                    text-[0.84rem] text-ink outline-none
                    focus-within:outline-[3px] focus-within:outline-offset-2
                    focus-within:outline-focus-outline
                    hover:border-input-hover-edge
                    data-selected:border-focus data-selected:bg-vapor
                    data-selected:text-brand-deep
                  "
                  key={option}
                  value={option}
                >
                  <RadioButton className="sr-only" />
                  {purposeLabels[option]}
                </RadioField>
              ))}
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Text className="font-mono text-[0.78rem] text-ink-soft">文件</Text>
            <label
              className="
                flex min-h-11 cursor-pointer items-center gap-3 rounded-control
                border border-dashed border-input-edge bg-input px-3
                text-[0.86rem] text-ink-muted outline-none
                focus-within:border-focus focus-within:ring-[3px]
                focus-within:ring-focus-ring
                hover:border-input-hover-edge
              "
              htmlFor="asset-file-input"
            >
              <FileUp
                aria-hidden="true"
                className="size-4 shrink-0 text-brand"
              />
              <span className="truncate">
                {file ? file.name : '选择要上传的文件'}
              </span>
              <span
                className="
                  ml-auto shrink-0 font-mono text-[0.7rem] text-ink-faint
                "
              >
                {file
                  ? file.size < 1024
                    ? `${file.size} B`
                    : `${(file.size / 1024 / 1024).toFixed(1)} MB`
                  : accept.startsWith('audio')
                    ? '音频文件'
                    : '图片文件'}
              </span>
              <input
                accept={accept}
                className="sr-only"
                id="asset-file-input"
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  setFile(next);
                  setPhase('idle');
                  setError('');
                }}
                type="file"
              />
            </label>
          </div>

          {phase === 'uploading' ? (
            <div className="grid gap-2">
              <ProgressBar
                aria-label="上传进度"
                className="grid gap-1.5"
                value={progress * 100}
              >
                {({ percentage }) => {
                  const current = percentage ?? 0;
                  return (
                    <div className="grid gap-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-edge">
                        <div
                          className="
                            h-full rounded-full bg-primary transition-[width]
                            duration-150
                          "
                          style={{ width: `${current}%` }}
                        />
                      </div>
                      <Text className="font-mono text-[0.72rem] text-ink-faint">
                        {Math.round(current)}%
                      </Text>
                    </div>
                  );
                }}
              </ProgressBar>
            </div>
          ) : null}

          {phase === 'error' ? (
            <p
              className="
                border-l-[3px] border-l-danger-edge bg-danger-soft px-2.5
                py-2.25 text-[0.88rem] leading-normal text-danger-ink
              "
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              className="
                min-h-10.5 rounded-control border border-edge bg-surface px-3.5
                font-mono text-[0.82rem] text-ink outline-none
                hover:border-input-hover-edge
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
              "
              isDisabled={phase === 'uploading'}
              onPress={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              className="
                flex min-h-10.5 items-center justify-center gap-2
                rounded-control border border-transparent bg-primary px-3.5
                font-mono text-[0.82rem] text-on-primary outline-none
                hover:bg-primary-deep
                focus-visible:outline-[3px] focus-visible:outline-offset-2
                focus-visible:outline-focus-outline
                [&_svg]:size-4
              "
              isDisabled={!canSubmit}
              onPress={() => void submit()}
            >
              <Upload aria-hidden="true" />
              {phase === 'error'
                ? '重试'
                : phase === 'uploading'
                  ? '上传中'
                  : '上传'}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
