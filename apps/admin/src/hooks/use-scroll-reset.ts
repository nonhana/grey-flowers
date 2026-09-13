import type { DependencyList, RefObject } from 'react';

import { useEffect, useEffectEvent } from 'react';

/** 重置某 DOM 滚动状态 */
export const useScrollReset = <T extends HTMLElement>(
  container: RefObject<T | null>,
  deps: DependencyList,
) => {
  const scrollToTop = useEffectEvent(() =>
    container.current?.scrollTo({ top: 0, behavior: 'instant' }),
  );

  useEffect(() => {
    scrollToTop();
    // 外部系统同步：deps 由调用方按列表路由参数显式给出
  }, deps);
};
