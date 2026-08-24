import type { ReactNode } from 'react';

import { cn } from 'cnfast';
import { useId } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * 通用文件投放控件：点击或拖入触发 onFile；拖入可接受文件高亮、不可接受切危险色；
 * busy 时点击与拖放失效。accept 用 lib/media-accept.ts 的 *_ACCEPT_MAP。
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
