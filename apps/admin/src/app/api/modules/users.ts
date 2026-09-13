import type {
  UserAdminDetailQuery,
  UserListQuery,
  UserUpdateInput,
} from '@grey-flowers/contracts';

import {
  userAdminDetailResponseSchema,
  userAdminListResponseSchema,
  userAdminResponseSchema,
  userDeleteResponseSchema,
} from '@grey-flowers/contracts';

import type { Channel } from '../transport';

import { toSearchParams } from '../shared';

export const createUsersApi = (channel: Channel) => ({
  list: (query: UserListQuery, signal?: AbortSignal) =>
    channel.get('/users', userAdminListResponseSchema, {
      searchParams: toSearchParams(query),
      signal,
    }),
  detail: (id: number, query?: UserAdminDetailQuery, signal?: AbortSignal) =>
    channel.get(`/users/${id}`, userAdminDetailResponseSchema, {
      searchParams: query ? toSearchParams(query) : undefined,
      signal,
    }),
  update: (id: number, input: UserUpdateInput) =>
    channel.patch(`/users/${id}`, userAdminResponseSchema, { json: input }),
  remove: (id: number) =>
    channel.delete(`/users/${id}`, userDeleteResponseSchema),
});

export type UsersApi = ReturnType<typeof createUsersApi>;
