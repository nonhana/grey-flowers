import { useEffect, useRef } from 'react';

export const usePasteFiles = ({
  enabled,
  onFiles,
}: {
  enabled: boolean;
  onFiles: (files: File[]) => void;
}) => {
  const handleRef = useRef(onFiles);
  useEffect(() => {
    handleRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      handleRef.current(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [enabled]);
};
