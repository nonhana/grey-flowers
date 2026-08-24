import { useEffect, useState } from 'react';

/** 软键盘遮住的高度：键盘收起 visual viewport 而 layout viewport 不变，
  吸底工具条会被压住，据此上移；桌面端恒 0。 */
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
