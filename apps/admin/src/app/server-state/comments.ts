import type { CommentListQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from './client';
import { overviewKeys } from './overview';
import { commentsRoot, usersRoot } from './roots';

export const commentsKeys = {
  list: (query: CommentListQuery) => [...commentsRoot, 'list', query] as const,
};

export const commentsListOptions = (query: CommentListQuery) =>
  queryOptions({
    queryKey: commentsKeys.list(query),
    queryFn: ({ signal }) => apiClient.comments.list(query, signal),
  });

/**
 * 评论回复/删除（含批量）后的规定失效：comment lists、user list/detail 的
 * 评论计数、overview counts 与评论趋势。
 */
export const invalidateCommentsAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: commentsRoot }),
    queryClient.invalidateQueries({ queryKey: usersRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.trendRoot }),
  ]);
};
