import type { OverviewTrendQuery } from '@grey-flowers/contracts';

import {
  overviewCalendarResponseSchema,
  overviewResponseSchema,
  overviewTrendResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createOverviewApi = (channel: Channel) => ({
  /** 近 365 天逐日发布量。单独一条：它比 get() 重，且只服务节奏图。 */
  calendar: (signal?: AbortSignal) =>
    channel.get('/overview/calendar', overviewCalendarResponseSchema, {
      signal,
    }),
  get: (signal?: AbortSignal) =>
    channel.get('/overview', overviewResponseSchema, { signal }),
  trends: (query: OverviewTrendQuery, signal?: AbortSignal) =>
    channel.get('/overview/trends', overviewTrendResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
});

export type OverviewApi = ReturnType<typeof createOverviewApi>;
