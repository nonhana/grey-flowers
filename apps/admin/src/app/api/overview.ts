import type {
  OverviewCalendarData,
  OverviewData,
  OverviewTrendData,
  OverviewTrendQuery,
} from '@grey-flowers/contracts';

import {
  overviewCalendarResponseSchema,
  overviewResponseSchema,
  overviewTrendResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http';

const trendSearchParams = (query: OverviewTrendQuery) => {
  const params = new URLSearchParams();
  params.set('metric', query.metric);
  params.set('days', query.days);
  return params;
};

export interface OverviewApi {
  /** 近 365 天逐日发布量。单独一条：它比 get() 重，且只服务节奏图。 */
  calendar(options?: HttpReadOptions): Promise<OverviewCalendarData>;
  get(options?: HttpReadOptions): Promise<OverviewData>;
  trends(
    query: OverviewTrendQuery,
    options?: HttpReadOptions,
  ): Promise<OverviewTrendData>;
}

export const createOverviewApi = (http: Http): OverviewApi => ({
  calendar: (options) =>
    http.get('/overview/calendar', {
      authenticated: true,
      schema: overviewCalendarResponseSchema,
      signal: options?.signal,
    }),
  get: (options) =>
    http.get('/overview', {
      authenticated: true,
      schema: overviewResponseSchema,
      signal: options?.signal,
    }),
  trends: (query, options) =>
    http.get('/overview/trends', {
      authenticated: true,
      schema: overviewTrendResponseSchema,
      searchParams: trendSearchParams(query),
      signal: options?.signal,
    }),
});
