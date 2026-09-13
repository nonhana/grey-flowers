import type { ReactNode } from 'react';

import { cn } from 'cn';
import { useId } from 'react';
import { useDropzone } from 'react-dropzone';

/** 文件选择器，支持拖放 */
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
          transition-colors
          focus-within:outline-2 focus-within:outline-offset-2
          focus-within:outline-focus
          hover:border-edge-hover
        `,
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
