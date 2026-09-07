import { QueryClient } from '@tanstack/react-query';

import { isApiNetworkError } from '@/app/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 网络问题重试 2 次
      retry: (failureCount, error) =>
        isApiNetworkError(error) && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});
