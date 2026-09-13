import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  const vp = window.visualViewport;
  if (!vp) return () => undefined;

  vp.addEventListener('resize', onChange);
  vp.addEventListener('scroll', onChange);
  return () => {
    vp.removeEventListener('resize', onChange);
    vp.removeEventListener('scroll', onChange);
  };
};

const getSnapshot = () => {
  const vp = window.visualViewport;
  if (!vp) return 0;
  const hidden = window.innerHeight - vp.height - vp.offsetTop;
  return hidden > 24 ? Math.round(hidden) : 0;
};

/** 软键盘遮住的高度：键盘收起 visual viewport 而 layout viewport 不变，吸底工具条据此上移；桌面端恒 0。visualViewport 是可变外部 store，用 useSyncExternalStore 订阅 */
export const useKeyboardInset = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => 0);
