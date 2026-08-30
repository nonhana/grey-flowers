import { useEffect, useEffectEvent } from 'react';

export const usePasteFiles = ({
  enabled,
  onFiles,
}: {
  enabled: boolean;
  onFiles: (files: File[]) => void;
}) => {
  // useEffectEvent 读最新 onFiles：订阅 Effect 只依赖 enabled，不随回调身份重挂。
  const handlePaste = useEffectEvent((files: File[]) => onFiles(files));

  // 外部系统订阅：document paste 事件（唯一的挂载 Effect）。
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      handlePaste(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enabled]);
};
