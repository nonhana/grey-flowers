import { cn } from 'cn';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

/** 资产缩略图：加载失败换成明确的「读不到这张图」状态，而不是浏览器破图图标。 */
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

  // 换了地址就重新给一次机会。
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
