import type {
  UserAdminDetailData,
  UserAdminDetailQuery,
  UserAdminListData,
  UserAdminSummary,
  UserDeleteResult,
  UserListQuery,
  UserUpdateInput,
} from '@grey-flowers/contracts';

import {
  userAdminDetailResponseSchema,
  userAdminListResponseSchema,
  userAdminResponseSchema,
  userDeleteResponseSchema,
} from '@grey-flowers/contracts';

import type { Http, HttpReadOptions } from './http';

const listSearchParams = (query: UserListQuery) => {
  const params = new URLSearchParams();
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  if (query.search !== undefined) params.set('search', query.search);
  if (query.role !== undefined) params.set('role', query.role);
  return params;
};

const detailSearchParams = (query: UserAdminDetailQuery) => {
  const params = new URLSearchParams();
  params.set('commentPage', String(query.commentPage));
  params.set('commentPageSize', String(query.commentPageSize));
  return params;
};

export interface UsersApi {
  list(
    query: UserListQuery,
    options?: HttpReadOptions,
  ): Promise<UserAdminListData>;
  detail(
    id: number,
    query?: UserAdminDetailQuery,
    options?: HttpReadOptions,
  ): Promise<UserAdminDetailData>;
  update(id: number, input: UserUpdateInput): Promise<UserAdminSummary>;
  remove(id: number): Promise<UserDeleteResult>;
}

export const createUsersApi = (http: Http): UsersApi => {
  return {
    list: (
      query: UserListQuery,
      options?: HttpReadOptions,
    ): Promise<UserAdminListData> =>
      http.get('/users', {
        authenticated: true,
        schema: userAdminListResponseSchema,
        searchParams: listSearchParams(query),
        signal: options?.signal,
      }),
    detail: (
      id: number,
      query?: UserAdminDetailQuery,
      options?: HttpReadOptions,
    ): Promise<UserAdminDetailData> =>
      http.get(`/users/${id}`, {
        authenticated: true,
        schema: userAdminDetailResponseSchema,
        searchParams: query ? detailSearchParams(query) : undefined,
        signal: options?.signal,
      }),
    update: (id: number, input: UserUpdateInput): Promise<UserAdminSummary> =>
      http.patch(`/users/${id}`, {
        authenticated: true,
        json: input,
        schema: userAdminResponseSchema,
      }),
    remove: (id: number): Promise<UserDeleteResult> =>
      http.delete(`/users/${id}`, {
        authenticated: true,
        schema: userDeleteResponseSchema,
      }),
  };
};
