import type { ActivityListQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index';

import { queryClient } from './client';
import { overviewKeys } from './overview';
import { activitiesRoot } from './roots';

export const activityKeys = {
  list: (query: ActivityListQuery) =>
    [...activitiesRoot, 'list', query] as const,
  detail: (id: number) => [...activitiesRoot, 'detail', id] as const,
};

export const activityListOptions = (query: ActivityListQuery) =>
  queryOptions({
    queryKey: activityKeys.list(query),
    queryFn: ({ signal }) => apiClient.activities.list(query, { signal }),
  });

export const activityDetailOptions = (id: number) =>
  queryOptions({
    queryKey: activityKeys.detail(id),
    queryFn: ({ signal }) => apiClient.activities.detail(id, { signal }),
  });

/**
 * 动态增删改后的规定失效：activities 全家族 + overview 计数/趋势/节奏。
 * 删除可能级联评论 —— comments/users family 在其 server-state 就绪后接入。
 */
export const invalidateActivitiesAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: activitiesRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.counts }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.trendRoot }),
    queryClient.invalidateQueries({ queryKey: overviewKeys.calendar }),
  ]);
};
