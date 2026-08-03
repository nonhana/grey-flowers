import { useEffect, useState } from 'react';

/**
 * 软键盘遮住的高度。
 *
 * 移动端浏览器打开键盘时收缩的是 visual viewport，layout viewport 不变，
 * 所以吸底的工具条会被键盘压在下面。拿到这个值把它顶上来，
 * 写作时工具条才始终在拇指够得到的地方。桌面端恒为 0。
 */
export const useKeyboardInset = () => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(hidden > 24 ? Math.round(hidden) : 0);
    };

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return inset;
};
