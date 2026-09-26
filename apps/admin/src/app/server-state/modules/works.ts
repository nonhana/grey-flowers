import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { worksRoot } from '../roots';

export const worksKeys = {
  list: () => [...worksRoot, 'list'] as const,
};

export const worksListOptions = () =>
  queryOptions({
    queryKey: worksKeys.list(),
    queryFn: ({ signal }) => apiClient.works.list(signal),
  });

/** 作品增删改/排序后的规定失效：只失效自身 root（overview 不受影响）。 */
export const invalidateWorksAfterMutation = async () => {
  await queryClient.invalidateQueries({ queryKey: worksRoot });
};
