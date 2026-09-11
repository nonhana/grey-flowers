import { QueryClient } from '@tanstack/react-query';

import { isApiNetworkError } from '@/app/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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
