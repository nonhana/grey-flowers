import { useState } from 'react';

/**
 * 渲染期受保护调整（React 官方「adjusting state during render」范式）：
 * 删除/筛选导致数据变化后，若当前页码越界（本页 items 空但服务端还有
 * 数据），直接在渲染期把页码钳回最后一个非空页 —— 不闪空态、不需要
 * effect。prev-compare 守卫保证同一份数据只调整一次，不会死循环；
 * 钳制目标自身满足「有数据」约束，重复触发时 React 对同值 setState
 * 直接 bail out（L-18）。
 */
export const useClampPage = (
  page: number,
  setPage: (page: number) => void,
  data: { items: readonly unknown[]; total: number } | undefined,
  pageSize: number,
): void => {
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data && data.items.length === 0 && page > 1 && data.total > 0) {
      setPage(Math.max(1, Math.ceil(data.total / pageSize)));
    }
  }
};
