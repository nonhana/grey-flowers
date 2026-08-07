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

import type { Http } from './http.js';

const trendSearchParams = (query: OverviewTrendQuery) => {
  const params = new URLSearchParams();
  params.set('metric', query.metric);
  params.set('days', query.days);
  return params;
};

export interface OverviewApi {
  /** 近 365 天逐日发布量。单独一条：它比 get() 重，且只服务节奏图。 */
  calendar(): Promise<OverviewCalendarData>;
  get(): Promise<OverviewData>;
  trends(query: OverviewTrendQuery): Promise<OverviewTrendData>;
}

export const createOverviewApi = (http: Http): OverviewApi => ({
  calendar: () =>
    http.get('/overview/calendar', {
      authenticated: true,
      schema: overviewCalendarResponseSchema,
    }),
  get: () =>
    http.get('/overview', {
      authenticated: true,
      schema: overviewResponseSchema,
    }),
  trends: (query) =>
    http.get('/overview/trends', {
      authenticated: true,
      schema: overviewTrendResponseSchema,
      searchParams: trendSearchParams(query),
    }),
});
