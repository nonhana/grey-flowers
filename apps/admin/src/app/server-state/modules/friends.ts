import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { friendsRoot } from '../roots';

export const friendsKeys = {
  list: () => [...friendsRoot, 'list'] as const,
};

export const friendsListOptions = () =>
  queryOptions({
    queryKey: friendsKeys.list(),
    queryFn: ({ signal }) => apiClient.friends.list(signal),
  });

/** 友链增删改/排序后的规定失效：只失效自身 root（overview 不受影响）。 */
export const invalidateFriendsAfterMutation = async () => {
  await queryClient.invalidateQueries({ queryKey: friendsRoot });
};
