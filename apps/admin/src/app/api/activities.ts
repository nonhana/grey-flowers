import type {
  ActivityAdmin,
  ActivityCreateInput,
  ActivityListData,
  ActivityListQuery,
  ActivityUpdateInput,
} from '@grey-flowers/contracts';

import {
  activityAdminResponseSchema,
  activityListResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http';

const listSearchParams = (query: ActivityListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  return params;
};

export const createActivitiesApi = (http: Http) => {
  return {
    list: (
      query: ActivityListQuery,
      options?: HttpReadOptions,
    ): Promise<ActivityListData> =>
      http.get('/activities', {
        authenticated: true,
        schema: activityListResponseSchema,
        searchParams: listSearchParams(query),
        signal: options?.signal,
      }),
    detail: (id: number, options?: HttpReadOptions): Promise<ActivityAdmin> =>
      http.get(`/activities/${id}`, {
        authenticated: true,
        schema: activityAdminResponseSchema,
        signal: options?.signal,
      }),
    create: (input: ActivityCreateInput): Promise<ActivityAdmin> =>
      http.post('/activities', {
        authenticated: true,
        json: input,
        schema: activityAdminResponseSchema,
      }),
    update: (id: number, input: ActivityUpdateInput): Promise<ActivityAdmin> =>
      http.patch(`/activities/${id}`, {
        authenticated: true,
        json: input,
        schema: activityAdminResponseSchema,
      }),
    remove: (id: number): Promise<ActivityAdmin> =>
      http.delete(`/activities/${id}`, {
        authenticated: true,
        schema: activityAdminResponseSchema,
      }),
  };
};

export type ActivitiesApi = ReturnType<typeof createActivitiesApi>;
