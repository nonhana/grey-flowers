import { useEffect, useState } from 'react';

/**
 * 搜索防抖提交：value 停止变化 delayMs 后给出 committed 值。
 * 输入时序的交货节奏集中在这里；timer cleanup 是该 hook 唯一的 Effect。
 * 页面侧拿 committed 值组成 query key；提交时需要重置的页码由页面在
 * 渲染期比较 committed 变化自行调整。
 */
export const useDebouncedCommit = <T>(value: T, delayMs: number) => {
  const [committed, setCommitted] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCommitted(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return committed;
};
