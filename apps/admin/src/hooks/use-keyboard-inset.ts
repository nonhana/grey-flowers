import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  const viewport = window.visualViewport;
  if (!viewport) return () => undefined;

  viewport.addEventListener('resize', onChange);
  viewport.addEventListener('scroll', onChange);
  return () => {
    viewport.removeEventListener('resize', onChange);
    viewport.removeEventListener('scroll', onChange);
  };
};

const getSnapshot = () => {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const hidden = window.innerHeight - viewport.height - viewport.offsetTop;
  return hidden > 24 ? Math.round(hidden) : 0;
};

/** 软键盘遮住的高度：键盘收起 visual viewport 而 layout viewport 不变，
  吸底工具条会被压住，据此上移；桌面端恒 0。visualViewport 是浏览器
  可变外部 store，用 useSyncExternalStore 订阅。 */
export const useKeyboardInset = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => 0);
