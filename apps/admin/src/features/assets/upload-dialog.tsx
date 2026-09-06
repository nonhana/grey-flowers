import type { AssetPurpose } from '@grey-flowers/contracts';

import { cn } from 'cn';
import { FileUp, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  ProgressBar,
  RadioButton,
  RadioField,
  RadioGroup,
} from 'react-aria-components';
import { toast } from 'sonner';

import { apiClient, isAbortError } from '@/app/api';
import { invalidateAssetsAfterMutation } from '@/app/server-state/assets';
import { usePasteFiles } from '@/hooks/use-paste-files';
import {
  AUDIO_ACCEPT_MAP,
  fileMatchesAccept,
  IMAGE_ACCEPT_MAP,
} from '@/lib/media-accept';
import { uploadSizeError } from '@/lib/upload-limits';
import { Button } from '@/ui/button';
import { Alert } from '@/ui/feedback';
import { FileDrop } from '@/ui/file-drop';
import { FieldLabel } from '@/ui/form';
import { AppDialog } from '@/ui/overlay';

import { assetErrorMessage, purposeLabels, purposeOptions } from './display';

type Phase = 'idle' | 'uploading' | 'error';

/** 单次打开会话内的表单：挂载即全新，关闭重开由外壳的 session key 重建。 */
const UploadForm = ({
  abortRef,
  onUploaded,
  setOpen,
}: {
  abortRef: RefObject<AbortController | null>;
  onUploaded: () => void;
  setOpen: (value: boolean) => void;
}) => {
  const [purpose, setPurpose] = useState<AssetPurpose | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');

  const acceptMap =
    purpose === 'MUSIC_SOURCE' ? AUDIO_ACCEPT_MAP : IMAGE_ACCEPT_MAP;
  const acceptLabel = purpose === 'MUSIC_SOURCE' ? '音频' : '图片';
  usePasteFiles({
    enabled: true,
    onFiles: (files) => {
      // 上传中粘贴闸门：不打断在途上传，也不悄悄换掉正在上传的文件（L-14）。
      if (phase === 'uploading') return;
      setPhase('idle');
      if (purpose === null) {
        setFile(null);
        setError('先选择上传用途，再粘贴文件。');
        return;
      }
      const accepted = files.filter((item) =>
        fileMatchesAccept(acceptMap, item),
      );
      if (accepted.length === 0) {
        setFile(null);
        setError(`剪贴板里没有可上传的${acceptLabel}文件。`);
        return;
      }
      const sizeError = uploadSizeError(accepted[0], purpose);
      if (sizeError !== null) {
        setFile(null);
        setError(sizeError);
        return;
      }
      setFile(accepted[0]);
      setError('');
    },
  });
  const canSubmit = purpose !== null && file !== null && phase !== 'uploading';
  const submit = async () => {
    if (purpose === null || file === null) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('uploading');
    setProgress(0);
    setError('');

    try {
      await apiClient.assets.upload(
        { file, purpose },
        setProgress,
        undefined,
        controller.signal,
      );
      // 上传属于 mutation：失效 assets 全家族与 overview 计数，
      // 默认筛选下的当前列表也会立即重取。
      await invalidateAssetsAfterMutation();
      toast.success(
        purpose === 'MUSIC_SOURCE' ? '音源已上传。' : '图片已上传。',
      );
      onUploaded();
      setOpen(false);
    } catch (cause) {
      if (isAbortError(cause)) {
        // 取消不是错误：无成功反馈、无回调、无导航，只留一条 info 管理预期。
        toast.info('已取消上传');
        setPhase('idle');
        setProgress(0);
      } else {
        setError(assetErrorMessage(cause));
        setPhase('error');
      }
    }
    // 不用 try/finally：React Compiler 尚不支持带 finally 的 try 语句。
    if (abortRef.current === controller) abortRef.current = null;
  };

  return (
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
            <RadioField key={option} value={option}>
              <RadioButton
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
              >
                {purposeLabels[option]}
              </RadioButton>
            </RadioField>
          ))}
        </RadioGroup>
        <p className="text-xs/relaxed text-ink-dim">
          用途决定了允许的文件类型与大小上限，之后不能更改。
        </p>
      </div>

      <div className="grid gap-2">
        <FieldLabel>文件</FieldLabel>
        <FileDrop
          accept={acceptMap}
          busy={phase === 'uploading'}
          onFile={(target) => {
            // 上传中 FileDrop 已 busy 失效，此处只处理非上传中的选入。
            const sizeError = uploadSizeError(
              target,
              purpose ?? 'ARTICLE_COVER',
            );
            if (sizeError !== null) {
              setFile(null);
              setPhase('idle');
              setError(sizeError);
              return;
            }
            setFile(target);
            setPhase('idle');
            setError('');
          }}
          onRejected={() => {
            setFile(null);
            setPhase('idle');
            setError('文件类型不支持。');
          }}
        >
          <FileUp aria-hidden className="size-4 shrink-0 text-accent-text" />
          <span className="truncate">
            {file ? file.name : '选择要上传的文件或直接粘贴'}
          </span>
          <span className="ml-auto shrink-0 font-mono text-2xs">
            {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : acceptLabel}
          </span>
        </FileDrop>
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

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          isDisabled={phase === 'uploading'}
          onPress={() => setOpen(false)}
        >
          取消
        </Button>
        <Button
          icon={<Upload aria-hidden />}
          isDisabled={!canSubmit}
          isLoading={phase === 'uploading'}
          onPress={() => void submit()}
          tone="solid"
        >
          {phase === 'error' ? '重试' : '上传'}
        </Button>
      </div>
    </div>
  );
};

export const UploadDialog = ({
  onUploaded,
  open,
  setOpen,
}: {
  onUploaded: () => void;
  open: boolean;
  setOpen: (value: boolean) => void;
}) => {
  // 在途上传的取消柄：任何关闭路径与外壳卸载都掐断上传（L-3/H1）。
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  // 每次 open 产生新的 session identity：keyed inner form 据此重建，
  // 同一入口快速重开也拿到全新表单（退出动画期间的数据不再复用）。
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open && !wasOpen) {
    setWasOpen(true);
    setSession((current) => current + 1);
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  // 关闭即取消：取消按钮、Esc、遮罩、标题关闭钮全部经由这里。
  const close = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  return (
    <AppDialog
      isOpen={open}
      onOpenChange={(value) => (value ? setOpen(true) : close())}
      size="md"
      title="上传资产"
    >
      <UploadForm
        abortRef={abortRef}
        key={session}
        onUploaded={onUploaded}
        setOpen={close}
      />
    </AppDialog>
  );
};
