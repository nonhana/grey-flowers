import { useSyncExternalStore } from 'react';

const cache = new Map<string, MediaQueryList>();

const listFor = (query: string) => {
  let list = cache.get(query);
  if (!list) {
    list = window.matchMedia(query);
    cache.set(query, list);
  }
  return list;
};

export const useMediaQuery = (query: string, serverValue = false) =>
  useSyncExternalStore(
    (onChange) => {
      const list = listFor(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => listFor(query).matches,
    () => serverValue,
  );

/** 与 Tailwind 的 md 断点保持一致。改这里要同步改布局里的 md: 前缀。 */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
