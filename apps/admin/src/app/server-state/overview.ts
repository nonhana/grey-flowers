import type { OverviewTrendQuery } from '@grey-flowers/contracts';

import { queryOptions } from '@tanstack/react-query';

import { apiClient } from '@/app/api/index.js';

export const overviewRoot = ['admin', 'overview'] as const;

export const overviewKeys = {
  counts: [...overviewRoot, 'counts'] as const,
  trendRoot: [...overviewRoot, 'trend'] as const,
  trend: (query: OverviewTrendQuery) =>
    [...overviewRoot, 'trend', query] as const,
  calendar: [...overviewRoot, 'calendar'] as const,
};

export const overviewCountsOptions = () =>
  queryOptions({
    queryKey: overviewKeys.counts,
    queryFn: ({ signal }) => apiClient.overview.get({ signal }),
  });

export const overviewTrendOptions = (query: OverviewTrendQuery) =>
  queryOptions({
    queryKey: overviewKeys.trend(query),
    queryFn: ({ signal }) => apiClient.overview.trends(query, { signal }),
  });

export const overviewCalendarOptions = () =>
  queryOptions({
    queryKey: overviewKeys.calendar,
    queryFn: ({ signal }) => apiClient.overview.calendar({ signal }),
  });
