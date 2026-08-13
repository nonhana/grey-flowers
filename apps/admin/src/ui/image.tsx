import { cn } from 'cnfast';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';

/**
 * 资产缩略图。
 *
 * 交付地址可能因为对象过期、网络不通或本地环境没连上对象存储而加载不出来；
 * 那时浏览器默认画的破图图标会让整块布局看起来像坏了。这里换成一个明确的
 * 「读不到这张图」状态 —— 是信息，不是故障。
 */
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
