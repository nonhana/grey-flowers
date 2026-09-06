import { QueryClient } from '@tanstack/react-query';

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
