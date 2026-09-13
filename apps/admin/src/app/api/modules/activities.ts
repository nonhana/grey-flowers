import type {
  ActivityCreateInput,
  ActivityListQuery,
  ActivityUpdateInput,
} from '@grey-flowers/contracts';

import {
  activityAdminResponseSchema,
  activityListResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createActivitiesApi = (channel: Channel) => ({
  list: (query: ActivityListQuery, signal?: AbortSignal) =>
    channel.get('/activities', activityListResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
  detail: (id: number, signal?: AbortSignal) =>
    channel.get(`/activities/${id}`, activityAdminResponseSchema, { signal }),
  create: (input: ActivityCreateInput) =>
    channel.post('/activities', activityAdminResponseSchema, { json: input }),
  update: (id: number, input: ActivityUpdateInput) =>
    channel.patch(`/activities/${id}`, activityAdminResponseSchema, {
      json: input,
    }),
  remove: (id: number) =>
    channel.delete(`/activities/${id}`, activityAdminResponseSchema),
});

export type ActivitiesApi = ReturnType<typeof createActivitiesApi>;
