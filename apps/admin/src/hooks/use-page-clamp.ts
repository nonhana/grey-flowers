import { useEffect, useEffectEvent } from 'react';

export interface PageClampFacts {
  /** 当前页是否无数据：查询未返回时按空处理，钳制与否仍由 total > 0 兜底 */
  emptyPage: boolean;
  page: number;
  pageSize: number;
  total: number;
}

export interface PageClampInput extends PageClampFacts {
  setPage: (page: number | undefined) => void;
}

/** 纯推导：末页删光后的页码钳制判定与总页数 */
export const clampPage = (input: PageClampFacts) => {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));

  return {
    clamping:
      input.emptyPage &&
      input.page > 1 &&
      input.total > 0 &&
      totalPages < input.page,
    totalPages,
  };
};

/** 末页删光后页码越界：渲染期推导骨架，effect 钳回最后一个非空页（replace 导航不新增历史） */
export const usePageClamp = (input: PageClampInput) => {
  const { clamping, totalPages } = clampPage(input);

  const syncClampedPage = useEffectEvent(() =>
    input.setPage(totalPages > 1 ? totalPages : undefined),
  );

  useEffect(() => {
    if (clamping) syncClampedPage();
  }, [clamping]);

  return { clamping, totalPages };
};
