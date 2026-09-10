import { cn } from 'cn';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

export const AssetImage = ({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) => {
  const [failed, setFailed] = useState(false);

  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setFailed(false);
  }

  if (failed) {
    return (
      <span
        className={cn(
          'grid size-full place-items-center gap-1 bg-well text-ink-dim',
          className,
        )}
        title="读不到这张图"
      >
        <ImageOff aria-hidden className="size-5" />
        <span className="sr-only">{alt || '图片加载失败'}</span>
      </span>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
};
