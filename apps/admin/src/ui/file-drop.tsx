import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { useId } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * 通用文件投放控件：点击或拖入文件都会触发 onFile。
 *
 * - 拖入可接受文件时高亮描边/底色，拖入不可接受文件时切危险色；
 * - 点击由原生 label 激活打开选择器（noClick + htmlFor），避免与
 *   dropzone 根节点 onClick 双开对话框；
 * - busy 时点击与拖放同时失效（pointer-events 兜底 + disabled 语义）。
 *
 * accept 用 lib/media-accept.ts 里的 *_ACCEPT_MAP（MIME 通配 + 扩展名表）。
 */
export const FileDrop = ({
  accept,
  busy = false,
  children,
  className,
  onFile,
  onRejected,
}: {
  accept: Record<string, readonly string[]>;
  busy?: boolean;
  children: ReactNode;
  className?: string;
  onFile: (file: File) => void;
  onRejected?: () => void;
}) => {
  const inputId = useId();
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      accept,
      disabled: busy,
      multiple: false,
      noClick: true,
      onDrop: (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (file) onFile(file);
        else onRejected?.();
      },
    });

  return (
    <label
      className={cn(
        `
          flex min-h-16 cursor-pointer items-center gap-3 rounded-control border
          border-dashed border-edge bg-well px-3 text-base text-ink-dim
        `,
        `
          transition-colors
          hover:border-edge-hover
        `,
        `
          focus-within:outline-2 focus-within:outline-offset-2
          focus-within:outline-focus
        `,
        // 拖拽反馈：可接受高亮 / 拒绝危险色（isDragReject 时 isDragActive 也为真）
        isDragActive && 'border-accent-rule bg-accent-wash text-accent-text',
        isDragReject && 'border-danger-rule bg-danger-wash text-danger-text',
        busy && 'pointer-events-none opacity-60',
        className,
      )}
      {...getRootProps()}
      htmlFor={inputId}
    >
      <input {...getInputProps({ className: 'sr-only', id: inputId })} />
      {children}
    </label>
  );
};
