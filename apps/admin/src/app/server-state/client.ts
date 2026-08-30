import { QueryClient } from '@tanstack/react-query';

/**
 * Admin 服务器状态的唯一 QueryClient。
 * 无重试、不聚焦刷新、staleTime 0：失败重试与主动刷新都由页面显式触发，
 * 并按 isFetching 继续显示骨架，保持既有「刷新即加载态」的视觉契约。
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createQueryClient();

/** 认证边界专用：登出/过期/换号时清空全部缓存，防止跨主体数据残留。 */
export const clearAdminQueryCache = () => {
  queryClient.clear();
};
