import type { UserListQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from '../client';
import { commentsRoot, usersRoot } from '../roots';
import { overviewKeys } from './overview';

export const usersKeys = {
  list: (query: UserListQuery) => [...usersRoot, 'list', query] as const,
  detail: (id: number, commentPage: number, commentPageSize: number) =>
    [...usersRoot, 'detail', id, { commentPage, commentPageSize }] as const,
};

export const usersListOptions = (query: UserListQuery) =>
  queryOptions({
    queryKey: usersKeys.list(query),
    queryFn: ({ signal }) => apiClient.users.list(query, signal),
  });

export const usersDetailOptions = (
  id: number,
  comments: { commentPage: number; commentPageSize: number },
) =>
  queryOptions({
    queryKey: usersKeys.detail(
      id,
      comments.commentPage,
      comments.commentPageSize,
    ),
    queryFn: ({ signal }) => apiClient.users.detail(id, comments, signal),
  });

/**
 * 用户编辑/删除后的规定失效：user lists/details、comment lists（评论投影内
 * 嵌作者资料）、overview counts/trends（删除级联评论时计数与趋势都变化）。
 */
export const invalidateUsersAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: usersRoot }),
    queryClient.invalidateQueries({ queryKey: commentsRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.trendRoot }),
  ]);
};
